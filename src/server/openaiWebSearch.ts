import { extractJson, hasOpenAiKey } from './aiClient';
import { verifyPublicUrl } from './menuOnlineSearch';
import { usableDeliveryUrl, usableProfileUrl } from '@/utils/socialLinks';
import { filterCompleteRestaurantUrls, filterUsefulRestaurantUrls, isGenericPlatformUrl, isUsefulRestaurantUrl } from '@/utils/restaurantUrlQuality';
import { loadIntegrations } from './integrations';
import type { ImportedProfile } from './restaurantImport';
import type { SearchHit } from './restaurantLookup';

export type OpenAISearchResult = {
  profile: Partial<ImportedProfile>;
  urls: string[];
  hits: SearchHit[];
  notes: string[];
};

export type SearchPipelineStep = 'google_maps' | 'website' | 'delivery' | 'social' | 'directories';

type StepJson = {
  google_maps_url?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  glovo?: string;
  deliveroo?: string;
  justeat?: string;
  tripadvisor_url?: string;
  thefork_url?: string;
  paginegialle_url?: string;
  sources?: Array<string | { url?: string; type?: string }>;
};

type UrlBucket = {
  google?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  glovo?: string;
  deliveroo?: string;
  justeat?: string;
  directories: string[];
  other: string[];
};

const STEP_LABELS: Record<SearchPipelineStep, string> = {
  google_maps: 'Google Maps',
  website: 'sito ufficiale',
  delivery: 'delivery (Just Eat / Deliveroo / Glovo)',
  social: 'social (Instagram / Facebook)',
  directories: 'directory (TripAdvisor / TheFork / Pagine Gialle)',
};

function stripCodeFence(text: string) {
  const fenced = String(text || '').match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced ? fenced[1] : text).trim();
}

