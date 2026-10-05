import React from 'react';
import { ALLERGENS } from '@/constants/allergens';

/** Icona SVG custom di un allergene, cercata per testo esteso o forma breve
 * (i piatti salvano dish.allergens con la forma estesa, il form admin con quella breve). */
export const AllergenIcon: React.FC<{ allergen?: string; size?: number; className?: string }> = ({
  allergen,
  size = 16,
  className,
}) => {
  const needle = String(allergen || '').trim().toLowerCase();
  const def = ALLERGENS.find((item) => item.full.toLowerCase() === needle || item.short.toLowerCase() === needle);
  if (!def) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      className={className}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: def.icon }}
    />
  );
};

export default AllergenIcon;
