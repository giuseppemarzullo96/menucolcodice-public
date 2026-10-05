import { usableDeliveryUrl, usableProfileUrl } from './socialLinks';

function hostOf(url: string) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function pathParts(url: string) {
  try {
    return new URL(url).pathname.split('/').filter(Boolean);
  } catch {
    return [];
  }
}

function normalizeToken(value: string) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function nameTokens(name: string) {
  return name
    .split(/\s+/)
    .map((token) => normalizeToken(token))
    .filter((token) => token.length > 2);
}

function urlHasNameHint(url: string, name: string) {
  const compact = url.toLowerCase().replace(/[^a-z0-9àèéìòù]/gi, '');
  const tokens = nameTokens(name);
  if (!tokens.length) return false;
  return tokens.some((token) => compact.includes(token));
}

function urlHasLocationHint(url: string, location: string) {
  const locToken = normalizeToken(location.split(/\s+/)[0] || '');
  if (locToken.length < 3) return false;
  return url.toLowerCase().replace(/[^a-z0-9àèéìòù]/gi, '').includes(locToken);
}

export function isBlockedSearchUrl(url: string) {
  const lower = url.toLowerCase();
  return (
    /youtube\.|youtu\.be|wikipedia\.|linkedin\.|pinterest\.|tiktok\.|twitter\.|indeed\.|glassdoor\.|amazon\.|ebay\.|reddit\.|news\.|corriere\.|repubblica\.|fanpage\.|google\.com\/search|bing\.com\/search|duckduckgo\.com/.test(
      lower
    ) ||
    /\/jobs\/|\/careers\/|\/vacancies\//.test(lower)
  );
}

