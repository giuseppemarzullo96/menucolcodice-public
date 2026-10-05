import App, { AppContext, AppProps } from "next/app";
import { ConfigProvider, theme } from "antd";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { darkTheme } from "../../themes";
import Head from "next/head";
import { FloatingDeliveryButtons } from "@/components/ui/FloatingDeliveryButtons";
import { SocialButton } from "@/components/ui/SocialButton";
import "../styles/globals.css";
import "../styles/antd-overrides.css";
import "../styles/forced-colors.css";
import "../styles/navbar-buttons.css";
import { isAdminAppPath, isMarketingHost, isMarketingPath } from "@/utils/hosts";
import { MenuTracker } from "@/components/analytics/MenuTracker";
import { GoogleTags } from "@/components/analytics/GoogleTags";

interface MyAppProps extends AppProps {
  initialRestaurantData?: any;
}

// Funzione per creare il tema Ant Design dai colori
// RIMOSSO: non impostiamo più le CSS variables qui perché sono già in _document.tsx
const createCustomTheme = (data: any) => {
  if (!data?.themeColors) {
    return darkTheme;
  }

  return {
    algorithm: theme.darkAlgorithm,
    token: {
      ...darkTheme.token,
      colorPrimary: data.themeColors.primary || darkTheme.token.colorPrimary,
      colorInfo: data.themeColors.secondary || darkTheme.token.colorInfo,
      colorTextSecondary: data.themeColors.textSecondary || darkTheme.token.colorTextSecondary,
      fontFamily: "Manrope, system-ui, sans-serif",
    },
  };
};

const updateFavicon = (faviconUrl?: string) => {
  if (!faviconUrl || typeof document === "undefined") {
    return;
  }

  const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
  if (link) {
    link.href = faviconUrl;
  } else {
    const newLink = document.createElement("link");
    newLink.rel = "icon";
    newLink.href = faviconUrl;
    document.head.appendChild(newLink);
  }
};