function normalizeToken(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function nameTokens(name: string) {
  return name
    .split(/\s+/)
    .map((t) => normalizeToken(t))
    .filter((t) => t.length > 2);
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function urlLooksLikeRestaurant(url: string, name: string, location: string) {
  return isUsefulRestaurantUrl(url, name, location, 12);
}

function responseText(data: any) {
  const chunks: string[] = [];
  for (const item of data?.output || []) {
    if (item?.type !== 'message') continue;
    for (const part of item.content || []) {
      if (part?.type === 'output_text' && part.text) chunks.push(part.text);
    }
  }
  return chunks.join('\n').trim();
}

function citationHits(data: any, fallbackTitle: string): SearchHit[] {
  const hits: SearchHit[] = [];
  for (const item of data?.output || []) {
    if (item?.type !== 'message') continue;
    for (const part of item.content || []) {
      for (const ann of part?.annotations || []) {
        if (ann?.type === 'url_citation' && ann.url) {
          hits.push({
            title: ann.title || fallbackTitle,
            url: ann.url,
            snippet: '',
            source: 'OpenAI',
          });
        }
      }
    }
  }
  return hits;
}

function urlsFromStepJson(raw: StepJson, text: string, citationUrls: string[]): string[] {
  const fromJson: string[] = [];
  if (Array.isArray(raw?.sources)) {
    for (const item of raw.sources) {
      if (typeof item === 'string' && /^https?:\/\//i.test(item)) fromJson.push(item);
      else if (item && typeof item === 'object' && typeof item.url === 'string' && /^https?:\/\//i.test(item.url)) {
        fromJson.push(item.url);
      }
    }
  }
  const singles = [
    raw?.google_maps_url,
    raw?.website,
    raw?.tripadvisor_url,
    raw?.thefork_url,
    raw?.paginegialle_url,
    raw?.instagram,
    raw?.facebook,
    raw?.glovo,
    raw?.deliveroo,
    raw?.justeat,
  ].filter((u) => typeof u === 'string' && /^https?:\/\//i.test(u)) as string[];

  const fromText: string[] = [];
  const urlRe = /https?:\/\/[^\s)\]"']+/gi;
  let urlMatch: RegExpExecArray | null;
  while ((urlMatch = urlRe.exec(String(text || '')))) {
    fromText.push(urlMatch[0].replace(/[.,;:!?]+$/, ''));
  }

  return Array.from(new Set([...citationUrls, ...fromJson, ...singles, ...fromText]));
}

async function verifyUrls(urls: string[]) {
  const out: string[] = [];
  const notes: string[] = [];
  await Promise.all(
    urls.map(async (url) => {
      const clean = url.split('#')[0];
      if (await verifyPublicUrl(clean)) out.push(clean);
      else notes.push(`URL non raggiungibile, scartato: ${clean}`);
    })
  );
  return { urls: Array.from(new Set(out)), notes };
}

function classifyUrl(url: string): keyof UrlBucket | 'other' {
  const lower = url.toLowerCase();
  if (/google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps/.test(lower)) return 'google';
  if (/instagram\.com/.test(lower)) return 'instagram';
  if (/facebook\.com|fb\.com/.test(lower)) return 'facebook';
  if (/glovoapp|glovo/.test(lower)) return 'glovo';
  if (/deliveroo/.test(lower)) return 'deliveroo';
  if (/justeat|just-eat/.test(lower)) return 'justeat';
  if (/tripadvisor|thefork|lafourchette|paginegialle|virgilio/.test(lower)) return 'directories';
  if (/google\.|maps\.|gstatic/.test(lower)) return 'other';
  return 'website';
}

const DELIVERY_KINDS = new Set(['glovo', 'deliveroo', 'justeat']);

/**
 * I link di consegna (Glovo/Deliveroo/Just Eat) sono facili da "indovinare" per pattern
 * (nome locale + città) restando plausibili ma inesistenti — e Cloudflare blocca allo
 * stesso identico modo sia le pagine vere sia quelle inventate, quindi verifyUrls() non
 * riesce a distinguerle (verificato: risposta byte-per-byte identica per un link reale e
 * uno fasullo). Li accettiamo quindi solo se il modello li ha davvero citati da una
 * ricerca reale (citationSet), non se compaiono solo nel suo testo libero o nei campi
 * JSON che può aver compilato per pattern senza averli trovati per davvero.
 */
function bucketUrls(urls: string[], citationSet?: Set<string>): UrlBucket {
  const bucket: UrlBucket = { directories: [], other: [] };
  for (const raw of urls) {
    const url = raw.split('#')[0];
    if (isGenericPlatformUrl(url)) continue;
    const kind = classifyUrl(url);
    if (citationSet && DELIVERY_KINDS.has(kind) && !citationSet.has(url)) continue;
    if (kind === 'directories') bucket.directories.push(url);
    else if (kind === 'other') bucket.other.push(url);
    else if (!(bucket as any)[kind]) (bucket as any)[kind] = url;
  }
  return bucket;
}

function allBucketUrls(bucket: UrlBucket) {
  return [
    bucket.google,
    bucket.website,
    bucket.instagram,
    bucket.facebook,
    bucket.glovo,
    bucket.deliveroo,
    bucket.justeat,
    ...bucket.directories,
    ...bucket.other,
  ].filter(Boolean) as string[];
}

function missingSteps(bucket: UrlBucket): SearchPipelineStep[] {
  const steps: SearchPipelineStep[] = [];
  if (!bucket.google) steps.push('google_maps');
  if (!bucket.website) steps.push('website');
  if (!bucket.glovo && !bucket.deliveroo && !bucket.justeat) steps.push('delivery');
  if (!bucket.instagram && !bucket.facebook) steps.push('social');
  if (bucket.directories.length === 0 && allBucketUrls(bucket).length < 3) steps.push('directories');
  return steps;
}

function profileFromBucket(bucket: UrlBucket): Partial<ImportedProfile> {
  const profile: Partial<ImportedProfile> = {};
  if (bucket.website) profile.website = bucket.website;
  if (bucket.instagram) profile.instagram = usableProfileUrl(bucket.instagram, 'instagram') || bucket.instagram;
  if (bucket.facebook) profile.facebook = usableProfileUrl(bucket.facebook, 'facebook') || bucket.facebook;
  if (bucket.glovo) profile.glovo = usableDeliveryUrl(bucket.glovo, 'glovo') || undefined;
  if (bucket.deliveroo) profile.deliveroo = usableDeliveryUrl(bucket.deliveroo, 'deliveroo') || undefined;
  if (bucket.justeat) profile.justeat = usableDeliveryUrl(bucket.justeat, 'justeat') || undefined;
  return profile;
}

function mergeBuckets(base: UrlBucket, extra: UrlBucket): UrlBucket {
  const out = { ...base, directories: [...base.directories] };
  for (const key of ['google', 'website', 'instagram', 'facebook', 'glovo', 'deliveroo', 'justeat'] as const) {
    if (!(out as any)[key] && (extra as any)[key]) (out as any)[key] = (extra as any)[key];
  }
  for (const url of extra.directories) {
    if (!out.directories.includes(url)) out.directories.push(url);
  }
  for (const url of extra.other) {
    if (!out.other.includes(url)) out.other.push(url);
  }
  return out;
}

function mergeHits(base: SearchHit[], extra: SearchHit[]) {
  const seen = new Set(base.map((h) => h.url.split('#')[0]));
  const out = [...base];
  for (const hit of extra) {
    const clean = hit.url.split('#')[0];
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    out.push(hit);
  }
  return out;
}

async function callOpenAIWebSearch(prompt: string, fallbackTitle: string, timeoutMs = 45000) {
  const cfg = loadIntegrations();
  const model = cfg.openai.model || 'gpt-4o-mini';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs - 1000);
  try {
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${cfg.openai.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        tools: [{ type: 'web_search_preview' }],
        input: prompt,
      }),
    });
    const body = await res.text();
    let data: any = null;
    try {
      data = body ? JSON.parse(body) : null;
    } catch {
      data = null;
    }
    if (!res.ok) {
      throw new Error(data?.error?.message || body.slice(0, 200) || `HTTP ${res.status}`);
    }
    const text = responseText(data);
    if (!text) return null;
    let parsed: StepJson = {};
    try {
      parsed = extractJson(stripCodeFence(text));
    } catch {
      parsed = {};
    }
    const hits = citationHits(data, fallbackTitle);
    const citationUrls = hits.map((h) => h.url);
    const urls = urlsFromStepJson(parsed, text, citationUrls);
    return { parsed, hits, urls, text };
  } finally {
    clearTimeout(timer);
  }
}

