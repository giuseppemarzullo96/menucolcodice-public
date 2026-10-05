import { useEffect, type MouseEvent, type SVGProps } from "react";
import { useRouter } from "next/router";

import { animate } from "motion";
import { Button } from "antd";

import { HomeLayout } from "../components/layouts/HomeLayout";
import styles from "../styles/home.module.css";
import { formatOpeningHoursLines } from "../utils/openingHours";
import { bestTextOn, contrastRatio, isHexColor } from "../utils/colorContrast";

type FeaturedDish = {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
};

/** Icone monolinea disegnate ad hoc: più raffinate del set generico Ant Design,
 * coerenti fra loro (stesso spessore, stessa griglia) invece di icone miste. */
const IconPin = (props: SVGProps<SVGSVGElement>) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path d="M12 21s7-6.3 7-11.8A7 7 0 1 0 5 9.2C5 14.7 12 21 12 21z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <circle cx="12" cy="9.2" r="2.3" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

const IconClock = (props: SVGProps<SVGSVGElement>) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <circle cx="12" cy="12" r="8.4" stroke="currentColor" strokeWidth="1.6" />
    <path d="M12 7.6V12l3.1 1.9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconMail = (props: SVGProps<SVGSVGElement>) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <rect x="3.2" y="5.5" width="17.6" height="13" rx="2.4" stroke="currentColor" strokeWidth="1.6" />
    <path d="M4.2 7 12 12.6 19.8 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconPhone = (props: SVGProps<SVGSVGElement>) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path
      d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.3 1.2.4 2.5.6 3.8.6a1 1 0 0 1 1 1v3.6a1 1 0 0 1-1 1C10.9 21.1 3 13.2 3 3.7a1 1 0 0 1 1-1h3.6a1 1 0 0 1 1 1c0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1L6.6 10.8z"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  </svg>
);

const IconFacebook = (props: SVGProps<SVGSVGElement>) => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
    <path d="M14 8.4h-1.3c-.9 0-1.5.6-1.5 1.5V11H9v2h2.2v6h2.1v-6h1.6l.3-2h-1.9v-.9c0-.4.3-.7.7-.7H14V8.4z" fill="currentColor" />
  </svg>
);

const IconInstagram = (props: SVGProps<SVGSVGElement>) => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="17.1" cy="6.9" r="1.05" fill="currentColor" />
  </svg>
);

const IconWhatsapp = (props: SVGProps<SVGSVGElement>) => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path d="M12 3.5a8.4 8.4 0 0 0-7.2 12.7L3.5 20.5l4.5-1.2A8.4 8.4 0 1 0 12 3.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path
      d="M8.9 8.3c.2-.4.4-.4.6-.4h.5c.2 0 .4 0 .5.4.2.4.6 1.3.6 1.4.1.1.1.3 0 .4-.1.2-.2.3-.3.4-.1.1-.3.3-.4.4-.1.1-.2.3-.1.5.2.3.6 1 1.4 1.7.9.8 1.7 1.1 2 1.2.3.1.4.1.6-.1.2-.2.5-.6.7-.9.2-.2.4-.2.6-.1.3.1 1.5.7 1.8.8.3.1.4.2.5.3.1.2.1.8-.2 1.2-.4.5-1 .8-1.5.9-.5.1-1 .1-3.2-.8-2.7-1.1-4.4-3.8-4.5-4-.1-.2-1-1.4-1-2.6 0-1.2.6-1.8.9-2z"
      fill="currentColor"
    />
  </svg>
);

interface HomePageProps {
  restaurantData: any;
  themeColors?: any;
  footerText?: string;
  canonicalUrl?: string;
  featuredDishes?: FeaturedDish[];
  noindex?: boolean;
}

