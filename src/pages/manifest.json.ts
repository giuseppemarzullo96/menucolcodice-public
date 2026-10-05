import type { GetServerSideProps } from 'next';
import { isMarketingHost } from '@/utils/hosts';
import { enterTenantFromRequest } from '@/server/tenant';
import { loadRestaurantData } from '@/utils/dataLoader';
import { BACKGROUND_COLOR, MARKETING_ORIGIN, SITE_NAME, THEME_COLOR } from '@/seo/site';

function sendManifest(res: any, body: object) {
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=86400');
  res.write(JSON.stringify(body));
  res.end();
}

const marketingManifest = {
  name: SITE_NAME,
  short_name: SITE_NAME,
  description: 'Il menu digitale del tuo locale, con QR code.',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  background_color: BACKGROUND_COLOR,
  theme_color: THEME_COLOR,
  lang: 'it-IT',
  id: MARKETING_ORIGIN,
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  if (isMarketingHost(req.headers.host)) {
    sendManifest(res, marketingManifest);
    return { props: {} };
  }

  const tenant = enterTenantFromRequest(req);
  const { restaurantInfo, themeLayout, themeColors } = loadRestaurantData();
  const name = String(restaurantInfo?.name || tenant.name || SITE_NAME);
  const icon = themeLayout?.faviconUrl || '/icons/icon-192.png';
  sendManifest(res, {
    name,
    short_name: name.slice(0, 24),
    description: String(restaurantInfo?.description || `Menu di ${name}`),
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: themeColors?.layout?.background || BACKGROUND_COLOR,
    theme_color: themeColors?.navbar?.background || THEME_COLOR,
    lang: 'it',
    icons: [
      { src: icon, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  });
  return { props: {} };
};

export default function ManifestJson() {
  return null;
}
