import React from "react";
import { createCache, extractStyle, StyleProvider } from "@ant-design/cssinjs";
import Document, { Html, Head, Main, NextScript } from "next/document";
import type { DocumentContext } from "next/document";
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { enterTenantFromRequest, tenantDataDir } from '@/server/tenant';
import { isAdminAppPath, isMarketingHost, isMarketingPath } from '@/utils/hosts';
import { publicGoogleConfig } from '@/server/integrations';

// Funzione per leggere il favicon dal database
const getFaviconUrl = () => {
  try {
    const readModule = (filePath: string, exportName: string) => {
      if (!fs.existsSync(filePath)) return null;
      try {
        const tsContent = fs.readFileSync(filePath, 'utf8');
        const jsContent = tsContent
          .replace(/^[ \t]*import[^;]+;\s*\n/gm, '')
          .replace(new RegExp(`export\\s+const\\s+${exportName}\\s*[:=]\\s*`), `exports.${exportName} = `)
          .replace(/PriceNameType\.([A-Z_]+)/g, '"$1"')
          .replace(/as\s+"text"\s*\|\s+"image"/g, '');
        const sandbox: any = { exports: {} };
        vm.createContext(sandbox);
        vm.runInContext(jsContent, sandbox, { filename: filePath });
        return sandbox.exports[exportName];
      } catch (e) {
        return null;
      }
    };

    const basePath = tenantDataDir();
    const themeLayout = readModule(path.join(basePath, 'theme', 'layout.ts'), 'themeLayout') || {};
    
    return themeLayout?.faviconUrl || null;
  } catch (error) {
    console.error('Errore nel leggere il favicon dal database:', error);
    return null;
  }
};

// Funzione per leggere i colori dal database con la nuova struttura gerarchica
const getThemeColors = () => {
  let themeColors: any = {
    // Colori base (fallback)
    primary: '#fcbe00',
    secondary: '#ffffff',
    background: '#fcbe01',
    textPrimary: '#ffffff',
    textSecondary: '#ffffff',
    tagColor: '#fa0025',
    layoutBackground: '#401b0f',
    sidebarBackground: '#401b0e',
    cardBackground: '#eaa52e',
    buttonBackground: '#401b0e',
    // Nuova struttura gerarchica (fallback)
    layout: { background: '#401b0f' },
    navbar: { 
      background: '#141414',
      buttonBackground: '#303030',
      buttonText: '#ffffff',
      buttonHover: '#404040',
      iconColor: '#ffffff',
      logoColor: '#FFB800',
      textColor: '#ffffff'
    },
    sidebar: {
      background: '#401b0e',
      titleColor: '#FFB800',
      menuItemBackground: '#401b0e',
      menuItemColor: '#ffffff',
      menuItemActive: '#FFB800',
      menuItemHover: '#FFE5B4',
      iconColor: '#FFB800'
    },
    card: {
      backgroundColor: '#1a1a1a',
      backgroundImage: '',
      backgroundOpacity: 1,
      productNameColor: '#ffffff',
      priceColor: '#ffffff',
      bestSellerColor: '#fcbe00',
      ingredientColor: '#ffffff'
    },
    sections: {
      titleColor: '#ffffff',
      descriptionColor: '#ffffff'
    },
    footer: {
      background: '#141414',
      textColor: '#ffffff'
    }
  };

  try {
    const readModule = (filePath: string, exportName: string) => {
      if (!fs.existsSync(filePath)) return null;
      try {
        const tsContent = fs.readFileSync(filePath, 'utf8');
        const jsContent = tsContent
          .replace(/^[ \t]*import[^;]+;\s*\n/gm, '')
          .replace(new RegExp(`export\\s+const\\s+${exportName}\\s*[:=]\\s*`), `exports.${exportName} = `)
          .replace(/PriceNameType\.([A-Z_]+)/g, '"$1"')
          .replace(/as\s+"text"\s*\|\s+"image"/g, '');
        const sandbox: any = { exports: {} };
        vm.createContext(sandbox);
        vm.runInContext(jsContent, sandbox, { filename: filePath });
        return sandbox.exports[exportName];
      } catch (e) {
        return null;
      }
    };

    const basePath = tenantDataDir();
    const dbThemeColors = readModule(path.join(basePath, 'theme', 'colors.ts'), 'themeColors');
    
    if (dbThemeColors) {
      // Merge con i colori esistenti
      themeColors = {
        ...themeColors,
        ...dbThemeColors,
        // Merge profondo per ogni sezione
        layout: { ...themeColors.layout, ...dbThemeColors.layout },
        navbar: { ...themeColors.navbar, ...dbThemeColors.navbar },
        sidebar: { ...themeColors.sidebar, ...dbThemeColors.sidebar },
        card: { ...themeColors.card, ...dbThemeColors.card },
        sections: { ...themeColors.sections, ...dbThemeColors.sections },
        footer: { ...themeColors.footer, ...dbThemeColors.footer },
      };
    }
  } catch (error) {
    console.error('Errore nel leggere i colori dal database:', error);
  }

  return themeColors;
};

