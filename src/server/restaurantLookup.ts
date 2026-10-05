import { searchRestaurantWithOpenAI } from './openaiWebSearch';
import { hasOpenAiKey } from './aiClient';
import {
  filterCompleteRestaurantUrls,
  filterUsefulRestaurantUrls,
  isBlockedSearchUrl,
  isCompleteRestaurantUrl,
  isGenericPlatformUrl,
  isUsefulRestaurantUrl,
  isValidAbsoluteUrl,
  restaurantUrlScore,
} from '@/utils/restaurantUrlQuality';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export type SearchCandidate = {
  label: string;
  url: string;
  source: string;
  snippet?: string;
};

export type SearchHit = {
  title: string;
  url: string;
  snippet: string;
  source: string;
};

export type RestaurantSearchResult = {
  name: string;
  location: string;
  urls: string[];
  candidates: SearchCandidate[];
  hits: SearchHit[];
  notes: string[];
  prefill?: Partial<import('./restaurantImport').ImportedProfile>;
};

function hostOf(url: string) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function decodeDdgUrl(href: string) {
  try {
    const u = new URL(href, 'https://duckduckgo.com');
    const uddg = u.searchParams.get('uddg');
    if (uddg) return decodeURIComponent(uddg);
    return href;
  } catch {
    return href;
  }
}

function stripHtml(value: string) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function classifySource(url: string) {
  const host = hostOf(url);
  if (host.includes('tripadvisor')) return 'TripAdvisor';
  if (host.includes('thefork') || host.includes('lafourchette')) return 'TheFork';
  if (host.includes('instagram.com')) return 'Instagram';
  if (host.includes('facebook.com') || host.includes('fb.com')) return 'Facebook';
  if (host.includes('google.') || host.includes('goo.gl') || host.includes('maps.app')) return 'Google Maps';
  if (host.includes('paginegialle.it')) return 'Pagine Gialle';
  if (host.includes('virgilio.it')) return 'Virgilio';
  if (host.includes('glovo')) return 'Glovo';
  if (host.includes('deliveroo')) return 'Deliveroo';
  if (host.includes('justeat') || host.includes('just-eat')) return 'Just Eat';
  return 'Sito web';
}

function isBlockedUrl(url: string) {
  return isBlockedSearchUrl(url);
}

function isRestaurantPlatform(url: string, name = '', location = '') {
  if (isBlockedUrl(url) || isGenericPlatformUrl(url)) return false;
  const lower = url.toLowerCase();
  if (
    /tripadvisor\.|thefork\.|lafourchette\.|paginegialle\.it|virgilio\.it|instagram\.com\/|facebook\.com\/|fb\.com\/|google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps|deliveroo\.|glovoapp\.|justeat\.|just-eat\.|eatbu\.com|\.dish\.co/.test(
      lower
    )
  ) {
    return true;
  }
  if (pathParts(url).length >= 1) return true;
  return isUsefulRestaurantUrl(url, name, location, 10);
}

function pathParts(url: string) {
  try {
    return new URL(url).pathname.split('/').filter(Boolean);
  } catch {
    return [];
  }
}

function scoreUrl(url: string, name: string, location: string) {
  return restaurantUrlScore(url, name, location);
}

export function parseNameLocation(text: string): { name: string; location: string } {
  const raw = String(text || '').trim();
  if (!raw) return { name: '', location: '' };

  const comma = raw.match(/^(.+?)\s*,\s*(.+)$/);
  if (comma) {
    return { name: comma[1].trim(), location: comma[2].trim() };
  }

  const prep = raw.match(/^(.+?)\s+(?:a|in|di)\s+(.+)$/i);
  if (prep && prep[2].split(/\s+/).length <= 4) {
    return { name: prep[1].trim(), location: prep[2].trim() };
  }

  const parts = raw.split(/\s+/);
  if (parts.length >= 3) {
    const location = parts.slice(-2).join(' ');
    const name = parts.slice(0, -2).join(' ');
    if (name.length >= 2) return { name, location };
  }
  if (parts.length >= 2) {
    return { name: parts.slice(0, -1).join(' '), location: parts[parts.length - 1] };
  }

  return { name: raw, location: '' };
}

