import { useEffect } from "react";
import Link from "next/link";

import { Layout, theme } from "antd";
const { Content } = Layout;

import { DishesCarousel } from "../../components/products/DishesCarousel";
import { DishListItem } from "../../components/products/DishListItem";
import { CategoryChips } from "../../components/ui/CategoryChips";
import type { MenuViewMode } from "../../components/ui/ViewModeSwitch";

import { TMenuSection } from "@/types/dish";
import { DishesLayout } from "../../components/layouts";
import styles from "../../styles/dishes.module.css";
import listStyles from "../../styles/dishList.module.css";
import { absoluteUrl, publicOrigin } from "@/seo/site";
// import { ScrollToTop } from "@/components/products/ScrollToTop";

interface IDishes {
  dishes: TMenuSection[];
  themeColors?: any;
  menuPageTitle?: string;
  pageDescription?: string;
  menuShareImageUrl?: string;
  footerText?: string;
  restaurantName?: string;
  restaurantData?: any;
  previewView?: MenuViewMode | null;
  canonicalUrl?: string;
  isAdmin?: boolean;
  noindex?: boolean;
}

const Dishes = (props: IDishes) => {
  const { dishes, themeColors, menuPageTitle, pageDescription, menuShareImageUrl, footerText, restaurantName, restaurantData, previewView, canonicalUrl, isAdmin, noindex } = props;

  const { useToken } = theme;
  const { token } = useToken();

  useEffect(() => {
    const handleHashScroll = () => {
      const hash = decodeURIComponent(window.location.hash.replace('#', ''));
      if (!hash) return;
      const element = document.getElementById(hash);
      if (element) element.scrollIntoView({ behavior: 'auto', block: 'start' });
    };
    handleHashScroll();
    window.addEventListener('hashchange', handleHashScroll);
    return () => window.removeEventListener('hashchange', handleHashScroll);
  }, []);

  const viewMode: MenuViewMode =
    previewView === "carousel" || previewView === "list"
      ? previewView
      : themeColors?.card?.viewMode === "carousel"
        ? "carousel"
        : "list";

  const sortedSections = [...(dishes || [])]
    .filter((section) => (section.items || []).length > 0)
    .sort((a, b) => {
    const orderA = a.order !== undefined ? a.order : 999;
    const orderB = b.order !== undefined ? b.order : 999;
    return orderA - orderB;
  });
  const titleColor = themeColors?.sections?.titleColor || token.colorPrimary;
  const descColor = themeColors?.sections?.descriptionColor;

  return (
    <DishesLayout
      title={menuPageTitle?.trim() || (restaurantName ? `Menu di ${restaurantName}` : "Menu")}
      pageDescription={pageDescription?.trim() || (restaurantName ? `Menu digitale di ${restaurantName}` : "Menu digitale")}
      imageUrl={menuShareImageUrl || "https://res.cloudinary.com/dbzv9xfjp/image/upload/v1710747902/og-images/dishes-menu_kjawtv.png"}
      themeColors={themeColors}
      footerText={footerText}
      restaurantName={restaurantName}
      restaurantData={restaurantData}
      canonicalUrl={canonicalUrl}
      noindex={noindex}
    >
      <Content>
        <main>
          {sortedSections.length === 0 ? (
            <div className={styles.emptyMenu}>
              {isAdmin ? (
                <>
                  <p><strong>Il menu è online ma non ci sono ancora piatti.</strong></p>
                  <p>Aggiungi la prima categoria e il primo piatto dal pannello.</p>
                  <Link href="/admin" className={styles.emptyMenuLink}>Vai al pannello →</Link>
                </>
              ) : (
                <p>Il menu è in preparazione. Torna a trovarci presto.</p>
              )}
            </div>
          ) : (
            <>
          <CategoryChips sections={sortedSections} themeColors={themeColors} />
          {sortedSections.map((section: TMenuSection) => (
            <section
              key={section.name}
              id={section.name.toLowerCase()}
              className={styles.sectionContainer}
            >
              <header className={styles.sectionHead}>
                <h2 className={styles.sectionTitle} style={{ color: titleColor }}>
                  {section?.name}
                </h2>
                <div className={styles.sectionRule} style={{ background: titleColor }} />
                {section.description ? (
                  <p className={styles.sectionDesc} style={{ color: descColor }}>
                    {section.description}
                  </p>
                ) : null}
              </header>

              {viewMode === "carousel" ? (
                <span className={styles.carouselSection}>
                  <DishesCarousel
                    items={section?.items ?? []}
                    themeColors={themeColors}
                    cardBackground={themeColors?.card?.backgroundImage}
                    cardBackgroundOpacity={themeColors?.card?.backgroundOpacity}
                  />
                </span>
              ) : (
                <span className={styles.listSection}>
                  <div className={listStyles.list}>
                    {(section?.items ?? []).map((item) => (
                      <DishListItem key={item.id} {...item} themeColors={themeColors} />
                    ))}
                  </div>
                </span>
              )}
            </section>
          ))}
            </>
          )}
        </main>
      </Content>

      {/* <ScrollToTop /> */}
    </DishesLayout>
  );
};
export default Dishes;

