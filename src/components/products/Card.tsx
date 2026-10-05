import { useRouter } from "next/router";
import dynamic from "next/dynamic";

import { Button, Card, theme, Typography, Tag, Tooltip } from "antd";
const { Title, Paragraph } = Typography;
import { ArrowRightOutlined } from "@ant-design/icons";

import { PriceNameType, TMenuItem, TPriceOption } from "@/types/dish";
import { bestTextOn, isHexColor } from "@/utils/colorContrast";
import styles from "../../styles/dishCard.module.css";
import themeStyles from "../../styles/theme-colors.module.css";

const ModelViewer = dynamic(
  () => import("./ModelViewer").then((m) => ({ default: m.ModelViewer })),
  { ssr: false }
);

interface PlateCardProps extends TMenuItem {
  cardBackground?: string;
  cardBackgroundOpacity?: number;
  themeColors?: any;
  squareMedia?: boolean;
}

export const PlateCard = ({
  id,
  name,
  ingredients,
  prices,
  imageUrl,
  mediaType = 'image',
  bestSeller,
  soldOutUntil,
  cardBackground,
  cardBackgroundOpacity = 1,
  themeColors,
  squareMedia = false,
}: PlateCardProps) => {
  const router = useRouter();
  const { useToken } = theme;
  const { token } = useToken();
  
  const cardColors = themeColors?.card || {};
  // Usa cardBackground dalla prop o da themeColors
  const finalCardBackground = cardBackground || cardColors.backgroundImage || '';
  const finalCardBackgroundOpacity = cardBackgroundOpacity !== undefined ? cardBackgroundOpacity : (cardColors.backgroundOpacity !== undefined ? cardColors.backgroundOpacity : 1);
  
  // Prepara i colori per le CSS custom properties
  const bestSellerColor = cardColors.bestSellerTagColor || token.colorInfo;
  // Testo del badge contro il suo sfondo reale; i temi salvati prima di questo
  // campo non lo hanno: si ricalcola al volo invece di cadere sul bianco fisso.
  const bestSellerTextColor =
    cardColors.bestSellerTextColor ||
    (isHexColor(bestSellerColor) ? bestTextOn(bestSellerColor, '#fffaf3', '#1a1a17') : '#ffffff');
  const productNameColor = cardColors.productNameColor || '#ffffff';
  const priceColor = cardColors.priceColor || '#cc1f00';
  const ingredientsColor = cardColors.ingredientsColor || '#d9d9d9';
  const detailsButtonBg = cardColors.detailsButtonBackground || '#303030';
  const detailsButtonIcon = cardColors.detailsButtonIcon || '#ffffff';
  const soldOut =
    soldOutUntil === 0 || (soldOutUntil != null && soldOutUntil > Date.now());
  const shadowColor = cardColors.shadowColor || '#000000';
  const shadowOpacity = cardColors.shadowOpacity !== undefined ? cardColors.shadowOpacity : 0.1;
  const hoverShadowOpacity = cardColors.hoverShadowOpacity !== undefined ? cardColors.hoverShadowOpacity : 0.15;
  const borderRadius = cardColors.borderRadius !== undefined ? cardColors.borderRadius : 12;
  const borderColor = cardColors.borderColor || '#d9d9d9';
  const borderWidth = cardColors.borderWidth !== undefined ? cardColors.borderWidth : 1;
  
  // Converti shadowColor hex a RGB per rgba
  const shadowRgb = shadowColor.startsWith('#') 
    ? `${parseInt(shadowColor.slice(1, 3), 16)}, ${parseInt(shadowColor.slice(3, 5), 16)}, ${parseInt(shadowColor.slice(5, 7), 16)}`
    : '0, 0, 0';
  
  // Funzione helper per convertire hex a rgba (mantenuta per compatibilità)
  const hexToRgba = (hex: string, opacity: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  const handleDetailsClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    router.push(`/dishes/${id}`);
  };

  const handlePriceName = (name: string) => {
    switch (name) {
      case PriceNameType.STANDARD:
        return "";

      case PriceNameType.TWELVEOZ:
        return "12Oz: ";

      case PriceNameType.SIXTEENOZ:
        return "16Oz: ";

      default:
        return `${name.charAt(0).toUpperCase() + name.slice(1)}: `;
    }
  };

  // Determina lo stile dello sfondo
  const getCardBackgroundStyle = () => {
    if (!finalCardBackground) return {};
    
    // Se è un URL (inizia con http o /)
    if (finalCardBackground.startsWith('http') || finalCardBackground.startsWith('/')) {
      return {
        position: 'relative' as const,
      };
    }
    
    // Se è un colore (hex, rgb, etc.)
    // Converti il colore in rgba per gestire l'opacità
    const rgbaColor = finalCardBackground.startsWith('#') 
      ? `rgba(${parseInt(finalCardBackground.slice(1, 3), 16)}, ${parseInt(finalCardBackground.slice(3, 5), 16)}, ${parseInt(finalCardBackground.slice(5, 7), 16)}, ${finalCardBackgroundOpacity})`
      : finalCardBackground;
    
    return {
      backgroundColor: rgbaColor,
    };
  };

  // Stile per l'overlay dell'immagine di sfondo
  const getBackgroundImageStyle = () => {
    if (!finalCardBackground) return {};
    
    // Se è un URL (inizia con http o /)
    if (finalCardBackground.startsWith('http') || finalCardBackground.startsWith('/')) {
      return {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `url(${finalCardBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        opacity: finalCardBackgroundOpacity,
        zIndex: 0,
        borderRadius: `${borderRadius}px`,
        pointerEvents: 'none' as const,
      };
    }
    
    return {};
  };

  return (
    <div 
      className={`${styles.cardWrapper} ${themeStyles.cardWrapper} plate-card`}
      onClick={() => router.push(`/dishes/${id}`)}
      style={{
        cursor: 'pointer',
        '--best-seller-color': bestSellerColor,
        '--best-seller-text-color': bestSellerTextColor,
        '--details-button-bg': detailsButtonBg,
        '--details-button-icon': detailsButtonIcon,
        '--product-name-color': productNameColor,
        '--price-color': priceColor,
        '--ingredients-color': ingredientsColor,
        '--shadow-rgb': shadowRgb,
        '--shadow-opacity': shadowOpacity,
        '--hover-shadow-opacity': hoverShadowOpacity,
        '--card-border-radius': `${borderRadius}px`,
      } as React.CSSProperties}
    >
      <Card 
        className={`${styles.card} ${themeStyles.cardWithShadow} ${themeStyles.cardBorderRadius}`}
        style={{
          ...getCardBackgroundStyle(),
          position: 'relative',
          overflow: 'hidden',
          borderColor: borderColor,
          borderWidth: `${borderWidth}px`,
          borderStyle: 'solid',
        }}
      >
      {finalCardBackground && (finalCardBackground.startsWith('http') || finalCardBackground.startsWith('/')) && (
        <div style={{ ...getBackgroundImageStyle(), zIndex: 0, pointerEvents: 'none' }} />
      )}
      {(mediaType === 'model3d' || imageUrl) ? (
      <div
        className={`${styles.media} ${squareMedia ? `${styles.mediaSquare} plate-card-media-square` : ''}`}
      >
        {mediaType === 'model3d' ? (
          <div className={styles.image}>
            <ModelViewer
              modelUrl={imageUrl}
              height={squareMedia ? undefined : 168}
              fill={squareMedia}
              scale={3}
              rotation={[0.15, 0.4, 0]}
              lights={themeColors?.modelViewer}
            />
          </div>
        ) : (
          <img
            className={styles.image}
            alt={`Foto di ${name}`}
            src={imageUrl}
            width={squareMedia ? undefined : 280}
            height={squareMedia ? undefined : 168}
            decoding="async"
            loading="lazy"
          />
        )}
      </div>
      ) : null}
      <div className={`${styles.bodyCard} plate-card-body`} style={{ position: 'relative', zIndex: 2, backgroundColor: 'transparent', opacity: soldOut ? 0.55 : 1 }}>
        {soldOut ? (
          <Tag className={`${styles.bestSellerTag} ${themeStyles.bestSellerTag}`} style={{ background: 'rgba(28,22,16,0.55)' }}>
            Finito
          </Tag>
        ) : null}
        {!soldOut && bestSeller && (
          <Tag
            className={`${styles.bestSellerTag} ${themeStyles.bestSellerTag}`}
          >
            Consigliato
          </Tag>
        )}

        <Title level={3} className={themeStyles.productName} style={soldOut ? { textDecoration: 'line-through' } : undefined}>{name}</Title>

        <Paragraph
          className={`${styles.ingredients} ${themeStyles.ingredients}`}
        >
          {ingredients}
        </Paragraph>

        <div className={styles.cardFooter}>
          <div className={styles.pricesContainer}>
            {prices.map(({ name, price }: TPriceOption, idx) => (
              <Paragraph key={`${name}-${price}-${idx}`}>
                <span className={themeStyles.price}>€{price}</span>
              </Paragraph>
            ))}
          </div>
          <Tooltip title="Dettagli">
            <Button
              onClick={handleDetailsClick}
              icon={<ArrowRightOutlined style={{ fontSize: "13px" }} />}
              className={`${styles.detailsButton} ${themeStyles.detailsButton}`}
              type="text"
              size="large"
              aria-label="Dettagli"
            />
          </Tooltip>
        </div>
      </div>
    </Card>
    </div>
  );
};
