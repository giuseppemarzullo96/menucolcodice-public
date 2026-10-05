import dns from 'dns/promises';
import net from 'net';
import sharp from 'sharp';
import { processBrandImage } from './dishImage';
import { fitLogoSize, parseColor, type ThemePalette } from './restaurantStore';
import {
  usableDeliveryUrl,
  usableProfileUrl,
  usableWhatsApp,
} from '@/utils/socialLinks';
import { refineImportedProfile } from './aiBrand';
import { normalizeOpeningHours } from '@/utils/openingHours';
import { loadIntegrations } from './integrations';

export type ImportedProfile = {
  name?: string;
  description?: string;
  street?: string;
  city?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  openingHours?: string;
  instagram?: string;
  facebook?: string;
  whatsapp?: string;
  glovo?: string;
  deliveroo?: string;
  justeat?: string;
  logoUrl?: string;
  logoWidth?: number;
  logoHeight?: number;
  homeBackgroundUrl?: string;
  coverChoices?: string[];
  primaryColor?: string;
  pageColor?: string;
  palette?: ThemePalette;
  sources: string[];
  notes: string[];
};

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export function extractUrls(text: string): string[] {
  const found = String(text || '').match(/https?:\/\/[^\s<>"'\)\]]+/gi) || [];
  const www = String(text || '').match(/(?:^|\s)(www\.[^\s<>"'\)\]]+)/gi) || [];
  const urls = [
    ...found,
    ...www.map((item) => `https://${item.trim()}`),
  ]
    .map((url) => url.replace(/[.,;:!?]+$/, ''))
    .filter(Boolean);
  return Array.from(new Set(urls)).slice(0, 5);
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function classifyHost(host: string) {
  if (host.includes('instagram.com')) return 'instagram';
  if (host.includes('facebook.com') || host.includes('fb.com') || host.includes('fb.me')) return 'facebook';
  if (host.includes('tripadvisor')) return 'tripadvisor';
  if (host.includes('thefork') || host.includes('lafourchette')) return 'thefork';
  if (host.includes('paginegialle.it')) return 'directory';
  if (host.includes('virgilio.it')) return 'directory';
  if (host.includes('maps.app.goo.gl') || host.includes('goo.gl') || host.includes('google.') || host.startsWith('maps.google')) return 'google';
  if (host.includes('glovoapp.com') || host.includes('glovo')) return 'glovo';
  if (host.includes('deliveroo')) return 'deliveroo';
  if (host.includes('justeat') || host.includes('just-eat')) return 'justeat';
  return 'website';
}

function isPrivateIp(ip: string) {
  if (net.isIP(ip) === 4) {
    const p = ip.split('.').map(Number);
    if (p[0] === 10 || p[0] === 127 || p[0] === 0) return true;
    if (p[0] === 169 && p[1] === 254) return true;
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
    if (p[0] === 192 && p[1] === 168) return true;
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true;
  }
  if (net.isIP(ip) === 6) {
    const x = ip.toLowerCase();
    if (x === '::1' || x.startsWith('fc') || x.startsWith('fd') || x.startsWith('fe80') || x.startsWith('::ffff:127.')) return true;
  }
  return false;
}

async function assertPublicUrl(raw: string) {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('Link non valido');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Solo link http/https');
  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal') || host === 'metadata.google.internal') {
    throw new Error('Host non consentito');
  }
  const looked = await dns.lookup(host, { all: true });
  if (!looked.length || looked.some((row) => isPrivateIp(row.address))) {
    throw new Error('Host non consentito');
  }
  return parsed.toString();
}

async function fetchText(url: string): Promise<{ url: string; html: string }> {
  const safe = await assertPublicUrl(url);
  const res = await fetch(safe, {
    redirect: 'follow',
    signal: AbortSignal.timeout(12000),
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
    },
  });
  const finalUrl = res.url || safe;
  await assertPublicUrl(finalUrl);
  const type = String(res.headers.get('content-type') || '');
  if (!type.includes('html') && !type.includes('xml') && !type.includes('text')) {
    throw new Error('La pagina non è HTML');
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 2_000_000) throw new Error('Pagina troppo grande');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return { url: finalUrl, html: buf.toString('utf8') };
}

async function fetchImage(url: string): Promise<Buffer | null> {
  try {
    const safe = await assertPublicUrl(url);
    const res = await fetch(safe, {
      redirect: 'follow',
      signal: AbortSignal.timeout(12000),
      headers: { 'User-Agent': UA, Accept: 'image/*,*/*;q=0.8' },
    });
    if (!res.ok) return null;
    await assertPublicUrl(res.url || safe);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 80 || buf.length > 8_000_000) return null;
    return buf;
  } catch {
    return null;
  }
}

function decodeHtml(value: string) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .trim();
}

const STREET_TYPES =
  'Via|Viale|Piazza|P\\.zza|P\\.za|Corso|C\\.so|Galleria|Largo|Vicolo|Strada|Contrada|Localit[aà]|Lungomare|Lungarno|Traversa|Salita|Calata|Borgo|Rione|Alzaia|Circonvallazione|Vico|Isola';

/** Caratteri ammessi nel nome via/civico: include "/" per civici tipo "12/A", "45/r". */
const STREET_NAME_CHARS = "A-Za-zÀ-ÿ0-9'’./ -";

function cleanCityName(city: string) {
  return String(city || '')
    .replace(/\s+(Caf[eé]|Ristorante|Tel|Telefono|Contatti|Email|P\.?IVA|Italia|Italy|Luned[iì]|Marted|Orari|Prenota|\+\d).*$/i, '')
    .replace(/[,.;]+$/, '')
    // sigla provincia finale del formato postale "CAP Città PR" (es. "Milano MI" -> "Milano")
    .replace(/\s+[A-Z]{2}$/, '')
    .trim();
}

export function parseItalianAddress(raw: string): { street?: string; city?: string; postalCode?: string } | null {
  const text = decodeHtml(raw).replace(/\s+/g, ' ').trim();
  if (!text || text.length < 8) return null;

  // Prima occorrenza di "Via/Corso/..." fino alla prima virgola (o fine stringa), e CAP+città
  // cercati in un punto qualsiasi del testo: copre il caso di un punto di riferimento fra
  // l'indirizzo e il CAP (es. "Via Roma 12, angolo Via Garibaldi, 20100 Milano"), dove le
  // regex sotto — che richiedono il CAP subito dopo la via — prenderebbero la via sbagliata.
  const firstStreet = text.match(
    new RegExp(`\\b(${STREET_TYPES})\\s+([${STREET_NAME_CHARS}]{2,70}?)(?=[,\\-–]|$)`, 'i')
  );
  const capAnywhere = text.match(/\b(\d{5})\s+([A-Za-zÀ-ÿ'’ .-]{2,40})\b/);
  if (firstStreet && capAnywhere) {
    const city = cleanCityName(capAnywhere[2]);
    if (city) {
      return {
        street: `${firstStreet[1]} ${firstStreet[2]}`.replace(/\s+/g, ' ').trim(),
        postalCode: capAnywhere[1],
        city: /^milan$/i.test(city) ? 'Milano' : city,
      };
    }
  }

  const withCap = text.match(
    new RegExp(
      `\\b(${STREET_TYPES})\\s+([${STREET_NAME_CHARS}]{2,70}?)[,\\-–]\\s*(\\d{5})\\s+([A-Za-zÀ-ÿ'’ .]{2,40})`,
      'i'
    )
  );
  if (withCap) {
    const city = cleanCityName(withCap[4]);
    if (city) {
      return {
        street: `${withCap[1]} ${withCap[2]}`.replace(/\s+/g, ' ').trim(),
        postalCode: withCap[3],
        city: /^milan$/i.test(city) ? 'Milano' : city,
      };
    }
  }
  const capFirst = text.match(
    new RegExp(
      `(\\d{5})\\s+([A-Za-zÀ-ÿ'’ ]{2,35})[,\\-–]?\\s+(${STREET_TYPES})\\s+([${STREET_NAME_CHARS}]{2,70})`,
      'i'
    )
  );
  if (capFirst) {
    return {
      postalCode: capFirst[1],
      city: /^milan$/i.test(cleanCityName(capFirst[2])) ? 'Milano' : cleanCityName(capFirst[2]),
      street: `${capFirst[3]} ${capFirst[4].split(/[.;]/)[0]}`.replace(/\s+/g, ' ').trim(),
    };
  }
  const noCap = text.match(
    new RegExp(
      `\\b(${STREET_TYPES})\\s+([${STREET_NAME_CHARS}]{2,70}?),\\s*([A-ZÀ-ÿ][a-zà-ÿ'’ ]{2,35})\\b`,
      'i'
    )
  );
  if (noCap) {
    const city = cleanCityName(noCap[3]);
    if (city && !/^(il|la|lo|i|gli|le|un|una)$/i.test(city)) {
      return {
        street: `${noCap[1]} ${noCap[2]}`.replace(/\s+/g, ' ').trim(),
        city: /^milan$/i.test(city) ? 'Milano' : city,
      };
    }
  }
  const withCivico = text.match(
    new RegExp(`\\b(${STREET_TYPES})\\s+([${STREET_NAME_CHARS}]{2,70}?),\\s*(\\d+[a-zA-Z]?)\\b`, 'i')
  );
  if (withCivico) {
    return {
      street: `${withCivico[1]} ${withCivico[2]}, ${withCivico[3]}`.replace(/\s+/g, ' ').trim(),
    };
  }
  const capCity = text.match(/\b(\d{5})\s+([A-Za-zÀ-ÿ'’ .-]{2,40})\b/);
  if (capCity) {
    const city = cleanCityName(capCity[2]);
    if (city) {
      return {
        postalCode: capCity[1],
        city: /^milan$/i.test(city) ? 'Milano' : city,
      };
    }
  }
  return null;
}

function normalizeCityToken(value: string) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
}

function cityMatches(a?: string, b?: string) {
  if (!a || !b) return false;
  const na = normalizeCityToken(a);
  const nb = normalizeCityToken(b);
  if (!na || !nb) return false;
  if (na === nb || na.includes(nb) || nb.includes(na)) return true;
  return na.split(/\s+/)[0] === nb.split(/\s+/)[0];
}

function scoreAddressCandidate(addr: Partial<ImportedProfile>, hintCity?: string) {
  let score = 0;
  if (addr.street) score += 18;
  if (addr.city) score += 10;
  if (addr.postalCode) score += 6;
  if (hintCity && addr.city && cityMatches(addr.city, hintCity)) score += 45;
  if (hintCity && addr.street && !addr.city) score += 8;
  return score;
}

function pickBestAddress(candidates: Partial<ImportedProfile>[], hintCity?: string) {
  let best: Partial<ImportedProfile> | null = null;
  let bestScore = 0;
  for (const candidate of candidates) {
    if (!candidate.street && !candidate.city) continue;
    const score = scoreAddressCandidate(candidate, hintCity);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  if (!best) return null;
  if (hintCity && best.city && !cityMatches(best.city, hintCity) && bestScore < 25) {
    const local = candidates.find((c) => c.city && cityMatches(c.city, hintCity));
    if (local) return { ...local, street: local.street || best.street };
  }
  return best;
}

function collectJsonLdAddresses(nodes: any[]): Partial<ImportedProfile>[] {
  const out: Partial<ImportedProfile>[] = [];
  for (const node of nodes) {
    if (node?.address) {
      const addr = addressFromLd(node);
      if (addr.street || addr.city) out.push(addr);
    }
    if (typeOf(node).includes('postaladdress')) {
      const addr = addressFromLd({ address: node });
      if (addr.street || addr.city) out.push(addr);
    }
  }
  return out;
}

function scrapeHtmlLocationSections(html: string): Partial<ImportedProfile>[] {
  const results: Partial<ImportedProfile>[] = [];
  const headerRe = /<(h[2-6]|strong|span)[^>]*>\s*([A-Za-zÀ-ÿ'’ .-]{2,35})\s*:?\s*<\/\1>/gi;
  let header: RegExpExecArray | null;
  while ((header = headerRe.exec(html))) {
    const cityLabel = cleanCityName(header[2]);
    if (!cityLabel || cityLabel.length < 3 || /^(tel|email|orari|menu|contatti|home)$/i.test(cityLabel)) continue;
    const window = html.slice(header.index, header.index + 1800);
    const profile: Partial<ImportedProfile> = { city: cityLabel };
    const streetMatch = window.match(
      /<(p|span|div|li)[^>]*>\s*((?:Via|Viale|Corso|Piazza|Galleria|Largo|Vicolo|Strada|Circumvallazione)[^<]{4,90})\s*<\//i
    );
    if (streetMatch) {
      const raw = decodeHtml(streetMatch[2].replace(/<[^>]+>/g, ' ')).trim();
      profile.street = parseItalianAddress(raw)?.street || raw;
    }
    const capMatch = window.match(/<(p|span|div|li)[^>]*>\s*(\d{5})\s+([A-Za-zÀ-ÿ'’ .-]{2,40})\s*<\//i);
    if (capMatch) {
      profile.postalCode = capMatch[2];
      profile.city = cleanCityName(capMatch[3]) || profile.city;
    }
    if (profile.street || profile.postalCode) results.push(profile);
  }

  const viaRe =
    /<(p|span|div|li)[^>]*>\s*((?:Via|Viale|Corso|Piazza|Galleria|Largo|Vicolo|Strada|Circumvallazione)[^<]{4,90})\s*<\//gi;
  let via: RegExpExecArray | null;
  while ((via = viaRe.exec(html))) {
    const raw = decodeHtml(via[2].replace(/<[^>]+>/g, ' ')).trim();
    const parsed = parseItalianAddress(raw);
    if (parsed) results.push(parsed);
    else results.push({ street: raw });
  }

  const capRe = /<(p|span|div|li)[^>]*>\s*(\d{5})\s+([A-Za-zÀ-ÿ'’ .-]{2,40})\s*<\//gi;
  let cap: RegExpExecArray | null;
  while ((cap = capRe.exec(html))) {
    results.push({ postalCode: cap[2], city: cleanCityName(cap[3]) });
  }

  return results;
}

function addressFromGoogleMapsUrl(url: string): Partial<ImportedProfile> | null {
  try {
    const u = new URL(url);
    const q = u.searchParams.get('q') || u.searchParams.get('query') || u.searchParams.get('destination') || '';
    if (q) {
      const parsed = parseItalianAddress(decodeURIComponent(q.replace(/\+/g, ' ')));
      if (parsed) return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function applyBestAddress(
  profile: Partial<ImportedProfile>,
  candidates: Partial<ImportedProfile>[],
  hintCity?: string
) {
  const best = pickBestAddress(candidates, hintCity);
  if (!best) return;
  if (best.street) profile.street = best.street;
  if (best.city) profile.city = best.city;
  if (best.postalCode) profile.postalCode = best.postalCode;
}

function itemprop(html: string, name: string) {
  const patterns = [
    new RegExp(`itemprop=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i'),
    new RegExp(`content=["']([^"']+)["'][^>]*itemprop=["']${name}["']`, 'i'),
    new RegExp(`itemprop=["']${name}["'][^>]*>([^<]+)`, 'i'),
  ];
  for (let i = 0; i < patterns.length; i += 1) {
    const m = html.match(patterns[i]);
    if (m?.[1]) return decodeHtml(m[1]);
  }
  return '';
}

function addressFromLd(ld: any): Partial<ImportedProfile> {
  if (!ld) return {};
  const addr = ld.address;
  if (typeof addr === 'string') return parseItalianAddress(addr) || {};
  if (addr && typeof addr === 'object') {
    const street = str(addr.streetAddress || addr.street);
    const city = str(addr.addressLocality);
    const postalCode = str(addr.postalCode);
    if (street || city || postalCode) {
      const parsed = parseItalianAddress([street, postalCode, city].filter(Boolean).join(', '));
      return {
        street: street || parsed?.street,
        city: city || parsed?.city,
        postalCode: postalCode || parsed?.postalCode,
      };
    }
    if (addr.name) return parseItalianAddress(str(addr.name)) || {};
  }
  return {};
}

function absUrl(base: string, maybe: string) {
  try {
    return new URL(maybe, base).toString();
  } catch {
    return '';
  }
}

function meta(html: string, key: string) {
  const esc = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${esc}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${esc}["']`, 'i'),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeHtml(m[1]);
  }
  return '';
}

function titleOf(html: string) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? decodeHtml(m[1]) : '';
}

/** Titoli di pagina generici (nessun separatore prima), da trattare come "nessun nome trovato". */
const GENERIC_PAGE_TITLES = /^(google maps|maps|home|homepage|facebook|instagram)$/i;

function cleanTitle(title: string, kind: string) {
  let t = title
    .replace(/\s*[-|–•]\s*(Google Maps|TripAdvisor|TheFork|LaFourchette|Facebook|Instagram).*$/i, '')
    .replace(/\s*\|\s*(TheFork|TripAdvisor).*$/i, '')
    .replace(/\s*-\s*Ristorante.*TripAdvisor.*$/i, '')
    .trim();
  if (kind === 'google') t = t.replace(/\s*\(\d+[.,]\d+\).*$/, '').trim();
  if (GENERIC_PAGE_TITLES.test(t)) return '';
  return t;
}

function flattenLd(node: any, out: any[] = []): any[] {
  if (!node) return out;
  if (Array.isArray(node)) {
    node.forEach((item) => flattenLd(item, out));
    return out;
  }
  if (typeof node !== 'object') return out;
  out.push(node);
  if (node['@graph']) flattenLd(node['@graph'], out);
  return out;
}

function jsonLdNodes(html: string): any[] {
  const nodes: any[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      const parsed = JSON.parse(m[1].replace(/[\u0000-\u001f]+/g, ' '));
      flattenLd(parsed, nodes);
    } catch {
      /* ignore broken json-ld */
    }
  }
  return nodes;
}

function typeOf(node: any): string {
  const t = node?.['@type'];
  return (Array.isArray(t) ? t.join(' ') : String(t || '')).toLowerCase();
}

function pickBusiness(nodes: any[]) {
  const rank = ['restaurant', 'foodestablishment', 'barorpub', 'cafeorcoffeeshop', 'localbusiness', 'organization'];
  let best: any = null;
  let bestScore = -1;
  for (const node of nodes) {
    const t = typeOf(node);
    const score = rank.findIndex((k) => t.includes(k));
    if (score >= 0 && (bestScore < 0 || score < bestScore)) {
      best = node;
      bestScore = score;
    }
  }
  if (best) return best;
  return nodes.find((n) => n.name && (n.address || n.telephone || n.openingHoursSpecification));
}

function str(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return decodeHtml(value).trim();
  if (Array.isArray(value)) return str(value[0]);
  if (typeof value === 'object') return str(value.name || value.text || value.url || value['@id']);
  return String(value).trim();
}

function hoursFromHtml(html: string): string {
  const text = decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  ).replace(/\s+/g, ' ');

  const labeled = text.match(
    /(?:orari(?:\s+di\s+apertura)?|orario(?:\s+di\s+apertura)?|apertura|opening hours)\s*[:\-–]?\s*([^.]{10,240})/i
  );
  if (labeled?.[1] && /\d{1,2}[:.]\d{2}/.test(labeled[1])) {
    return normalizeOpeningHours(labeled[1].replace(/\s+/g, ' ').trim().slice(0, 240));
  }

  const windows =
    text.match(
      /(?:lun(?:edì)?|mar(?:tedì)?|mer(?:coledì)?|gio(?:vedì)?|ven(?:erdì)?|sab(?:ato)?|dom(?:enica)?|tutti i giorni|ogni giorno)[^.]{0,48}\d{1,2}[:.]\d{2}\s*[-–\/]\s*\d{1,2}[:.]\d{2}(?:\s*[\/|]\s*\d{1,2}[:.]\d{2}\s*[-–\/]\s*\d{1,2}[:.]\d{2})?/gi
    ) || [];
  if (windows.length) {
    return normalizeOpeningHours(windows.slice(0, 6).map((item) => item.replace(/\s+/g, ' ').trim()).join(' · '));
  }

  const schemaish = text.match(
    /(?:Mo|Tu|We|Th|Fr|Sa|Su)(?:\s*[-–]\s*(?:Mo|Tu|We|Th|Fr|Sa|Su))?\s+\d{1,2}[:.]\d{2}\s*[-–]\s*\d{1,2}[:.]\d{2}/gi
  );
  if (schemaish?.length) return normalizeOpeningHours(schemaish.slice(0, 6).join(' · '));
  return '';
}

function dayAbbrev(raw: string) {
  const day = String(raw)
    .replace(/^https?:\/\/schema\.org\//i, '')
    .toLowerCase();
  const map: Record<string, string> = {
    monday: 'Lu',
    tuesday: 'Ma',
    wednesday: 'Me',
    thursday: 'Gi',
    friday: 'Ve',
    saturday: 'Sa',
    sunday: 'Do',
  };
  return map[day] || day.slice(0, 2);
}

function hoursFromLd(node: any): string {
  if (Array.isArray(node?.openingHours) && node.openingHours.length) {
    return normalizeOpeningHours(node.openingHours.map(str).filter(Boolean).join(' · '));
  }
  if (typeof node?.openingHours === 'string') return normalizeOpeningHours(node.openingHours);
  const spec = node?.openingHoursSpecification;
  const items = Array.isArray(spec) ? spec : spec ? [spec] : [];
  const lines = items
    .map((row: any) => {
      const days = [].concat(row.dayOfWeek || []).map((d: any) => dayAbbrev(String(d))).join('-');
      const from = row.opens || '';
      const to = row.closes || '';
      if (!from || !to) return '';
      return `${days} ${from}-${to}`.trim();
    })
    .filter(Boolean);
  return normalizeOpeningHours(lines.join(' · '));
}

function collectHrefs(html: string, base: string): string[] {
  const hrefs: string[] = [];
  const re = /href=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    const url = absUrl(base, decodeHtml(m[1]));
    if (url.startsWith('http') || url.startsWith('mailto:') || url.startsWith('tel:')) hrefs.push(url);
  }
  return hrefs;
}

function profileFromUrlMetadata(url: string): Partial<ImportedProfile> & { notes?: string[] } {
  const notes: string[] = [];
  const lower = url.toLowerCase();

  if (/tripadvisor\.[a-z.]+\/restaurant_review/i.test(url)) {
    const chunk = url.match(/Reviews-([^/?#]+)/i)?.[1]?.replace(/\.html.*$/i, '');
    if (chunk) {
      const parts = chunk.split('-');
      const name = parts[0]?.replace(/_/g, ' ').trim();
      let city = '';
      for (const part of parts.slice(1)) {
        const token = part.replace(/_/g, ' ');
        const first = token.split(' ')[0];
        if (/^(Salerno|Napoli|Roma|Milano|Bologna|Firenze|Torino|Genova|Palermo|Catania|Bari|Verona|Padova|Modena|Parma|Pisa|Lecce|Perugia|Cagliari|Siracusa|Trieste|Venezia|Como|Vicenza|Bergamo|Bolzano|Trento|Ancona|Foggia|Rimini|Prato|Catanzaro|Livorno|Ravenna|Cosenza|Alessandria|Arezzo|Pescara|Latina|Monza|Udine|Brindisi|Taranto|Caserta)$/i.test(first)) {
          city = first;
          break;
        }
      }
      if (name) {
        notes.push(`TripAdvisor: dati dal link`);
        return { name, city: city || undefined, notes };
      }
    }
  }

  if (/paginegialle\.it\//.test(lower)) {
    const slug = url.split('/').filter(Boolean).pop() || '';
    const citySlug = url.match(/paginegialle\.it\/([a-z0-9-]+)-[a-z]{2}\//i)?.[1];
    const nameGuess = slug.replace(/-/g, ' ').replace(/\bs r l\b/i, 's.r.l.').trim();
    if (nameGuess.length > 2) {
      notes.push(`Pagine Gialle: profilo trovato`);
      return {
        name: nameGuess.replace(/\b\w/g, (c) => c.toUpperCase()),
        city: citySlug ? citySlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : undefined,
        website: url.split('?')[0],
        notes,
      };
    }
  }

  return {};
}

function prioritizeImportUrls(urls: string[]) {
  const stage = (u: string) => {
    const kind = classifyHost(hostOf(u));
    const order: Record<string, number> = {
      google: 10,
      website: 20,
      directory: 30,
      tripadvisor: 35,
      thefork: 36,
      instagram: 50,
      facebook: 51,
      glovo: 60,
      deliveroo: 61,
      justeat: 62,
    };
    return order[kind] ?? 25;
  };
  const score = (u: string) => {
    const lower = u.toLowerCase();
    let boost = 0;
    if (/paginegialle\.it/.test(lower)) boost += 5;
    if (/eatbu\.com|\.dish\.co/.test(lower)) boost += 8;
    if (/google\.[a-z.]+\/maps|maps\.app\.goo\.gl/.test(lower)) boost += 10;
    return boost;
  };
  return [...urls].sort((a, b) => stage(a) - stage(b) || score(b) - score(a));
}

function isLinkOnlyImportUrl(url: string) {
  return ['instagram', 'facebook', 'glovo', 'deliveroo', 'justeat'].includes(classifyHost(hostOf(url)));
}

async function mergeParsedPage(
  profile: ImportedProfile,
  parsed: Partial<ImportedProfile> & { notes: string[]; logoBuf?: Buffer; coverUrls?: string[]; excerpt?: string },
  state: { logoBuf?: Buffer; coverUrls: string[]; excerpts: string[]; scrapedHosts: Set<string> },
  url: string
) {
  const { notes, logoBuf: nextLogo, coverUrls: nextCovers, excerpt, ...fields } = parsed;
  Object.assign(profile, mergeProfile(profile, fields));
  profile.notes.push(...notes);
  state.scrapedHosts.add(hostOf(url));
  if (excerpt) state.excerpts.push(excerpt);
  if (!state.logoBuf && nextLogo) state.logoBuf = nextLogo;
  (nextCovers || []).forEach((item) => {
    if (item && !state.coverUrls.includes(item)) state.coverUrls.push(item);
  });
}

function socialFromUrl(url: string): Partial<ImportedProfile> {
  const host = hostOf(url);
  const kind = classifyHost(host);
  if (kind === 'instagram') {
    const instagram = usableProfileUrl(url.split('?')[0], 'instagram');
    return instagram ? { instagram } : {};
  }
  if (kind === 'facebook') {
    const facebook = usableProfileUrl(url.split('?')[0], 'facebook');
    return facebook ? { facebook } : {};
  }
  if (kind === 'glovo') {
    const glovo = usableDeliveryUrl(url.split('?')[0], 'glovo');
    return glovo ? { glovo } : {};
  }
  if (kind === 'deliveroo') {
    const deliveroo = usableDeliveryUrl(url.split('?')[0], 'deliveroo');
    return deliveroo ? { deliveroo } : {};
  }
  if (kind === 'justeat') {
    const justeat = usableDeliveryUrl(url.split('?')[0], 'justeat');
    return justeat ? { justeat } : {};
  }
  if (url.startsWith('mailto:')) return { email: url.replace(/^mailto:/i, '').split('?')[0] };
  if (url.startsWith('tel:')) return { phone: url.replace(/^tel:/i, '') };
  const wa = url.match(/(?:wa\.me|whatsapp\.com\/send\?phone=)\/?(\+?\d+)/i);
  if (wa) {
    const whatsapp = usableWhatsApp(wa[1].startsWith('+') ? wa[1] : `+${wa[1]}`);
    return whatsapp ? { whatsapp } : {};
  }
  return {};
}

function logoScore(url: string) {
  const u = url.toLowerCase();
  let s = 0;
  if (/(^|\/)logo\.(svg|png|webp|jpg|jpeg)$/.test(u.split('?')[0])) s += 110;
  if (/logotipo/.test(u)) s += 80;
  if (/\/(?:img|images|assets|static|media)\/[^"' ]*logo/.test(u)) s += 70;
  if (u.includes('.svg')) s += 55;
  if (/logo/.test(u)) s += 25;
  if (/apple-touch|favicon|mstile|android-chrome|safari-pinned|site\.webmanifest/.test(u)) s -= 90;
  if (/opengraph|og-image|share-image|hero|cover|banner|slider|ogcdn/.test(u)) s -= 45;
  return s;
}

function logoCandidates(html: string, base: string, ld: any): string[] {
  const out: string[] = [];
  const push = (value: any) => {
    const url = str(value?.url || value);
    if (url && /^https?:\/\//i.test(url)) out.push(url);
    else if (url) {
      const abs = absUrl(base, url);
      if (abs) out.push(abs);
    }
  };
  push(ld?.logo);
  const attrRe = /(?:src|data-src|href)=["']([^"']*(?:logo|logotipo)[^"']*)["']/gi;
  let attr;
  while ((attr = attrRe.exec(html))) {
    out.push(absUrl(base, attr[1]));
  }
  const imgRe = /<img[^>]+>/gi;
  let tag;
  while ((tag = imgRe.exec(html))) {
    const chunk = tag[0];
    if (!/logo|logotipo|brand/i.test(chunk)) continue;
    const src = chunk.match(/(?:src|data-src)=["']([^"']+)["']/i);
    if (src?.[1]) out.push(absUrl(base, src[1]));
  }
  const iconRe = /<link[^>]+rel=["'](?:apple-touch-icon|icon|shortcut icon)["'][^>]*>/gi;
  let icon;
  while ((icon = iconRe.exec(html))) {
    const href = icon[0].match(/href=["']([^"']+)["']/i);
    if (href?.[1]) out.push(absUrl(base, href[1]));
  }
  const unique = Array.from(new Set(out.filter((item) => item && !/favicon\.ico(\?|$)/i.test(item))));
  unique.sort((a, b) => logoScore(b) - logoScore(a));
  return unique.slice(0, 8);
}

function rgbLum(r: number, g: number, b: number) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function rgbSat(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

function usableBrandColor(hex: string | null | undefined): string | null {
  const color = parseColor(hex || '');
  if (!color) return null;
  const h = color.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const lum = rgbLum(r, g, b);
  const sat = rgbSat(r, g, b);
  if (lum > 0.88 || lum < 0.08) return null;
  if (sat < 0.12) return null;
  return color;
}

function collectMatches(text: string, re: RegExp, group = 0) {
  const out: string[] = [];
  const flags = re.flags.includes('g') ? re.flags : `${re.flags}g`;
  const rx = new RegExp(re.source, flags);
  let m;
  while ((m = rx.exec(text))) {
    out.push(m[group] || m[0]);
  }
  return out;
}

function colorsFromSvg(buf: Buffer): string | null {
  const text = buf.subarray(0, 80_000).toString('utf8');
  if (!/<svg/i.test(text)) return null;
  const found = collectMatches(text, /\b(?:fill|stroke)=["']([^"']+)["']/gi, 1);
  const style = collectMatches(text, /(?:fill|stroke)\s*:\s*([^;}]+)/gi, 1).map((item) => item.trim());
  for (const raw of found.concat(style)) {
    if (/none|currentcolor|url\(/i.test(raw)) continue;
    const usable = usableBrandColor(parseColor(raw));
    if (usable) return usable;
  }
  return null;
}

async function brandColorFromImage(buf: Buffer): Promise<string | null> {
  const fromSvg = colorsFromSvg(buf);
  if (fromSvg) return fromSvg;
  try {
    const { data, info } = await sharp(buf)
      .resize(96, 96, { fit: 'inside' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const buckets = new Map<string, { n: number; r: number; g: number; b: number; score: number }>();
    for (let i = 0; i < data.length; i += info.channels) {
      const a = info.channels === 4 ? data[i + 3] : 255;
      if (a < 90) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = rgbLum(r, g, b);
      const sat = rgbSat(r, g, b);
      if (lum > 0.9 || lum < 0.08 || sat < 0.18) continue;
      const key = `${Math.round(r / 16)}-${Math.round(g / 16)}-${Math.round(b / 16)}`;
      const cur = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0, score: 0 };
      cur.n += 1;
      cur.r += r;
      cur.g += g;
      cur.b += b;
      cur.score += sat * (1 - Math.abs(lum - 0.45));
      buckets.set(key, cur);
    }
    const rows = Array.from(buckets.values());
    let best: { n: number; r: number; g: number; b: number; score: number } | null = null;
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      if (row.n < 6) continue;
      if (!best || row.score > best.score) best = row;
    }
    if (!best) return null;
    const hex = `#${[best.r / best.n, best.g / best.n, best.b / best.n]
      .map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0'))
      .join('')}`;
    return usableBrandColor(hex);
  } catch {
    return null;
  }
}

function emailScore(email: string) {
  const e = email.toLowerCase();
  if (/curriculum|privacy|pec@|webmaster|noreply|no-reply|cookie|legal/.test(e)) return -20;
  if (/info@|prenotaz|hello@|contact@|ristorante@|booking|ciao@/.test(e)) return 20;
  return 1;
}

function scrapeMetaContacts(html: string): Partial<ImportedProfile> {
  const out: Partial<ImportedProfile> = {};
  const phone =
    meta(html, 'phone') ||
    meta(html, 'restaurant:contact_info:phone_number') ||
    meta(html, 'telephone');
  if (phone) {
    const digits = phone.replace(/[^\d+]/g, '');
    out.phone = digits.startsWith('+') ? digits : digits.startsWith('39') ? `+${digits}` : `+39${digits.replace(/^0/, '')}`;
  }
  const email = meta(html, 'email') || meta(html, 'restaurant:contact_info:email');
  if (email && emailScore(email) > 0) out.email = email;

  const streetMeta = meta(html, 'restaurant:contact_info:street_address');
  const cityMeta = meta(html, 'restaurant:contact_info:locality');
  const capMeta = meta(html, 'restaurant:contact_info:postal_code');
  if (streetMeta || cityMeta || capMeta) {
    const parsed =
      parseItalianAddress([streetMeta, capMeta, cityMeta].filter(Boolean).join(', ')) ||
      parseItalianAddress(meta(html, 'address'));
    if (parsed) Object.assign(out, parsed);
    else {
      if (streetMeta) out.street = streetMeta;
      if (cityMeta) out.city = /^milan$/i.test(cityMeta) ? 'Milano' : cityMeta;
      if (capMeta) out.postalCode = capMeta;
    }
  } else {
    const addrMeta = meta(html, 'address');
    if (addrMeta) Object.assign(out, parseItalianAddress(addrMeta) || {});
  }
  return out;
}

function scrapeContacts(html: string): Partial<ImportedProfile> {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  const text = decodeHtml(stripped).replace(/\s+/g, ' ');
  const out: Partial<ImportedProfile> = {};
  const phone = text.match(/\+39[\s\d./-]{8,18}/);
  if (phone) out.phone = phone[0].replace(/[^\d+]/g, '').replace(/^39/, '+39');
  const emails = collectMatches(text, /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  emails.sort((a, b) => emailScore(b) - emailScore(a));
  if (emails[0] && emailScore(emails[0]) > 0) out.email = emails[0];

  const candidates: Array<{ street?: string; city?: string; postalCode?: string; score: number }> = [];
  const pushAddr = (parsed: { street?: string; city?: string; postalCode?: string } | null, extra = 0) => {
    if (!parsed || (!parsed.street && !parsed.city)) return;
    candidates.push({
      ...parsed,
      score: extra + (parsed.postalCode ? 8 : 0) + (parsed.street ? 5 : 0) + (parsed.city ? 3 : 0),
    });
  };
  const streetRe = new RegExp(
    `\\b(?:${STREET_TYPES})\\s+[${STREET_NAME_CHARS}]{2,70}?(?:[,\\-–]\\s*\\d{5}\\s+[A-Za-zÀ-ÿ'’ .]{2,40}|,\\s*[A-ZÀ-ÿ][a-zà-ÿ'’ ]{2,35})`,
    'gi'
  );
  const snippets = collectMatches(text, streetRe);
  for (let i = 0; i < snippets.length; i += 1) pushAddr(parseItalianAddress(snippets[i]));
  const addressTags = html.match(/<address[^>]*>[\s\S]*?<\/address>/gi) || [];
  for (let i = 0; i < addressTags.length; i += 1) {
    const inner = decodeHtml(addressTags[i].replace(/<[^>]+>/g, ' '));
    pushAddr(parseItalianAddress(inner), 6);
  }
  const micro: Partial<ImportedProfile> = {
    street: itemprop(html, 'streetAddress'),
    city: itemprop(html, 'addressLocality'),
    postalCode: itemprop(html, 'postalCode'),
  };
  if (micro.street || micro.city) {
    pushAddr(
      parseItalianAddress([micro.street, micro.postalCode, micro.city].filter(Boolean).join(', ')) || micro,
      10
    );
  }
  candidates.sort((a, b) => b.score - a.score);
  if (candidates[0]) {
    if (candidates[0].street) out.street = candidates[0].street;
    if (candidates[0].city) out.city = candidates[0].city;
    if (candidates[0].postalCode) out.postalCode = candidates[0].postalCode;
  }
  return out;
}

function coverScore(url: string) {
  const u = url.toLowerCase();
  let s = 0;
  if (/wp-content\/uploads|cloudfront|imagedelivery|googleusercontent|fbcdn/.test(u)) s += 28;
  if (/images\.unsplash|pexels\.com|pixabay|shopify/.test(u)) s -= 40;
  if (/\.(jpe?g|webp)(\?|$)/.test(u.split('?')[0])) s += 20;
  if (/galleria|interior|sala|hero|cover|header|locale|ristorante|restaurant|ambiente|location|gallery/.test(u)) s += 22;
  if (/logo|icon|favicon|sprite|pixel|1x1|facebook\.com\/tr|gravatar|avatar|badge|button/.test(u)) s -= 120;
  if (/-m-\d|thumb|small|150x|300x|32x32|64x64/.test(u)) s -= 25;
  if (/\.svg(\?|$)/.test(u.split('?')[0])) s -= 80;
  return s;
}

function coverCandidates(html: string, base: string, ld: any): string[] {
  const out: string[] = [];
  const push = (value: any) => {
    const url = str(value?.url || value);
    if (!url) return;
    const abs = /^https?:\/\//i.test(url) ? url : absUrl(base, url);
    if (abs) out.push(abs);
  };
  push(meta(html, 'og:image'));
  push(meta(html, 'twitter:image'));
  const images = [].concat(ld?.image || []);
  for (let i = 0; i < images.length; i += 1) push(images[i]);
  const imgRe = /<img[^>]+>/gi;
  let tag;
  while ((tag = imgRe.exec(html))) {
    if (/\b(?:width|height)=["']1["']/i.test(tag[0])) continue;
    const src = tag[0].match(/(?:src|data-src|data-lazy-src)=["']([^"']+)["']/i);
    if (src?.[1]) push(src[1]);
  }
  const uploads = html.match(/https?:\/\/[^"' )]+\/(?:uploads|media|images)\/[^"' )]+/gi) || [];
  for (let i = 0; i < uploads.length; i += 1) push(uploads[i]);
  const unique = Array.from(new Set(out.filter((item) => coverScore(item) > 0)));
  unique.sort((a, b) => coverScore(b) - coverScore(a));
  return unique.slice(0, 8);
}

const STOCK_BACKGROUNDS = [
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1600&q=80',
];

async function bufferLooksLikeCover(buf: Buffer) {
  try {
    const meta = await sharp(buf).metadata();
    const w = meta.width || 0;
    const h = meta.height || 0;
    if (w < 480 || h < 280) return false;
    if (w / h > 0.9 && w / h < 1.15 && w < 700) return false;
    return true;
  } catch {
    return false;
  }
}

export async function prepareCoverChoices(urls: string[]): Promise<string[]> {
  const chosen: string[] = [];
  const seen = new Set<string>();
  const tryList = async (list: string[]) => {
    for (let i = 0; i < list.length && chosen.length < 5; i += 1) {
      const url = list[i];
      if (!url || seen.has(url)) continue;
      seen.add(url);
      const buf = await fetchImage(url);
      if (!buf || !(await bufferLooksLikeCover(buf))) continue;
      try {
        const saved = await processBrandImage(buf, 'background');
        chosen.push(saved.url);
      } catch {
        /* skip */
      }
    }
  };
  await tryList(urls);
  if (chosen.length < 3) await tryList(STOCK_BACKGROUNDS);
  return chosen;
}

function pageExcerpt(html: string, url: string) {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  const text = decodeHtml(stripped).replace(/\s+/g, ' ').trim().slice(0, 4500);
  const hrefs = collectHrefs(html, url)
    .filter((item) => /instagram|facebook|whatsapp|wa\.me|glovo|deliveroo|justeat|mailto:|tel:/i.test(item))
    .slice(0, 25)
    .join('\n');
  return `URL: ${url}\n${text}\nLINK:\n${hrefs}`.slice(0, 5500);
}

function mergeProfile(base: ImportedProfile, extra: Partial<ImportedProfile>): ImportedProfile {
  const out = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    if (key === 'sources' || key === 'notes') continue;
    if (!value) continue;
    if (!(out as any)[key]) (out as any)[key] = value;
  }
  return out;
}

async function parsePage(
  url: string,
  opts?: { hintCity?: string }
): Promise<Partial<ImportedProfile> & { notes: string[]; logoBuf?: Buffer; coverUrls?: string[]; excerpt?: string }> {
  const hintCity = opts?.hintCity?.trim();
  const kind = classifyHost(hostOf(url));
  const notes: string[] = [];
  if (['instagram', 'facebook', 'glovo', 'deliveroo', 'justeat'].includes(kind)) {
    return { ...socialFromUrl(url), notes: [`${kind}: salvato il link`] };
  }

  const page = await fetchText(url);
  const html = page.html;
  const finalKind = classifyHost(hostOf(page.url)) || kind;
  const nodes = jsonLdNodes(html);
  const ld = pickBusiness(nodes);
  const profile: Partial<ImportedProfile> = { ...socialFromUrl(url) };
  const addressCandidates: Partial<ImportedProfile>[] = [];

  const ogTitle = cleanTitle(meta(html, 'og:title') || titleOf(html), finalKind);
  profile.name = str(ld?.name) || ogTitle;
  profile.description = str(ld?.description) || meta(html, 'og:description') || meta(html, 'description');
  Object.assign(profile, addressFromLd(ld));
  addressCandidates.push(...collectJsonLdAddresses(nodes));
  for (let i = 0; i < nodes.length; i += 1) {
    if (typeOf(nodes[i]).includes('postaladdress')) {
      const extra = addressFromLd({ address: nodes[i] });
      if (!profile.street && extra.street) profile.street = extra.street;
      if (!profile.city && extra.city) profile.city = extra.city;
      if (!profile.postalCode && extra.postalCode) profile.postalCode = extra.postalCode;
    }
  }
  profile.phone = str(ld?.telephone) || str(ld?.phone);
  profile.email = str(ld?.email);
  profile.openingHours = hoursFromLd(ld) || hoursFromHtml(html);
  if (profile.openingHours) profile.openingHours = normalizeOpeningHours(profile.openingHours);

  const mapsAddr = addressFromGoogleMapsUrl(page.url);
  if (mapsAddr) addressCandidates.push(mapsAddr);
  try {
    const q = new URL(page.url).searchParams.get('q') || new URL(page.url).searchParams.get('query') || '';
    if (q) {
      const fromQuery = parseItalianAddress(decodeURIComponent(q.replace(/\+/g, ' ')));
      if (fromQuery) addressCandidates.push(fromQuery);
    }
  } catch {
    /* ignore */
  }

  const official = str(ld?.url);
  if (official && classifyHost(hostOf(official)) === 'website') profile.website = official;
  else if (finalKind === 'website') profile.website = page.url.split('?')[0];

  const sameAs = [].concat(ld?.sameAs || []);
  for (const item of sameAs) Object.assign(profile, socialFromUrl(str(item)));
  for (const href of collectHrefs(html, page.url).slice(0, 80)) {
    Object.assign(profile, socialFromUrl(href));
  }
  if (profile.email && emailScore(profile.email) < 0) delete profile.email;
  const metaContacts = scrapeMetaContacts(html);
  if (!profile.phone && metaContacts.phone) profile.phone = metaContacts.phone;
  if (metaContacts.email && (!profile.email || emailScore(metaContacts.email) > emailScore(profile.email))) {
    profile.email = metaContacts.email;
  }
  if (metaContacts.street || metaContacts.city || metaContacts.postalCode) {
    addressCandidates.push({
      street: metaContacts.street,
      city: metaContacts.city,
      postalCode: metaContacts.postalCode,
    });
  }
  if (metaContacts.street && (!profile.street || (metaContacts.postalCode && !profile.postalCode))) {
    profile.street = metaContacts.street;
    if (metaContacts.city) profile.city = metaContacts.city;
    if (metaContacts.postalCode) profile.postalCode = metaContacts.postalCode;
  } else {
    if (!profile.street && metaContacts.street) profile.street = metaContacts.street;
    if (!profile.city && metaContacts.city) profile.city = metaContacts.city;
    if (!profile.postalCode && metaContacts.postalCode) profile.postalCode = metaContacts.postalCode;
  }
  const scraped = scrapeContacts(html);
  if (!profile.phone && scraped.phone) profile.phone = scraped.phone;
  if (scraped.email && (!profile.email || emailScore(scraped.email) > emailScore(profile.email))) {
    profile.email = scraped.email;
  }
  if (!profile.openingHours) profile.openingHours = hoursFromHtml(html);
  if (profile.openingHours) profile.openingHours = normalizeOpeningHours(profile.openingHours);
  if (scraped.street || scraped.city || scraped.postalCode) {
    addressCandidates.push({ street: scraped.street, city: scraped.city, postalCode: scraped.postalCode });
  }
  if (scraped.street && (!profile.street || (scraped.postalCode && !profile.postalCode))) {
    profile.street = scraped.street;
    if (scraped.city) profile.city = scraped.city;
    if (scraped.postalCode) profile.postalCode = scraped.postalCode;
  } else {
    if (!profile.street && scraped.street) profile.street = scraped.street;
    if (!profile.city && scraped.city) profile.city = scraped.city;
    if (!profile.postalCode && scraped.postalCode) profile.postalCode = scraped.postalCode;
  }

  addressCandidates.push(...scrapeHtmlLocationSections(html));
  if (profile.street || profile.city || profile.postalCode) {
    addressCandidates.push({ street: profile.street, city: profile.city, postalCode: profile.postalCode });
  }
  applyBestAddress(profile, addressCandidates, hintCity);

  if (profile.city && /^milan$/i.test(profile.city)) profile.city = 'Milano';

  const theme = usableBrandColor(meta(html, 'theme-color'));
  if (theme) profile.primaryColor = theme;

  const logos = logoCandidates(html, page.url, ld).filter((item) => {
    if (finalKind !== 'website' && /ogcdn|og:image|maps.gstatic|googleusercontent.com\/maps/i.test(item)) return false;
    return !/favicon\.ico(\?|$)/i.test(item);
  });
  let logoBuf: Buffer | undefined;
  for (const candidate of logos) {
    const buf = await fetchImage(candidate);
    if (!buf) continue;
    logoBuf = buf;
    break;
  }

  const coverUrls = coverCandidates(html, page.url, ld);

  notes.push(`${finalKind}: ${page.url}`);
  return { ...profile, notes, logoBuf, coverUrls, excerpt: pageExcerpt(html, page.url) };
}

type GooglePlaceResult = {
  id?: string;
  displayName?: { text?: string };
  addressComponents?: Array<{ longText?: string; shortText?: string; types?: string[] }>;
  internationalPhoneNumber?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  websiteUri?: string;
  photos?: Array<{ name?: string }>;
};

function placesApiKey() {
  return String(loadIntegrations().google.places.apiKey || '').trim();
}

/** Ricava dal link Maps (dopo i redirect) il testo da cercare con Places Text Search. */
function placeQueryFromMapsUrl(finalUrl: string) {
  try {
    const u = new URL(finalUrl);
    const q = u.searchParams.get('q') || u.searchParams.get('query');
    if (q) return decodeURIComponent(q.replace(/\+/g, ' ')).trim();
    const m = u.pathname.match(/\/maps\/place\/([^/]+)/i);
    if (m) return decodeURIComponent(m[1].replace(/\+/g, ' ')).trim();
  } catch {
    /* ignore */
  }
  return '';
}

/**
 * Legge nome, indirizzo, telefono, orari e foto di un locale da Google Places API,
 * invece di fare scraping della pagina Maps (che è una SPA e non contiene quasi mai
 * dati reali nell'HTML). Ritorna null se manca la chiave API o non si trova nulla:
 * il chiamante ricade sullo scraping esistente come rete di sicurezza.
 */
async function fetchGooglePlaceProfile(
  url: string
): Promise<(Partial<ImportedProfile> & { notes: string[]; coverUrls?: string[] }) | null> {
  const apiKey = placesApiKey();
  if (!apiKey) return null;

  const safe = await assertPublicUrl(url);
  const head = await fetch(safe, {
    method: 'GET',
    redirect: 'follow',
    signal: AbortSignal.timeout(10000),
    headers: { 'User-Agent': UA },
  });
  const finalUrl = head.url || safe;
  await assertPublicUrl(finalUrl);

  const query = placeQueryFromMapsUrl(finalUrl);
  if (!query) return null;

  const searchRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    signal: AbortSignal.timeout(10000),
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.addressComponents,places.internationalPhoneNumber,places.regularOpeningHours,places.websiteUri,places.photos',
    },
    body: JSON.stringify({ textQuery: query, languageCode: 'it', regionCode: 'IT' }),
  });
  if (!searchRes.ok) {
    throw new Error(`Places API ${searchRes.status}`);
  }
  const data: { places?: GooglePlaceResult[] } = await searchRes.json();
  const place = data.places?.[0];
  if (!place) return null;

  const components = place.addressComponents || [];
  const findComponent = (type: string) =>
    components.find((c) => c.types?.includes(type))?.longText || '';
  const route = findComponent('route');
  const streetNumber = findComponent('street_number');
  const city = findComponent('locality') || findComponent('postal_town') || findComponent('administrative_area_level_3');
  const postalCode = findComponent('postal_code');

  const profile: Partial<ImportedProfile> & { notes: string[]; coverUrls?: string[] } = {
    notes: ['Google Maps: dati letti da Google Places API'],
  };
  if (place.displayName?.text) profile.name = place.displayName.text;
  if (route) profile.street = streetNumber ? `${route} ${streetNumber}` : route;
  if (city) profile.city = city;
  if (postalCode) profile.postalCode = postalCode;
  if (place.internationalPhoneNumber) profile.phone = place.internationalPhoneNumber;
  if (place.websiteUri) profile.website = place.websiteUri;

  const weekdayLines = place.regularOpeningHours?.weekdayDescriptions;
  if (weekdayLines?.length) profile.openingHours = weekdayLines.join('; ');

  const photoUrls = (place.photos || [])
    .slice(0, 3)
    .map((p) => (p.name ? `https://places.googleapis.com/v1/${p.name}/media?maxWidthPx=1200&key=${apiKey}` : ''))
    .filter(Boolean);
  if (photoUrls.length) profile.coverUrls = photoUrls;

  return profile;
}

export async function importRestaurantFromUrls(
  urls: string[],
  opts?: { searchSnippets?: string[]; extraUrls?: string[]; hintCity?: string }
): Promise<ImportedProfile> {
  const merged = Array.from(
    new Set([...urls, ...(opts?.extraUrls || [])].map((u) => u.trim()).filter(Boolean))
  );
  const list = prioritizeImportUrls(merged).slice(0, 8);
  let profile: ImportedProfile = { sources: list, notes: ['Import a step: Maps → sito → directory → delivery/social'] };
  const state = {
    logoBuf: undefined as Buffer | undefined,
    coverUrls: [] as string[],
    excerpts: [] as string[],
    scrapedHosts: new Set<string>(),
  };

  for (const url of list) {
    try {
      if (isLinkOnlyImportUrl(url)) {
        profile = mergeProfile(profile, socialFromUrl(url));
        profile.notes.push(`${classifyHost(hostOf(url))}: salvato il link`);
        continue;
      }
      if (classifyHost(hostOf(url)) === 'google') {
        try {
          const placeProfile = await fetchGooglePlaceProfile(url);
          if (placeProfile) {
            await mergeParsedPage(profile, { ...placeProfile, notes: placeProfile.notes }, state, url);
            continue;
          }
        } catch (error) {
          profile.notes.push(
            `Google Maps: Places API non disponibile (${error instanceof Error ? error.message : 'errore'}), provo a leggere la pagina`
          );
        }
      }
      const parsed = await parsePage(url, { hintCity: opts?.hintCity });
      await mergeParsedPage(profile, parsed, state, url);
    } catch (error) {
      const meta = profileFromUrlMetadata(url);
      if (meta.name || meta.phone || meta.street || meta.city || meta.instagram || meta.facebook) {
        const { notes: metaNotes, ...fields } = meta;
        profile = mergeProfile(profile, fields);
        if (metaNotes?.length) profile.notes.push(...metaNotes);
      } else {
        profile.notes.push(`${hostOf(url) || url}: ${error instanceof Error ? error.message : 'non letto'}`);
      }
    }
  }

  for (const url of list) {
    const meta = profileFromUrlMetadata(url);
    if (meta.name && !profile.name) profile = mergeProfile(profile, meta);
  }

  const website = profile.website?.split('?')[0];
  if (website && /^https?:\/\//i.test(website) && !state.scrapedHosts.has(hostOf(website))) {
    try {
      const parsed = await parsePage(website, { hintCity: opts?.hintCity });
      await mergeParsedPage(profile, parsed, state, website);
      profile.notes.push('Sito ufficiale: dati aggiornati da pagina web');
    } catch {
      /* sito non raggiungibile */
    }
  }

  if (state.logoBuf) {
    try {
      const color = await brandColorFromImage(state.logoBuf);
      if (color) profile.primaryColor = color;
      const saved = await processBrandImage(state.logoBuf, 'logo');
      profile.logoUrl = saved.url;
      const fit = fitLogoSize(saved.width, saved.height);
      profile.logoWidth = fit.logoWidth;
      profile.logoHeight = fit.logoHeight;
    } catch {
      profile.notes.push('Logo trovato ma non convertito');
    }
  }

  const refined = await refineImportedProfile({
    profile,
    excerpts: state.excerpts,
    coverUrls: state.coverUrls,
    searchSnippets: opts?.searchSnippets,
  });
  profile = refined.profile;
  const coverUrls = refined.coverUrls;

  try {
    profile.coverChoices = await prepareCoverChoices(coverUrls);
  } catch {
    profile.notes.push('Foto per lo sfondo non lette');
  }

  if (profile.description && profile.description.length > 280) {
    profile.description = `${profile.description.slice(0, 277).trim()}…`;
  }

  return profile;
}

export function hasImportableUrls(text: string) {
  return extractUrls(text).length > 0;
}