function stepPrompt(step: SearchPipelineStep, name: string, location: string, bucket: UrlBucket) {
  const place = location ? `${name} a ${location}` : name;
  const known = allBucketUrls(bucket);
  const knownBlock = known.length ? known.join('\n') : '(nessuno)';
  const antiHallucination = `
IMPORTANTE — anti-allucinazione:
- NON inventare MAI URL, telefoni, email, indirizzi o orari.
- Inserisci un URL SOLO se l'hai trovato nella ricerca web reale.
- phone, email, street, city, postalCode, openingHours, description: lasciali SEMPRE fuori dal JSON (non servono).`;

  if (step === 'google_maps') {
    return `STEP 1 — Scheda Google Maps del locale "${place}" (Italia).

Cerca la scheda Google Maps / Google Business ufficiale di questo locale.
Dalla scheda Google estrai SOLO i link visibili: sito web, ordina online, Just Eat, Deliveroo, Glovo, Instagram, Facebook.

${antiHallucination}

Restituisci SOLO JSON valido:
{
  "google_maps_url": "",
  "website": "",
  "instagram": "",
  "facebook": "",
  "glovo": "",
  "deliveroo": "",
  "justeat": "",
  "sources": [{ "url": "https://...", "type": "maps|website|instagram|facebook|deliveroo|glovo|justeat" }]
}

Regole:
- google_maps_url: link diretto alla scheda Maps del locale (maps.google.com o maps.app.goo.gl).
- Gli altri campi solo se compaiono sulla scheda Google o nel pannello "Ordina online".
- sources: URL reali visitati (max 6).`;
  }

  if (step === 'website') {
    return `STEP 2 — Sito ufficiale del locale "${place}" (Italia).

Link già noti:
${knownBlock}

Trova il sito web ufficiale del ristorante (non portali aggregatori).
Se già presente sopra, verifica che sia corretto; altrimenti cercalo.

${antiHallucination}

Restituisci SOLO JSON valido:
{
  "website": "",
  "sources": [{ "url": "https://...", "type": "website" }]
}`;
  }

  if (step === 'delivery') {
    return `STEP 3 — Delivery del locale "${place}" (Italia).

Link già noti:
${knownBlock}

Cerca le pagine Just Eat, Deliveroo e/o Glovo di questo ristorante specifico.
Solo pagine ristorante con slug/nome del locale — MAI homepage generiche.

${antiHallucination}

Restituisci SOLO JSON valido:
{
  "glovo": "",
  "deliveroo": "",
  "justeat": "",
  "sources": [{ "url": "https://...", "type": "glovo|deliveroo|justeat" }]
}`;
  }

  if (step === 'social') {
    return `STEP 4 — Social del locale "${place}" (Italia).

Link già noti:
${knownBlock}

Trova Instagram e/o Facebook ufficiali del ristorante (profilo/pagina del locale, non post generici).

${antiHallucination}

Restituisci SOLO JSON valido:
{
  "instagram": "",
  "facebook": "",
  "sources": [{ "url": "https://...", "type": "instagram|facebook" }]
}`;
  }

  return `STEP 5 — Directory e recensioni del locale "${place}" (Italia).

Link già noti:
${knownBlock}

Cerca TripAdvisor, TheFork e/o Pagine Gialle di questo ristorante.

${antiHallucination}

Restituisci SOLO JSON valido:
{
  "tripadvisor_url": "",
  "thefork_url": "",
  "paginegialle_url": "",
  "sources": [{ "url": "https://...", "type": "tripadvisor|thefork|paginegialle" }]
}`;
}

