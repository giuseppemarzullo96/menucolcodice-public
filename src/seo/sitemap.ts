import type { GetServerSidePropsContext } from 'next';
import { loadTenants } from '@/server/tenant';
import { MARKETING_ORIGIN, escapeXml } from './site';
import { MARKETING_SEO } from './marketingPages';
import { BUSINESS_TYPES } from './businessTypes';
import { listPublishedPosts } from '@/server/blogStore';

const MARKETING_PATHS = [
  MARKETING_SEO.home.path,
  MARKETING_SEO.prezzi.path,
  MARKETING_SEO.iscriviti.path,
  MARKETING_SEO.privacy.path,
  MARKETING_SEO.cookie.path,
  MARKETING_SEO.termini.path,
  ...BUSINESS_TYPES.map((item) => `/menu-digitale/${item.slug}`),
];

function blogPaths() {
  return ['/blog', ...listPublishedPosts().map((post) => `/blog/${post.slug}`)];
}

export function sendXml(res: GetServerSidePropsContext['res'], body: string) {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.write(body);
  res.end();
}

export function sitemapIndexXml(lastmod: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${MARKETING_ORIGIN}/sitemap-pages.xml</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${MARKETING_ORIGIN}/sitemap-locali.xml</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>
</sitemapindex>
`;
}

export function marketingPagesXml(lastmod: string) {
  const urls = [...MARKETING_PATHS, ...blogPaths()].map((path) => {
    const loc = path === '/' ? `${MARKETING_ORIGIN}/` : `${MARKETING_ORIGIN}${path}`;
    return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
  </url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;
}

export function localiSitemapXml(lastmod: string) {
  const tenants = loadTenants().filter((tenant) => tenant.status === 'active' && tenant.slug !== 'demo');
  const urls = tenants.flatMap((tenant) => {
    const origin = `https://${tenant.slug}.menucolcodice.it`;
    return [`${origin}/`, `${origin}/dishes`].map(
      (loc) => `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
  </url>`
    );
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;
}

export function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}