function formatAddress(address?: {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}) {
  if (!address) return "";
  const street = String(address.street || "").trim();
  const city = String(address.city || "").trim();
  const state = String(address.state || "").trim();
  const cap = String(address.postalCode || "").trim();
  const cityLine = [city, cap].filter(Boolean).join(" ");
  if (state && state.toLowerCase() !== city.toLowerCase()) {
    return [street, cityLine, state].filter(Boolean).join(", ");
  }
  return [street, cityLine].filter(Boolean).join(", ");
}

function hourLines(openingHours?: string) {
  return formatOpeningHoursLines(openingHours);
}

const INK = "#1A1A17";
const CREAM = "#FAF7F0";

/**
 * I colori "bottone home" del tema sono pensati per stare sopra la foto scura
 * dell'hero. Il CTA e il prezzo dei piatti in evidenza stanno invece sulla pagina
 * chiara: se il colore del tema non si distingue abbastanza dallo sfondo dove sta
 * ORA, si passa a una coppia sempre leggibile invece di fidarsi ciecamente del tema.
 */
function pickAccent(bgHex: string, preferredHex: string | undefined, fallbackHex: string, minRatio: number) {
  if (isHexColor(preferredHex) && contrastRatio(preferredHex, bgHex) >= minRatio) return preferredHex;
  return fallbackHex;
}

function pickReadableText(bgHex: string) {
  return bestTextOn(bgHex, CREAM, INK);
}

