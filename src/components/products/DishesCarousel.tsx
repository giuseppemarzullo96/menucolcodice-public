"use client";

import { useState, useRef } from "react";
import { PlateCard } from "./Card";
import { TMenuItem } from "@/types/dish";
import styles from "../../styles/carousel.module.css";

export interface DishesCarouselProps {
  items: TMenuItem[];
  themeColors?: any;
  cardBackground?: string;
  cardBackgroundOpacity?: number;
}

export function DishesCarousel({
  items,
  themeColors,
  cardBackground,
  cardBackgroundOpacity,
}: DishesCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const n = items.length;
  const dotColor =
    themeColors?.card?.borderColor ||
    themeColors?.navbar?.background ||
    "#7b5c3a";

  const updateIndex = () => {
    const el = scrollerRef.current;
    if (!el || !el.children.length) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < el.children.length; i += 1) {
      const child = el.children[i] as HTMLElement;
      const mid = child.offsetLeft + child.offsetWidth / 2;
      const dist = Math.abs(mid - center);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    setCurrentIndex(best);
  };

  const goTo = (index: number) => {
    const el = scrollerRef.current;
    const child = el?.children[index] as HTMLElement | undefined;
    if (!el || !child) return;
    el.scrollTo({ left: child.offsetLeft - (el.clientWidth - child.offsetWidth) / 2, behavior: "smooth" });
    setCurrentIndex(index);
  };

  if (!items?.length) return null;

  return (
    <div
      className={styles.carouselWrapper}
      style={{ "--carousel-dot": dotColor } as React.CSSProperties}
      role="region"
      aria-label="Carousel piatti"
    >
      <div
        className={styles.scroller}
        ref={scrollerRef}
        onScroll={updateIndex}
      >
        {items.map((item) => (
          <div className={styles.slide} key={item.id}>
            <PlateCard
              {...item}
              squareMedia
              cardBackground={cardBackground}
              cardBackgroundOpacity={cardBackgroundOpacity}
              themeColors={themeColors}
            />
          </div>
        ))}
      </div>

      {n > 1 && (
        <div className={styles.nav}>
          <div className={styles.dots} role="tablist" aria-label="Seleziona piatto">
            {items.map((item, i) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={i === currentIndex}
                aria-label={`Vai al piatto ${i + 1}`}
                className={`${styles.dot} ${i === currentIndex ? styles.dotActive : ""}`}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
