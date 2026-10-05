import HomePage from "./home";
import { GetServerSideProps } from "next";
import { loadRestaurantData } from "@/utils/dataLoader";
import { getTenantBySlug, slugFromHost, withTenantPage } from "@/server/tenant";
import { isMarketingHost } from "@/utils/hosts";
import { MarketingHome } from "@/components/marketing/MarketingHome";
import { absoluteUrl, MCC_MENU_BACKGROUND, publicOrigin } from "@/seo/site";
import { isProductSoldOut, loadProducts } from "@/server/menuStore";

export default function Home({ marketing, restaurantData, themeColors, footerText, canonicalUrl, featuredDishes, noindex }: any) {
  if (marketing) return <MarketingHome />;
  return (
    <HomePage
      restaurantData={restaurantData}
      themeColors={themeColors}
      footerText={footerText}
      canonicalUrl={canonicalUrl}
      featuredDishes={featuredDishes}
      noindex={noindex}
    />
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  if (isMarketingHost(ctx.req.headers.host)) {
    return { props: { marketing: true } };
  }
  const tenant = getTenantBySlug(slugFromHost(ctx.req.headers.host));
  if (!tenant) return { notFound: true };
  return withTenantPage(ctx.req, () => {
  // Usa la funzione ottimizzata con cache
  const {
    restaurantInfo,
    restaurantContacts,
    restaurantSocial,
    themeLayout,
    themeColors,
  } = loadRestaurantData();

  // Combina i dati
  const dishes: any = {
    ...restaurantInfo,
    ...restaurantContacts,
    social: restaurantSocial,
    ...themeLayout,
    themeColors,
  };

  const featuredDishes = loadProducts()
    .filter((p) => p.bestSeller && !isProductSoldOut(p))
    .slice(0, 3)
    .map((p) => ({ id: p.id, name: p.name, price: p.price, imageUrl: p.imageUrl }));

  return {
    props: {
      restaurantData: {
        name: dishes?.name || "menucolcodice.it",
        description: dishes?.description || "",
        address: {
          street: dishes?.address?.street || "",
          city: dishes?.address?.city || "",
          state: dishes?.address?.state || "",
          postalCode: dishes?.address?.postalCode || "",
        },
        phone: dishes?.phone || "",
        email: dishes?.email || "",
        openingHours: dishes?.openingHours || "",
        homeBackgroundUrl: dishes?.homeBackgroundUrl || MCC_MENU_BACKGROUND,
        homeBackgroundType: dishes?.homeBackgroundType || "image",
        homeBackgroundVideoUrl: dishes?.homeBackgroundVideoUrl || "",
        logoType: dishes?.logoType || "text",
        logoUrl: dishes?.logoUrl || "",
        logoWidth: dishes?.logoWidth || 150,
        logoHeight: dishes?.logoHeight || 50,
        social: {
          facebook: dishes?.social?.facebook || "",
          instagram: dishes?.social?.instagram || "",
          whatsapp: dishes?.social?.whatsapp || "",
        },
      },
      themeColors: themeColors || {},
      footerText: dishes?.footerText || "",
      canonicalUrl: absoluteUrl(publicOrigin(ctx.req.headers.host), "/"),
      featuredDishes,
      noindex: tenant.slug === "demo",
    },
  };
  });
};