const LIGHT_UI = {
  layout: { background: '#FAF7F0' },
  navbar: {
    background: '#FAF7F0',
    buttonBackground: '#1A1A17',
    buttonText: '#FAF7F0',
    buttonHover: '#2E2E29',
    iconColor: '#1A1A17',
    textColor: '#1A1A17',
    logoColor: '#E0A32E',
  },
  sidebar: {
    background: '#FFFFFF',
    menuItemBackground: '#FAF7F0',
    menuItemColor: '#1A1A17',
    menuItemActive: '#E0A32E',
    menuItemHover: '#EFE9DC',
    iconColor: '#1A1A17',
  },
  card: {
    backgroundColor: '#FFFFFF',
    productNameColor: '#1A1A17',
    priceColor: '#1A1A17',
    bestSellerColor: '#E0A32E',
    ingredientColor: '#5C5A52',
  },
  sections: { titleColor: '#1A1A17', descriptionColor: '#5C5A52' },
  footer: { background: '#FAF7F0', textColor: '#5C5A52' },
};

const MyDocument = (props: any) => {
  const marketing = Boolean(props.marketing);
  const adminApp = Boolean(props.adminApp);
  const lightUi = marketing || adminApp;
  const themeColors = lightUi ? LIGHT_UI : (props.themeColors || getThemeColors());
  const faviconUrl = lightUi ? null : (props.faviconUrl !== undefined ? props.faviconUrl : getFaviconUrl());
  const google = props.google || { ga4MeasurementId: '', searchConsoleVerification: '' };
  
  return (
    <Html lang="it" className={adminApp ? 'admin-app' : undefined}>
      <Head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              :root {
                /* Colori base (retrocompatibilità) - solo se esistono */
                ${themeColors.primary ? `--color-primary: ${themeColors.primary};` : ''}
                ${themeColors.secondary ? `--color-secondary: ${themeColors.secondary};` : ''}
                ${themeColors.background ? `--color-background: ${themeColors.background};` : ''}
                ${themeColors.textPrimary ? `--color-text-primary: ${themeColors.textPrimary};` : ''}
                ${themeColors.textSecondary ? `--color-text-secondary: ${themeColors.textSecondary};` : ''}
                --color-tag: ${themeColors.tagColor || '#fcbe00'};
                /* Nuova struttura gerarchica - Layout */
                --layout-bg: ${themeColors.layout?.background || '#000000'};
                
                /* Retrocompatibilità: mappa le variabili vecchie alle nuove */
                --color-layout-bg: var(--layout-bg);
                --color-sidebar-bg: var(--sidebar-bg);
                --color-card-bg: var(--card-background-color);
                --color-button-bg: ${themeColors.navbar?.buttonBackground || themeColors.buttonBackground || '#303030'};
                
                /* Navbar */
                --navbar-bg: ${themeColors.navbar?.background || '#141414'};
                --navbar-button-bg: ${themeColors.navbar?.buttonBackground || '#303030'};
                --navbar-button-text: ${themeColors.navbar?.buttonText || '#ffffff'};
                --navbar-button-hover: ${themeColors.navbar?.buttonHover || '#404040'};
                --navbar-icon-color: ${themeColors.navbar?.iconColor || '#ffffff'};
                --navbar-text-color: ${themeColors.navbar?.textColor || '#ffffff'};
                --navbar-logo-color: ${themeColors.navbar?.logoColor || '#FFB800'};
                
                /* Sidebar */
                --sidebar-bg: ${themeColors.sidebar?.background || '#ffffff'};
                --menu-item-background: ${themeColors.sidebar?.menuItemBackground || '#401b0e'};
                --menu-item-color: ${themeColors.sidebar?.menuItemColor || '#ffffff'};
                --menu-item-active: ${themeColors.sidebar?.menuItemActive || '#FFB800'};
                --menu-item-hover: ${themeColors.sidebar?.menuItemHover || '#FFE5B4'};
                --icon-color: ${themeColors.sidebar?.iconColor || '#FFB800'};
                
                /* Card */
                --card-background-color: ${themeColors.card?.backgroundColor || '#1a1a1a'};
                --product-name-color: ${themeColors.card?.productNameColor || '#ffffff'};
                --price-color: ${themeColors.card?.priceColor || '#ffffff'};
                --best-seller-color: ${themeColors.card?.bestSellerColor || '#fcbe00'};
                --ingredient-color: ${themeColors.card?.ingredientColor || '#ffffff'};
                
                /* Sections */
                --section-title-color: ${themeColors.sections?.titleColor || '#ffffff'};
                --section-description-color: ${themeColors.sections?.descriptionColor || '#ffffff'};
                
                /* Footer */
                --footer-bg: ${themeColors.footer?.background || '#141414'};
                --footer-text-color: ${themeColors.footer?.textColor || '#ffffff'};
              }
              
              /* Applica immediatamente il background al body e html per evitare flash */
              html,
              body {
                background: var(--layout-bg, ${themeColors.layout?.background || '#000000'}) !important;
              }
              
              /* Applica immediatamente il background alla navbar */
              .ant-layout-header {
                background: var(--navbar-bg, ${themeColors.navbar?.background || '#141414'}) !important;
              }
              
              /* Applica immediatamente il colore del titolo nella navbar */
              .ant-typography h1,
              .navbar_navContainerOptions .ant-typography {
                color: var(--navbar-text-color, ${themeColors.navbar?.textColor || '#ffffff'}) !important;
              }
            `,
          }}
        />
        {/* Viewport va in _app.tsx: Next.js non consente viewport in _document */}
        <link
          rel="icon"
          href={faviconUrl || "/favicon.svg"}
          type={faviconUrl ? undefined : "image/svg+xml"}
        />
        {!faviconUrl ? (
          <>
            <link rel="icon" href="/favicon.ico" sizes="32x32" />
            <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
          </>
        ) : null}
        <link
          rel="shortcut icon"
          href={faviconUrl || "/favicon.ico"}
        />

        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        {google.searchConsoleVerification ? (
          <meta name="google-site-verification" content={String(google.searchConsoleVerification)} />
        ) : null}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__MCC_GOOGLE=${JSON.stringify({
              ga4MeasurementId: google.ga4MeasurementId || '',
            })};`,
          }}
        />
      </Head>
      <body style={{ background: `var(--layout-bg, ${themeColors.layout?.background || '#000000'})` }}>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
};