import { loadRestaurantData } from "@/utils/dataLoader";
import { getTenantBySlug, slugFromHost, withTenantPage } from "@/server/tenant";
import { isAdminAuthenticated } from "@/server/auth";

export async function getServerSideProps(context: any) {
  const tenant = getTenantBySlug(slugFromHost(context.req?.headers.host));
  if (!tenant) return { notFound: true };
  return withTenantPage(context.req, () => {
  const previewView = parsePreviewView(context.query?.view);
  context.res.setHeader(
    "Cache-Control",
    previewView
      ? "private, no-store"
      : "public, s-maxage=60, stale-while-revalidate=120"
  );

  // Usa la funzione ottimizzata con cache
  const {
    restaurantInfo,
    restaurantContacts,
    restaurantSocial,
    themeLayout,
    themeColors,
    menuSections,
    menuProducts,
  } = loadRestaurantData();

  // Combina i dati come fa index.ts
  const dishes: any = {
    ...restaurantInfo,
    ...restaurantContacts,
    social: restaurantSocial,
    ...themeLayout,
    themeColors,
  };

  // Combina sezioni e prodotti
  const sections = menuSections
    .filter((section: any) => !section.hidden)
    .map((section: any) => ({
      ...section,
      items: menuProducts.filter((p: any) => p.category === section.name),
    }))
    .filter((section: any) => (section.items || []).length > 0);

  const menuPageTitle = dishes?.menuPageTitle || "";
  const pageDescription = dishes?.pageDescription || "";
  const menuShareImageUrl = dishes?.menuShareImageUrl || "";
  const footerText = dishes?.footerText || "";
  const restaurantName = dishes?.name || "";
  
  // Estrai i dati del ristorante per la navbar
  const restaurantData = {
    name: dishes?.name || "",
    logoType: dishes?.logoType || "text",
    logoUrl: dishes?.logoUrl || "",
    logoWidth: dishes?.logoWidth || 150,
    logoHeight: dishes?.logoHeight || 50,
    phone: dishes?.phone || "",
  };

  return {
    props: {
      dishes: sections,
      themeColors: themeColors,
      menuPageTitle: menuPageTitle,
      pageDescription: pageDescription,
      menuShareImageUrl: menuShareImageUrl,
      footerText: footerText,
      restaurantName: restaurantName,
      restaurantData: restaurantData,
      previewView,
      canonicalUrl: absoluteUrl(publicOrigin(context.req?.headers.host), "/dishes"),
      isAdmin: isAdminAuthenticated(context.req),
      noindex: tenant.slug === "demo",
    },
  };
  });
}

function parsePreviewView(value: unknown): MenuViewMode | null {
  const view = Array.isArray(value) ? value[0] : value;
  return view === "list" || view === "carousel" ? view : null;
}