async function runSearchStep(
  step: SearchPipelineStep,
  name: string,
  location: string,
  bucket: UrlBucket
): Promise<{ bucket: UrlBucket; hits: SearchHit[]; notes: string[] } | null> {
  const place = location ? `${name} a ${location}` : name;
  const raw = await callOpenAIWebSearch(stepPrompt(step, name, location, bucket), place);
  if (!raw) return null;

  const filtered = raw.urls.filter((u) => urlLooksLikeRestaurant(u, name, location));
  const { urls: verified, notes: verifyNotes } = await verifyUrls(filtered);
  if (!verified.length) {
    return {
      bucket,
      hits: raw.hits,
      notes: [`Step ${STEP_LABELS[step]}: nessun URL verificato`, ...verifyNotes],
    };
  }

  const citationSet = new Set(raw.hits.map((h) => h.url.split('#')[0]));
  const nextBucket = mergeBuckets(bucket, bucketUrls(verified, citationSet));
  return {
    bucket: nextBucket,
    hits: raw.hits,
    notes: [`Step ${STEP_LABELS[step]}: ${verified.length} link`, ...verifyNotes],
  };
}

export async function sanitizeOpenAISearchResult(
  name: string,
  location: string,
  raw: {
    profile: Partial<ImportedProfile>;
    urls: string[];
    hits: SearchHit[];
    notes: string[];
  }
): Promise<OpenAISearchResult | null> {
  const citationUrls = raw.hits.map((h) => h.url).filter(Boolean);
  const candidateUrls = raw.urls.filter((u) => urlLooksLikeRestaurant(u, name, location));
  const merged = Array.from(new Set([...citationUrls, ...candidateUrls])).slice(0, 12);
  const { urls: verified, notes: verifyNotes } = await verifyUrls(merged);

  const notes = [...raw.notes, ...verifyNotes];
  if (!verified.length) {
    notes.push('OpenAI: nessun URL verificato — uso ricerca alternativa');
    return null;
  }

  const citationSet = new Set(citationUrls.map((u) => u.split('#')[0]));
  const bucket = bucketUrls(verified, citationSet);
  return {
    profile: profileFromBucket(bucket),
    urls: allBucketUrls(bucket),
    hits: raw.hits.filter((h) => verified.includes(h.url.split('#')[0])),
    notes,
  };
}

export async function searchRestaurantWithOpenAI(
  name: string,
  location: string
): Promise<OpenAISearchResult | null> {
  if (!hasOpenAiKey()) return null;

  const place = location ? `${name} a ${location}` : name;
  let bucket: UrlBucket = { directories: [], other: [] };
  let hits: SearchHit[] = [];
  const notes: string[] = [`Ricerca a step: ${place}`];

  const pipeline: SearchPipelineStep[] = ['google_maps', 'website', 'delivery', 'social', 'directories'];

  for (const step of pipeline) {
    const stillNeeded = missingSteps(bucket);
    if (!stillNeeded.includes(step) && step !== 'google_maps') continue;
    if (step !== 'google_maps' && allBucketUrls(bucket).length >= 6 && step === 'directories') break;

    try {
      const result = await runSearchStep(step, name, location, bucket);
      if (!result) {
        notes.push(`Step ${STEP_LABELS[step]}: nessuna risposta`);
        continue;
      }
      bucket = result.bucket;
      hits = mergeHits(hits, result.hits);
      notes.push(...result.notes);

      if (step === 'google_maps' && bucket.google && bucket.website && (bucket.justeat || bucket.deliveroo || bucket.glovo)) {
        notes.push('Step Google Maps: dati principali trovati, passo ai successivi se servono');
      }
    } catch (error) {
      notes.push(`Step ${STEP_LABELS[step]}: ${error instanceof Error ? error.message : 'errore'}`);
    }
  }

  const urls = filterCompleteRestaurantUrls(allBucketUrls(bucket), name, location);
  if (!urls.length) return null;

  return {
    profile: profileFromBucket(bucket),
    urls,
    hits: hits.filter((hit) => urls.includes(hit.url.split('#')[0])),
    notes,
  };
}