const HomePage = ({ restaurantData, themeColors, footerText, canonicalUrl, featuredDishes, noindex }: HomePageProps) => {
  const router = useRouter();

  useEffect(() => {
    animate(".homeContentAnimation", { opacity: [0, 1] }, { duration: 0.9 });
  }, []);

  const fullAddress = formatAddress(restaurantData.address);
  const hours = hourLines(restaurantData.openingHours);
  const phone = String(restaurantData.phone || "").trim();
  const email = String(restaurantData.email || "").trim();
  const hasSocial = Boolean(
    restaurantData.social?.facebook || restaurantData.social?.instagram || restaurantData.social?.whatsapp
  );
  const hasActions = hasSocial || Boolean(phone);
  const dishes = (featuredDishes || []).filter((d) => d && d.name);

  const goToMenu = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push("/dishes");
  };

  const backgroundType = restaurantData.homeBackgroundType || 'image';
  const backgroundColor = themeColors?.layout?.background || '#000000';
  const backgroundImage = restaurantData.homeBackgroundUrl;
  const backgroundVideo = restaurantData.homeBackgroundVideoUrl;

  // Sfondo pagina (fuori dalla foto hero) e colori del CTA/prezzo, sempre leggibili
  // sopra quello sfondo chiaro anche se il colore "bottone" del tema è pensato per
  // stare sopra la foto scura.
  const pageBg = isHexColor(themeColors?.layout?.background) ? themeColors.layout.background : CREAM;
  const brandButtonColor = themeColors?.layout?.homeButtonColor;
  const ctaBg = pickAccent(pageBg, brandButtonColor, INK, 1.5);
  const ctaText = pickReadableText(ctaBg);
  const priceColor = pickAccent("#FFFFFF", brandButtonColor, "#8A6A2E", 2.5);

  return (
    <HomeLayout
      title={`${restaurantData.name} - ${restaurantData.description}`}
      pageDescription={restaurantData.description || `Menu digitale di ${restaurantData.name}`}
      imageUrl={backgroundImage || backgroundVideo}
      restaurantData={restaurantData}
      themeColors={themeColors}
      footerText={footerText}
      canonicalUrl={canonicalUrl}
      noindex={noindex}
    >
      <main
        className={styles.mainContainer}
        style={{ backgroundColor: themeColors?.layout?.background || "#FAF7F0" }}
      >
        <div className={styles.heroSection}>
          {/* Background basato sul tipo selezionato */}
          {backgroundType === 'video' && backgroundVideo ? (
            <video
              className={styles.video}
              autoPlay
              loop
              muted
              playsInline
              src={backgroundVideo}
              aria-label={`Video di sfondo della home di ${restaurantData.name || "locale"}`}
            />
          ) : backgroundType === 'image' && backgroundImage ? (
            <img
              key={backgroundImage}
              className={styles.img}
              src={backgroundImage}
              alt={`Sfondo della home di ${restaurantData.name || "locale"}`}
              width={1920}
              height={1080}
              decoding="async"
            />
          ) : (
            <div
              className={styles.colorBackground}
              style={{ backgroundColor }}
            />
          )}

          <div className={`${styles.homeOverlay} homeContentAnimation`}>
            <section className={styles.restaurantInformation}>
              <div className={styles.informationContainer}>
                {fullAddress ? (
                  <div className={styles.infoRow}>
                    <IconPin />
                    <span>{fullAddress}</span>
                  </div>
                ) : null}
                {hours.length ? (
                  <div className={styles.infoRow}>
                    <IconClock />
                    <div className={styles.hoursBlock}>
                      {hours.map((line) => (
                        <div key={line}>{line}</div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className={styles.informationContainer}>
                {email ? (
                  <div className={styles.infoRow}>
                    <IconMail />
                    <span>{email}</span>
                  </div>
                ) : null}
              </div>
            </section>

            <section className={styles.hero}>
              <h1 className={styles.title}>{restaurantData.name}</h1>
              <div className={styles.heroRule} aria-hidden />
              {restaurantData.description ? (
                <p className={styles.subtitle}>{restaurantData.description}</p>
              ) : null}

              {hasActions ? (
                <div className={styles.heroActions}>
                  {restaurantData.social?.facebook ? (
                    <a href={restaurantData.social.facebook} target="_blank" rel="noopener noreferrer" className={styles.socialIcon} aria-label="Facebook">
                      <IconFacebook />
                    </a>
                  ) : null}
                  {restaurantData.social?.instagram ? (
                    <a href={restaurantData.social.instagram} target="_blank" rel="noopener noreferrer" className={styles.socialIcon} aria-label="Instagram">
                      <IconInstagram />
                    </a>
                  ) : null}
                  {restaurantData.social?.whatsapp ? (
                    <a
                      href={`https://wa.me/${String(restaurantData.social.whatsapp).replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.socialIcon}
                      aria-label="WhatsApp"
                    >
                      <IconWhatsapp />
                    </a>
                  ) : null}
                  {phone ? (
                    <a href={`tel:${phone.replace(/[^0-9+]/g, "")}`} className={styles.callButton}>
                      <IconPhone />
                      Chiama
                    </a>
                  ) : null}
                </div>
              ) : null}
            </section>
          </div>
        </div>

        {dishes.length ? (
          <section className={`${styles.featuredSection} homeContentAnimation`}>
            <h2 className={styles.featuredTitle}>I piatti che consigliamo</h2>
            <p className={styles.featuredSubtitle}>un assaggio prima del menu completo</p>
            <div className={styles.featuredGrid}>
              {dishes.map((dish) => (
                <button
                  key={dish.id}
                  type="button"
                  className={styles.featuredCard}
                  onClick={goToMenu}
                >
                  <div className={styles.featuredImageWrap}>
                    {dish.imageUrl ? (
                      <img className={styles.featuredImage} src={dish.imageUrl} alt={dish.name} loading="lazy" />
                    ) : null}
                  </div>
                  <span className={styles.featuredName}>{dish.name}</span>
                  <span className={styles.featuredPrice} style={{ color: priceColor }}>
                    &euro;{Number(dish.price || 0).toFixed(2).replace(/\.00$/, "")}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <div className={`${styles.ctaWrap} homeContentAnimation`}>
          <Button
            type="primary"
            size="large"
            className={styles.ctaFull}
            onClick={goToMenu}
            style={{
              cursor: "pointer",
              backgroundColor: ctaBg,
              borderColor: ctaBg,
              color: ctaText,
            }}
          >
            SCOPRI IL MENU
          </Button>
        </div>
      </main>
    </HomeLayout>
  );
};

export default HomePage;
