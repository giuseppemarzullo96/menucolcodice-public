import Head from 'next/head';
import {
  DEFAULT_OG_ALT,
  DEFAULT_OG_IMAGE,
  MARKETING_ORIGIN,
  SITE_NAME,
  THEME_COLOR,
  absoluteUrl,
  clipTitle,
} from './site';

export type SeoProps = {
  title: string;
  description: string;
  path?: string;
  canonicalUrl?: string;
  image?: string;
  type?: 'website' | 'article' | 'product';
  noindex?: boolean;
  jsonLd?: object | object[];
  siteName?: string;
  themeColor?: string;
  origin?: string;
  includeIcons?: boolean;
};

export function Seo({
  title,
  description,
  path = '/',
  canonicalUrl,
  image,
  type = 'website',
  noindex = false,
  jsonLd,
  siteName = SITE_NAME,
  themeColor = THEME_COLOR,
  origin = MARKETING_ORIGIN,
  includeIcons = true,
}: SeoProps) {
  const url = canonicalUrl || (path && origin ? absoluteUrl(origin, path) : '');
  const ogImage = image || DEFAULT_OG_IMAGE;
  const pageTitle = clipTitle(title);
  const graphs = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];
  const descriptionText = String(description || '').trim();

  return (
    <Head>
      <title>{pageTitle}</title>
      {descriptionText ? <meta name="description" content={descriptionText} /> : null}
      {url ? <link rel="canonical" href={url} /> : null}
      {noindex ? <meta name="robots" content="noindex, nofollow" /> : <meta name="robots" content="index, follow" />}

      <meta property="og:title" content={pageTitle} />
      {descriptionText ? <meta property="og:description" content={descriptionText} /> : null}
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={DEFAULT_OG_ALT} />
      {url ? <meta property="og:url" content={url} /> : null}
      <meta property="og:type" content={type} />
      <meta property="og:locale" content="it_IT" />
      <meta property="og:site_name" content={siteName} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      {descriptionText ? <meta name="twitter:description" content={descriptionText} /> : null}
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={DEFAULT_OG_ALT} />

      <meta name="theme-color" content={themeColor} />
      {includeIcons ? (
        <>
          <link rel="icon" href="/favicon.ico" sizes="32x32" />
          <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
          <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        </>
      ) : null}
      <link rel="manifest" href="/manifest.json" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-title" content={siteName} />

      {graphs.map((item, index) => (
        <script
          // eslint-disable-next-line react/no-danger
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </Head>
  );
}
