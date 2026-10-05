import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import Image from "next/image";

import { animate } from "motion";
import {
  Button,
  Card,
  Layout,
  Typography,
  Tag,
  theme,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

import { DishLayout } from "../../../components/layouts";
import { AllergenIcon } from "@/components/ui/AllergenIcon";
import { TMenuItem, TMenuSection, TRestaurant } from "@/types/dish";
import styles from "../../../styles/dishDetailsCard.module.css";
import themeStyles from "../../../styles/theme-colors.module.css";
import { absoluteUrl, publicOrigin } from "@/seo/site";

const ModelViewer = dynamic(
  () => import("../../../components/products/ModelViewer").then((m) => ({ default: m.ModelViewer })),
  { ssr: false }
);

interface IDishes {
  dish: TMenuItem;
  themeColors?: any;
  restaurantData?: any;
  footerText?: string;
  restaurantName?: string;
  canonicalUrl?: string;
}

const Dish = (props: IDishes) => {
  const { dish, themeColors, restaurantData, footerText, restaurantName, canonicalUrl } = props;
  const router = useRouter();

  const { useToken } = theme;
  const { token } = useToken();
  
  // Estrai i colori delle card dal tema
  const cardColors = themeColors?.card || {};
  const bestSellerColor = cardColors.bestSellerTagColor || token.colorInfo;
  const productNameColor = cardColors.productNameColor || '#ffffff';
  const ingredientsColor = cardColors.ingredientsColor || '#d9d9d9';
  const detailsIngredientsColor = cardColors.detailsIngredientsColor || cardColors.ingredientsColor || '#d9d9d9';
  const subtitleColor = cardColors.subtitleColor || '#ffffff';
  const descriptionTextColor = cardColors.descriptionTextColor || cardColors.ingredientsColor || '#d9d9d9';
  const detailsButtonBg = cardColors.detailsButtonBackground || '#303030';
  const detailsButtonIcon = cardColors.detailsButtonIcon || '#ffffff';
  const shadowColor = cardColors.shadowColor || '#000000';
  const shadowOpacity = cardColors.shadowOpacity !== undefined ? cardColors.shadowOpacity : 0.1;
  const hoverShadowOpacity = cardColors.hoverShadowOpacity !== undefined ? cardColors.hoverShadowOpacity : 0.15;
  const borderRadius = cardColors.borderRadius !== undefined ? cardColors.borderRadius : 12;
  // Usa i valori specifici per i dettagli se disponibili, altrimenti usa i valori generali della card
  const borderColor = cardColors.detailsBorderColor !== undefined ? cardColors.detailsBorderColor : (cardColors.borderColor || '#d9d9d9');
  const borderWidth = cardColors.detailsBorderWidth !== undefined ? cardColors.detailsBorderWidth : (cardColors.borderWidth !== undefined ? cardColors.borderWidth : 1);
  const allergenTagColor = cardColors.allergenTagColor || '#ff9800';
  const allergenTextColor = cardColors.allergenTextColor || '#ffffff';
  const priceColor = cardColors.priceColor || '#8a6a2e';
  const sameCopy =
    String(dish?.ingredients || "").trim().toLowerCase() ===
    String(dish?.description || "").trim().toLowerCase();
  const price = dish?.prices?.[0]?.price;
  
  // Converti shadowColor hex a RGB per rgba
  const shadowRgb = shadowColor.startsWith('#') 
    ? `${parseInt(shadowColor.slice(1, 3), 16)}, ${parseInt(shadowColor.slice(3, 5), 16)}, ${parseInt(shadowColor.slice(5, 7), 16)}`
    : '0, 0, 0';

  useEffect(() => {
    animate(
      ".cardDescriptionAnimation",
      { opacity: [0, 1] },
      { duration: 0.9 }
    );
  }, []);

  return (
    <DishLayout
      title={restaurantName ? `${dish?.name} — ${restaurantName}` : dish?.name}
      pageDescription={
        dish?.ingredients ||
        dish?.description ||
        (restaurantName ? `Piatto del menu di ${restaurantName}` : "Piatto del menu")
      }
      imageUrl={dish.imageUrl}
      restaurantData={restaurantData}
      themeColors={themeColors}
      footerText={footerText}
      restaurantName={restaurantName}
      canonicalUrl={canonicalUrl}
    >
      <Content>
        <main>
          <div
            className={themeStyles.cardWrapper}
            style={{
              '--best-seller-color': bestSellerColor,
              '--details-button-bg': detailsButtonBg,
              '--details-button-icon': detailsButtonIcon,
              '--product-name-color': productNameColor,
              '--ingredients-color': ingredientsColor,
              '--details-ingredients-color': detailsIngredientsColor,
              '--subtitle-color': subtitleColor,
              '--description-text-color': descriptionTextColor,
              '--shadow-rgb': shadowRgb,
              '--shadow-opacity': shadowOpacity,
              '--hover-shadow-opacity': hoverShadowOpacity,
              '--card-border-radius': `${borderRadius}px`,
              '--allergen-tag-color': allergenTagColor,
              '--allergen-text-color': allergenTextColor,
            } as React.CSSProperties}
          >
          <Card
            className={`${styles.card} ${themeStyles.cardWithShadow} ${themeStyles.cardBorderRadius} cardDescriptionAnimation`}
            style={{
              borderColor: borderColor,
              borderWidth: `${borderWidth}px`,
              borderStyle: 'solid',
            }}
            cover={
              dish?.mediaType === "model3d" && dish?.imageUrl ? (
                <ModelViewer modelUrl={dish.imageUrl} scale={5} lights={themeColors?.modelViewer} />
              ) : dish?.imageUrl ? (
                <Image
                  className={styles.image}
                  style={{ borderRadius: "0px", objectFit: "cover" }}
                  alt={dish?.name || ""}
                  src={dish.imageUrl}
                  width={720}
                  height={420}
                />
              ) : null
            }
          >
            <div className={styles.bodyCard}>
              {dish?.bestSeller && (
                <Tag className={`${styles.bestSellerTag} ${themeStyles.bestSellerTag}`}>
                  Consigliato
                </Tag>
              )}
              <Title
                className={`${styles.dishName} ${themeStyles.productName}`}
                level={1}
              >
                {dish?.name}
              </Title>
              {price !== undefined ? (
                <span className={styles.price} style={{ color: priceColor }}>
                  €{Number(price).toFixed(Number(price) % 1 ? 2 : 0)}
                </span>
              ) : null}

              {dish?.ingredients ? (
                <Paragraph
                  className={styles.lead}
                  style={{ color: descriptionTextColor }}
                >
                  {dish.ingredients}
                </Paragraph>
              ) : null}

              {dish?.description && !sameCopy ? (
                <>
                  <Text className={styles.subtitle} style={{ color: subtitleColor }}>
                    Note
                  </Text>
                  <Paragraph
                    className={styles.paragraph}
                    style={{ color: detailsIngredientsColor }}
                  >
                    {dish.description}
                  </Paragraph>
                </>
              ) : null}

              {dish?.allergens && dish.allergens.length > 0 && (
                <>
                  <Text className={styles.subtitle} style={{ color: subtitleColor }}>
                    Allergeni
                  </Text>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {dish.allergens.map((allergen: string, index: number) => (
                      <Tag key={index} className={styles.allergenTag}>
                        <span className="flex items-center gap-1">
                          <AllergenIcon allergen={allergen} size={14} />
                          {allergen}
                        </span>
                      </Tag>
                    ))}
                  </div>
                </>
              )}

              <Button
                onClick={() => router.push("/dishes")}
                icon={<ArrowLeftOutlined />}
                className={styles.backButton}
                style={{
                  background: detailsButtonBg,
                  color: detailsButtonIcon,
                  border: 0,
                }}
                type="text"
                size="large"
              >
                Torna al menu
              </Button>
            </div>
          </Card>
          </div>
        </main>
      </Content>
    </DishLayout>
  );
};

export default Dish;


import { loadRestaurantData } from "@/utils/dataLoader";
import { getTenantBySlug, slugFromHost, withTenantPage } from "@/server/tenant";

export async function getServerSideProps(context: any) {
  const tenant = getTenantBySlug(slugFromHost(context.req?.headers.host));
  if (!tenant) return { notFound: true };
  return withTenantPage(context.req, () => {
  // Cache per 60 secondi invece di disabilitarla completamente
  context.res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');

  const { params } = context;
  const slug = params.id;

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

  const footerText = dishes?.footerText || "";
  const restaurantName = dishes?.name || "";
  
  // Estrai i dati del ristorante
  const restaurantData = {
    name: dishes?.name || "",
    logoType: dishes?.logoType || "text",
    logoUrl: dishes?.logoUrl || "",
    logoWidth: dishes?.logoWidth || 150,
    logoHeight: dishes?.logoHeight || 50,
  };
  
  // Cerca il piatto nei prodotti
  const dish = menuProducts.find((item: any) => item.id === slug);
  
  // Se non trovato, ritorna 404
  if (!dish) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      dish,
      themeColors: themeColors,
      restaurantData: restaurantData,
      footerText: footerText,
      restaurantName: restaurantName,
      canonicalUrl: absoluteUrl(publicOrigin(context.req?.headers.host), `/dishes/${slug}`),
    },
  };
  });
}