async function braveSearch(
  query: string,
  name = '',
  location = ''
): Promise<Array<{ title: string; url: string; snippet: string }>> {
  const res = await fetch(`https://search.brave.com/search?q=${encodeURIComponent(query)}`, {
    redirect: 'follow',
    signal: AbortSignal.timeout(16000),
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
    },
  });
  if (!res.ok) throw new Error(`Ricerca web non disponibile (${res.status})`);
  const html = await res.text();
  const results: Array<{ title: string; url: string; snippet: string }> = [];
  const seen = new Set<string>();

  const hrefRe = /href="(https?:\/\/[^"#]+)"/gi;
  let hrefMatch: RegExpExecArray | null;
  while ((hrefMatch = hrefRe.exec(html)) && results.length < 8) {
    const url = hrefMatch[1].replace(/&amp;/g, '&');
    if (seen.has(url)) continue;
    seen.add(url);
    if (isBlockedUrl(url) || !isRestaurantPlatform(url, name, location)) continue;
    if (/instagram\.com\/(reel|p|explore|stories)\//.test(url)) continue;
    if (/tripadvisor/.test(url) && /ShowUserReviews|LocationPhotoDirectLink|Hotel_Review|Attraction_Review/.test(url)) continue;

    const idx = hrefMatch.index || 0;
    const window = html.slice(Math.max(0, idx - 120), idx + 420);
    const titleMatch = window.match(/>([^<]{8,120})<\/a>/i);
    const snippetMatch = window.match(/class="[^"]*snippet[^"]*"[^>]*>([\s\S]{0,220}?)<\//i);
    results.push({
      url,
      title: titleMatch ? stripHtml(titleMatch[1]) : classifySource(url),
      snippet: snippetMatch ? stripHtml(snippetMatch[1]) : '',
    });
  }

  return results;
}

async function duckDuckGoSearch(query: string): Promise<Array<{ title: string; url: string; snippet: string }>> {
  const res = await fetch('https://html.duckduckgo.com/html/', {
    method: 'POST',
    redirect: 'follow',
    signal: AbortSignal.timeout(14000),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
    },
    body: new URLSearchParams({ q: query, kl: 'it-it' }).toString(),
  });
  if (!res.ok && res.status !== 202) throw new Error(`Ricerca web non disponibile (${res.status})`);
  const html = await res.text();
  const results: Array<{ title: string; url: string; snippet: string }> = [];
  const linkRe =
    /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = linkRe.exec(html)) && results.length < 8) {
    const url = decodeDdgUrl(match[1]);
    const title = stripHtml(match[2]);
    if (!url.startsWith('http') || !title) continue;
    const snippetMatch = html
      .slice(match.index, match.index + 900)
      .match(/class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\//i);
    results.push({
      title,
      url,
      snippet: snippetMatch ? stripHtml(snippetMatch[1]) : '',
    });
  }
  return results;
}

async function webSearch(query: string, name = '', location = '') {
  try {
    const brave = await braveSearch(query, name, location);
    if (brave.length) return brave;
  } catch {
    /* fallback */
  }
  return duckDuckGoSearch(query);
}

function candidateLabel(item: { title: string; url: string; snippet?: string }, source: string) {
  const bits = [item.title];
  if (item.snippet) bits.push(item.snippet.slice(0, 80));
  return `${source} — ${bits.join(' · ').slice(0, 120)}`;
}