MyDocument.getInitialProps = async (ctx: DocumentContext) => {
  const pathName = String(ctx.pathname || ctx.asPath || '').split('?')[0];
  const marketing =
    isMarketingHost(ctx.req?.headers.host) || isMarketingPath(pathName);
  const adminApp = isAdminAppPath(pathName);
  if (ctx.req && !marketing && !adminApp) enterTenantFromRequest(ctx.req);
  const cache = createCache();
  const originalRenderPage = ctx.renderPage;
  ctx.renderPage = () =>
    originalRenderPage({
      enhanceApp: (App) => (props) =>
        (
          <StyleProvider cache={cache}>
            <App {...props} />
          </StyleProvider>
        ),
    });

  const initialProps = await Document.getInitialProps(ctx);
  const style = extractStyle(cache, true);
  let google = { ga4MeasurementId: '', searchConsoleVerification: '' };
  try {
    google = publicGoogleConfig();
  } catch {
    /* niente Google configurato */
  }
  return {
    ...initialProps,
    themeColors: marketing || adminApp ? LIGHT_UI : getThemeColors(),
    faviconUrl: marketing || adminApp ? null : getFaviconUrl(),
    marketing,
    adminApp,
    google,
    styles: (
      <>
        {initialProps.styles}
        <style dangerouslySetInnerHTML={{ __html: style }} />
      </>
    ),
  };
};

export default MyDocument;
