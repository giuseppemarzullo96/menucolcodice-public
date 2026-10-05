export const MARKETING_ORIGIN = 'https://menucolcodice.it';
export const DEMO_ORIGIN = 'https://demo.menucolcodice.it';
export const SITE_NAME = 'Menu col codice';
export const THEME_COLOR = '#1A1A17';
export const BACKGROUND_COLOR = '#FAF7F0';
export const DEFAULT_OG_PATH = '/og-image.png';
export const DEFAULT_OG_IMAGE = `${MARKETING_ORIGIN}${DEFAULT_OG_PATH}`;
export const DEFAULT_OG_ALT = 'Menu col codice — il menu digitale del tuo locale';
export const LOGO_URL = `${MARKETING_ORIGIN}/icon-512.png`;
export const MCC_MENU_LOGO = '/brand/logo-orizzontale-negativo-colore.svg';
export const MCC_MENU_FAVICON = '/favicon.svg';
export const MCC_MENU_BACKGROUND = '/brand/menu-sfondo.svg';
export const MCC_MENU_SHARE = '/og-image.svg';

export function hostnameFromHeader(hostHeader?: string | string[] | null) {
  const raw = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader || '';
  return raw.split(':')[0].toLowerCase().trim();
}

export function publicOrigin(hostHeader?: string | string[] | null) {
  const host = hostnameFromHeader(hostHeader);
  if (!host || host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) {
    return MARKETING_ORIGIN;
  }
  const protocol = host.startsWith('localhost') || /^\d+\.\d+\.\d+\.\d+$/.test(host) ? 'http' : 'https';
  return `${protocol}://${host}`;
}

export function absoluteUrl(origin: string, path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (normalized === '/') return `${origin}/`;
  return `${origin}${normalized}`;
}

export function clipTitle(title: string, max = 60) {
  const clean = String(title || '').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export function escapeXml(value: string) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
