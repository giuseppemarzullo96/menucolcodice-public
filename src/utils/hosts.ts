export function hostnameFromHeader(hostHeader?: string | string[] | null) {
  const raw = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader || '';
  return raw.split(':')[0].toLowerCase().trim();
}

export function isMarketingHost(hostHeader?: string | string[] | null) {
  const host = hostnameFromHeader(hostHeader);
  return host === 'menucolcodice.it' || host === 'www.menucolcodice.it';
}

export function isAdminAppPath(pathname?: string) {
  const path = String(pathname || '').split('?')[0];
  return path.startsWith('/admin') || path.startsWith('/adminnewpage');
}

export function isMarketingPath(pathname?: string) {
  const path = String(pathname || '').split('?')[0];
  return (
    path === '/prezzi' ||
    path.startsWith('/iscriviti') ||
    path === '/privacy' ||
    path === '/cookie' ||
    path === '/termini' ||
    path === '/404' ||
    path.startsWith('/sitemap') ||
    path === '/manifest.json' ||
    path === '/robots.txt'
  );
}