export function isGenericPlatformUrl(url: string) {
  const lower = url.toLowerCase();
  let parsed: URL | null = null;
  try {
    parsed = new URL(url);
  } catch {
    return true;
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const parts = parsed.pathname.split('/').filter(Boolean);
  const qs = parsed.searchParams;
  const platformRoot =
    /^(maps\.google\.|google\.|justeat|just-eat|deliveroo|glovoapp|glovo|tripadvisor|thefork|lafourchette|facebook|instagram|paginegialle|virgilio)/;

  if (!parts.length && !qs.toString()) return platformRoot.test(host);

  if (/^maps\.google\.|google\.[a-z.]+\/maps/.test(host + parsed.pathname)) {
    if (/\/maps\/place\/|\/place\/|!1s|!3d|\/data=|\/maps\?cid=|\/maps\?ftid=/.test(lower)) return false;
    if (/^maps\.app\.goo\.gl$/.test(host)) return false;
    return true;
  }

  if (/^maps\.app\.goo\.gl$/.test(host)) return false;
  if (/^goo\.gl$/.test(host) && /\/maps/.test(parsed.pathname)) return false;

  if (/justeat|just-eat/.test(host)) {
    if (parts.length === 0) return true;
    if (parts.length === 1 && /^restaurants?$/i.test(parts[0])) return true;
    if (parts.length === 1 && /^it$/i.test(parts[0])) return true;
    return false;
  }

  if (/deliveroo/.test(host)) {
    if (parts.length === 0) return true;
    if (parts.length === 1 && /^(it|en|es|fr)$/i.test(parts[0])) return true;
    return false;
  }

  if (/glovoapp|glovo/.test(host)) {
    if (parts.length === 0) return true;
    if (parts.length <= 2 && parts.every((part) => /^(it|en|es|fr|de|pt)$/i.test(part))) return true;
    return false;
  }

  if (/tripadvisor/.test(host) && !/restaurant_review|restaurant_highlight|restaurantsnear|showuserreviews|restaurant_review-g/i.test(lower)) {
    return true;
  }

  if (/thefork|lafourchette/.test(host) && parts.length < 2) return true;

  if (/paginegialle|virgilio/.test(host) && parts.length < 2) return true;

  if (/facebook\.com|fb\.com/.test(host) && (parts.length < 1 || /^(login|home|watch|marketplace|pages|groups|share|sharer)/i.test(parts[0]))) {
    return true;
  }

  if (/instagram\.com/.test(host) && (parts.length < 1 || /^(explore|reel|p|stories|accounts|direct)/i.test(parts[0]))) {
    return true;
  }

  if (parts.length <= 1 && /^(it|en|es|fr|de|pt)$/i.test(parts[0] || '')) return true;

  return false;
}

export function restaurantUrlScore(url: string, name: string, location: string) {
  if (!url || isBlockedSearchUrl(url) || isGenericPlatformUrl(url)) return -100;

  let score = 0;
  const lower = url.toLowerCase();
  const host = hostOf(url);
  const parts = pathParts(url);
  const tokens = nameTokens(name);

  if (/tripadvisor\./.test(lower)) score += 42;
  if (/Restaurant_Review/.test(lower)) score += 12;
  if (/paginegialle\.it/.test(lower)) score += 45;
  if (/virgilio\.it/.test(lower)) score += 38;
  if (/thefork\.|lafourchette\./.test(lower)) score += 40;
  if (/google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps/.test(lower)) score += 38;
  if (/instagram\.com\//.test(lower)) score += 28;
  if (/facebook\.com\/|fb\.com\//.test(lower)) score += 24;
  if (/deliveroo\.|glovoapp\.|justeat\.|just-eat\./.test(lower)) score += 18;
  if (/eatbu\.com|\.dish\.co/.test(lower)) score += 26;

  const nameHit = urlHasNameHint(url, name);
  const locHit = location ? urlHasLocationHint(url, location) : false;

  if (nameHit) score += 24;
  if (locHit) score += 14;

  for (const token of tokens) {
    if (host.replace(/[^a-z0-9]/gi, '').includes(token)) score += 16;
    if (parts.some((part) => normalizeToken(part).includes(token))) score += 10;
  }

  if (/^maps\.google\.|google\.[a-z.]+\/maps|maps\.app\.goo\.gl/.test(lower) && !nameHit && !locHit) score -= 35;
  if (/justeat|just-eat|deliveroo|glovo/.test(lower) && !nameHit && parts.length < 3) score -= 30;
  if (!/tripadvisor|thefork|lafourchette|paginegialle|virgilio|google\.|maps\.|instagram|facebook|deliveroo|glovo|justeat|just-eat|eatbu|dish\.co/.test(lower)) {
    if (!nameHit && !locHit) score -= 25;
    else score += 8;
  }

  if (/\/(home|privacy|cookie|login|cart|shop|blog|news|articoli|magazine)\b/.test(lower)) score -= 20;
  if (/tuttiaffari|yelp\.|foursquare|booking\.com|airbnb/.test(lower)) score -= 15;

  return score;
}

export function isUsefulRestaurantUrl(url: string, name: string, location: string, minScore = 15) {
  return restaurantUrlScore(url, name, location) >= minScore;
}

export function filterUsefulRestaurantUrls(urls: string[], name: string, location: string, minScore = 15) {
  const seen = new Set<string>();
  return urls
    .map((url) => url.split('#')[0])
    .filter((url) => {
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return isUsefulRestaurantUrl(url, name, location, minScore);
    });
}

export function isValidAbsoluteUrl(url: string) {
  try {
    const parsed = new URL(url);
    return /^https?:$/i.test(parsed.protocol) && parsed.hostname.includes('.');
  } catch {
    return false;
  }
}

export function isCompleteRestaurantUrl(url: string, name: string, location: string) {
  if (!isValidAbsoluteUrl(url)) return false;
  if (!isUsefulRestaurantUrl(url, name, location, 18)) return false;

  const lower = url.toLowerCase();

  if (/google\.[a-z.]+\/maps|maps\.google/.test(lower)) {
    return /\/maps\/place\/|\/place\/[^/]+|!1s|!3d|\/data=|\/maps\?cid=|\/maps\?ftid=|maps\.app\.goo\.gl|goo\.gl\/maps/.test(
      lower
    );
  }

  if (/justeat|just-eat/.test(lower)) return Boolean(usableDeliveryUrl(url, 'justeat'));

  if (/glovoapp|glovo/.test(lower)) return Boolean(usableDeliveryUrl(url, 'glovo'));

  if (/deliveroo/.test(lower)) return Boolean(usableDeliveryUrl(url, 'deliveroo'));

  if (/instagram\.com/.test(lower)) return Boolean(usableProfileUrl(url, 'instagram'));

  if (/facebook\.com|fb\.com/.test(lower)) return Boolean(usableProfileUrl(url, 'facebook'));

  if (/tripadvisor/.test(lower)) return /restaurant_review/i.test(lower);
  if (/thefork|lafourchette/.test(lower)) return pathParts(url).length >= 2;
  if (/paginegialle|virgilio/.test(lower)) return pathParts(url).length >= 2;

  return urlHasNameHint(url, name) || urlHasLocationHint(url, location);
}

export function filterCompleteRestaurantUrls(urls: string[], name: string, location: string) {
  const seen = new Set<string>();
  return urls
    .map((url) => url.split('#')[0].trim())
    .filter((url) => {
      if (!url || seen.has(url)) return false;
      if (!isCompleteRestaurantUrl(url, name, location)) return false;
      seen.add(url);
      return true;
    });
}