export async function findRestaurantOnline(name: string, location: string): Promise<RestaurantSearchResult> {
  const notes: string[] = [];

  if (hasOpenAiKey()) {
    try {
      const ai = await searchRestaurantWithOpenAI(name, location);
      if (ai && ai.urls.length) {
        const urls = prioritizeLookupUrls(filterCompleteRestaurantUrls(ai.urls, name, location));
        if (urls.length) {
          const candidates = buildCandidatesFromUrls(urls, ai.profile, name, location);
          return {
            name,
            location,
            urls,
            candidates,
            hits: ai.hits,
            notes: [...ai.notes, ...notes],
            prefill: ai.profile,
          };
        }
      }
      notes.push('OpenAI: nessun URL verificato');
    } catch (error) {
      notes.push(`OpenAI: ${error instanceof Error ? error.message : 'ricerca non disponibile'}`);
    }
  }

  const locBit = location ? ` ${location}` : '';
  const queries = [
    `"${name}"${locBit} paginegialle`,
    `"${name}"${locBit} tripadvisor`,
    `"${name}"${locBit} thefork`,
    `"${name}"${locBit} instagram`,
    `"${name}"${locBit} facebook`,
    `"${name}"${locBit} google maps`,
    `${name}${locBit} bar caffè`,
  ];

  const seen = new Set<string>();
  const ranked: Array<{ title: string; url: string; snippet: string; score: number; source: string }> = [];

  for (const query of queries) {
    try {
      const rows = await webSearch(query, name, location);
      for (const row of rows) {
        const url = row.url.split('#')[0];
        if (seen.has(url)) continue;
        seen.add(url);
        const score = scoreUrl(url, name, location);
        if (score < 15) continue;
        ranked.push({
          ...row,
          url,
          score,
          source: classifySource(url),
        });
      }
      notes.push(`Ricerca: ${query}`);
    } catch (error) {
      notes.push(
        `${query}: ${error instanceof Error ? error.message : 'non disponibile'}`
      );
    }
  }

  ranked.sort((a, b) => b.score - a.score);

  const urls = prioritizeLookupUrls(filterCompleteRestaurantUrls(ranked.map((row) => row.url), name, location)).slice(0, 8);
  const primaryKinds = new Set<string>();
  const candidates: SearchCandidate[] = [];
  const hits: SearchHit[] = ranked
    .filter((row) => isCompleteRestaurantUrl(row.url, name, location))
    .slice(0, 12)
    .map((row) => ({
      title: row.title,
      url: row.url,
      snippet: row.snippet,
      source: row.source,
    }));

  for (const row of ranked) {
    if (candidates.length >= 5) break;
    if (!isCompleteRestaurantUrl(row.url, name, location)) continue;
    const key = row.source === 'Sito web' ? hostOf(row.url) : row.source;
    if (primaryKinds.has(key)) continue;
    primaryKinds.add(key);
    candidates.push({
      label: candidateLabelForUrl(row.url, name || row.title),
      url: row.url,
      source: row.source,
      snippet: row.snippet,
    });
  }

  return {
    name,
    location,
    urls,
    candidates,
    hits,
    notes,
  };
}

function candidateLabelForUrl(url: string, name?: string) {
  const source = classifySource(url);
  const host = hostOf(url).replace(/^www\./, '');
  const title = String(name || '').trim();
  return title ? `${source} — ${title} · ${host}`.slice(0, 100) : `${source} — ${host}`.slice(0, 100);
}

function buildCandidatesFromUrls(
  urls: string[],
  profile?: Partial<import('./restaurantImport').ImportedProfile>,
  name?: string,
  location?: string
): SearchCandidate[] {
  const seen = new Set<string>();
  const seenKeys = new Set<string>();
  const out: SearchCandidate[] = [];
  const filtered = name
    ? filterCompleteRestaurantUrls(urls, name, location || '')
    : urls.map((url) => url.split('#')[0]).filter((url) => isValidAbsoluteUrl(url));
  for (const url of filtered) {
    const clean = url.split('#')[0];
    if (!clean || seen.has(clean)) continue;
    const source = classifySource(clean);
    const key = source === 'Sito web' ? hostOf(clean) : source;
    if (seenKeys.has(key)) continue;
    seen.add(clean);
    seenKeys.add(key);
    out.push({
      label: candidateLabelForUrl(clean, profile?.name || name),
      url: clean,
      source,
    });
  }
  return out;
}

/** Chiedi di scegliere solo se ci sono almeno 2 profili completi e distinti. */
export function shouldOfferSearchPick(found: RestaurantSearchResult) {
  if (found.prefill?.name) return false;
  const unique = buildCandidatesFromUrls(found.urls, found.prefill, found.name, found.location);
  return unique.length >= 2;
}

function prioritizeLookupUrls(urls: string[]) {
  const stage = (u: string) => {
    if (/google\.[a-z.]+\/maps|maps\.app\.goo\.gl/.test(u)) return 10;
    if (/eatbu\.com|\.dish\.co/.test(u)) return 20;
    if (/paginegialle\.it|virgilio\.it/.test(u)) return 30;
    if (/thefork\.|lafourchette\./.test(u)) return 35;
    if (/tripadvisor/.test(u)) return 36;
    if (/instagram\.com\//.test(u)) return 50;
    if (/facebook\.com\/|fb\.com\//.test(u)) return 51;
    if (/deliveroo\.|glovoapp\.|justeat|just-eat/.test(u)) return 60;
    return 25;
  };
  return Array.from(new Set(urls)).sort((a, b) => stage(a) - stage(b));
}

export function formatSearchPick(candidates: SearchCandidate[]) {
  const lines = candidates.map((item, index) => `${index + 1}. ${item.label}\n${item.url}`);
  return [
    'Ho trovato più profili online. Quale è il tuo locale?',
    '',
    ...lines,
    '',
    'Rispondi con il *numero* giusto.',
  ].join('\n');
}
