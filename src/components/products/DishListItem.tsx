import { useRouter } from "next/router";
import { TMenuItem } from "@/types/dish";
import { bestTextOn, isHexColor } from "@/utils/colorContrast";
import styles from "../../styles/dishList.module.css";

interface DishListItemProps extends TMenuItem {
  themeColors?: any;
}

function formatPrice(price: number) {
  return `€${Number(price).toFixed(Number(price) % 1 ? 2 : 0)}`;
}

function isSoldOut(soldOutUntil?: number | null) {
  if (soldOutUntil == null) return false;
  if (soldOutUntil === 0) return true;
  return Date.now() < soldOutUntil;
}

export function DishListItem({
  id,
  name,
  ingredients,
  prices,
  imageUrl,
  mediaType = "image",
  bestSeller,
  soldOutUntil,
  themeColors,
}: DishListItemProps) {
  const router = useRouter();
  const card = themeColors?.card || {};
  const nameColor = card.productNameColor || "#1c1610";
  const priceColor = card.priceColor || "#8a6a2e";
  const ingredientsColor = card.ingredientsColor || "#6a5e52";
  const tagBg = card.bestSellerTagColor || "#8a6a2e";
  // Il testo del badge va calcolato contro il SUO sfondo (tagBg): prima riusava
  // allergenTextColor, pensato per lo sfondo brandDark — combinazione sbagliata
  // che con certi brand medi produceva testo chiaro su fondo chiaro.
  const tagText =
    card.bestSellerTextColor ||
    (isHexColor(tagBg) ? bestTextOn(tagBg, "#fffaf3", "#1a1a17") : "#fffaf3");
  const radius = card.borderRadius !== undefined ? card.borderRadius : 16;
  const border = card.borderColor || "rgba(28, 22, 16, 0.08)";
  const price = prices?.[0]?.price;
  const showImage = mediaType !== "model3d" && Boolean(imageUrl);
  const soldOut = isSoldOut(soldOutUntil);

  return (
    <button
      type="button"
      className={`${styles.row} ${soldOut ? styles.soldOut : ''}`}
      onClick={() => router.push(`/dishes/${id}`)}
      style={{ borderRadius: radius, borderColor: border }}
    >
      {showImage ? (
        <img className={styles.thumb} src={imageUrl} alt={`Foto di ${name}`} width={104} height={104} loading="lazy" />
      ) : null}
      <div className={styles.body}>
        {soldOut ? <span className={styles.tagSoldOut}>Finito</span> : null}
        {!soldOut && bestSeller ? (
          <span className={styles.tag} style={{ background: tagBg, color: tagText }}>
            Consigliato
          </span>
        ) : null}
        <div className={styles.top}>
          <h3 className={styles.name} style={{ color: nameColor }}>
            {name}
          </h3>
          {price !== undefined ? (
            <span className={styles.price} style={{ color: priceColor }}>
              {formatPrice(Number(price))}
            </span>
          ) : null}
        </div>
        {ingredients ? (
          <p className={styles.ingredients} style={{ color: ingredientsColor }}>
            {ingredients}
          </p>
        ) : null}
      </div>
    </button>
  );
}
