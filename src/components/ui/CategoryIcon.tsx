import React from 'react';
import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON, normalizeCategoryIconId } from '@/constants/categoryIcons';

/** Icona SVG custom di una categoria (viewBox 24x24, brand kit). Il colore
 * segue la CSS `color` ereditata (stroke="currentColor"), non va forzato qui. */
export const CategoryIcon: React.FC<{ icon?: string; size?: number; className?: string }> = ({
  icon,
  size = 20,
  className,
}) => {
  const id = normalizeCategoryIconId(icon);
  const def = CATEGORY_ICONS.find((item) => item.id === id) || CATEGORY_ICONS.find((item) => item.id === DEFAULT_CATEGORY_ICON);
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
      dangerouslySetInnerHTML={{ __html: def?.svgPath || '' }}
    />
  );
};

export default CategoryIcon;