function MyApp({ Component, pageProps, initialRestaurantData }: MyAppProps) {
  const router = useRouter();
  
  // Inizializza il tema con i dati SSR, senza aspettare useEffect
  const [customTheme] = useState(() => {
    return createCustomTheme(initialRestaurantData);
  });
  
  const [restaurantData, setRestaurantData] = useState<any>(initialRestaurantData ?? null);

  // Aggiorna il favicon se necessario (solo se cambia)
  useEffect(() => {
    if (restaurantData?.faviconUrl) {
      updateFavicon(restaurantData.faviconUrl);
    }
  }, [restaurantData?.faviconUrl]);

  // Carica i dati solo se non erano disponibili in SSR
  useEffect(() => {
    if (!initialRestaurantData && !isAdminAppPath(router.pathname)) {
      const loadRestaurantData = async () => {
        try {
          const response = await fetch("/api/get-restaurant");
          if (response.ok) {
            const data = await response.json();
            setRestaurantData(data);
            // Il tema è già inizializzato, non serve aggiornarlo qui
            // Le CSS variables sono già in _document.tsx
          }
        } catch (error) {
          console.error("Errore nel caricare i dati del ristorante:", error);
        }
      };
      loadRestaurantData();
    }
  }, [initialRestaurantData, router.pathname]);

  // Gestione redirect - ottimizzata con cache e debounce
  useEffect(() => {
    // Non applicare redirect su pagine API o admin
    if (router.pathname.startsWith('/api') || router.pathname.startsWith('/admin')) {
      return;
    }

    let redirectsCache: any[] | null = null;
    let timeoutId: NodeJS.Timeout;

    const checkRedirects = async () => {
      try {
        // Usa cache se disponibile, altrimenti carica
        if (!redirectsCache) {
          const response = await fetch("/api/get-redirects");
          if (response.ok) {
            const data = await response.json();
            redirectsCache = data.redirects || [];
          } else {
            return;
          }
        }
        
        // Ottieni il path corrente senza lo slash iniziale
        const currentPath = router.asPath.split('?')[0]; // Rimuovi query string
        const pathWithoutSlash = currentPath.startsWith('/') ? currentPath.substring(1) : currentPath;
        
        // Cerca un redirect corrispondente
        const matchingRedirect = redirectsCache.find((r: any) => {
          const fromPath = r.from.trim();
          // Confronta il path senza slash iniziale
          return pathWithoutSlash === fromPath || currentPath === `/${fromPath}`;
        });
        
        if (matchingRedirect) {
          // Esegui il redirect
          window.location.href = matchingRedirect.to;
        }
      } catch (error) {
        console.error("Errore nel controllare i redirect:", error);
      }
    };

    // Controlla i redirect solo quando il router è pronto, con debounce
    if (router.isReady) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkRedirects, 100); // Debounce di 100ms
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, [router.isReady, router.asPath]);

  // Nascondi SocialButton nella pagina di login e sul sito vendita
  const isAdminPage = isAdminAppPath(router.pathname);
  const isMarketingPage =
    Boolean((pageProps as any)?.marketing) || isMarketingPath(router.pathname);
  const adminTheme = {
    algorithm: theme.defaultAlgorithm,
    token: {
      colorPrimary: '#1A1A17',
      colorText: '#1A1A17',
      colorTextSecondary: '#5C5A52',
      colorBgLayout: '#FAF7F0',
      colorBgContainer: '#FFFFFF',
      colorBorder: '#EFE9DC',
      fontFamily: 'Manrope, ui-sans-serif, system-ui, sans-serif',
      borderRadius: 0,
    },
  };

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
        {restaurantData?.faviconUrl && (
          <link rel="icon" href={restaurantData.faviconUrl} />
        )}
      </Head>
      <ConfigProvider theme={isAdminPage ? adminTheme : customTheme}>
        <Component {...pageProps} />
        <GoogleTags />
        {!isAdminPage && !isMarketingPage && <MenuTracker />}
        {!isAdminPage && !isMarketingPage && (
          <SocialButton
            whatsapp={restaurantData?.social?.whatsapp}
            whatsappButtonColor={restaurantData?.whatsappButtonColor}
            whatsappIconColor={restaurantData?.whatsappIconColor}
            glovo={restaurantData?.social?.glovo}
            deliveroo={restaurantData?.social?.deliveroo}
            justeat={restaurantData?.social?.justeat}
            buttonColor={restaurantData?.socialButtonColor}
            iconColor={restaurantData?.socialIconColor}
          />
        )}
      </ConfigProvider>
    </>
  );
}

MyApp.getInitialProps = async (appContext: AppContext) => {
  const appProps = await App.getInitialProps(appContext);
  let initialRestaurantData = null;

  try {
    const { req } = appContext.ctx;
    if (req) {
      const host = String(req.headers.host || "");
      const hostname = host.split(":")[0].toLowerCase();
      if (isMarketingHost(host) || isAdminAppPath(appContext.ctx.pathname)) {
        return { ...appProps, initialRestaurantData: null };
      }
      const parts = hostname.split(".");
      let slug = "demo";
      if (parts.length >= 3 && parts.slice(-2).join(".") === "menucolcodice.it") {
        const sub = parts[0];
        if (sub && sub !== "www" && sub !== "webmail") slug = sub;
      }
      const protocol = req?.connection && (req.connection as any).encrypted ? "https" : "http";
      const response = await fetch(`${protocol}://127.0.0.1:3000/api/get-restaurant`, {
        headers: {
          Host: host,
          "x-tenant-slug": slug,
        },
      });
      if (response.ok) {
        initialRestaurantData = await response.json();
      }
    }
  } catch (error) {
    console.error("Errore nel pre-caricare i dati del ristorante:", error);
  }

  return {
    ...appProps,
    initialRestaurantData,
  };
};

export default MyApp;
