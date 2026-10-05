/** Funzioni colore client-safe (senza fs) per preset grafica. */

function clamp(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((n) => clamp(n).toString(16).padStart(2, '0')).join('')}`;
}

function mixHex(a: string, b: string, amount: number) {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(ar + (br - ar) * amount, ag + (bg - ag) * amount, ab + (bb - ab) * amount);
}

function luminance(hex: string) {
  const [r, g, b] = hexToRgb(hex).map((n) => n / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function onColor(hex: string) {
  return luminance(hex) < 0.48 ? '#ffffff' : '#111111';
}

function saturation(hex: string) {
  const [r, g, b] = hexToRgb(hex).map((n) => n / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

export function parseColor(input: string): string | null {
  const raw = String(input || '').trim().toLowerCase();
  if (!raw) return null;
  const hex = raw.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1];
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    return `#${full.toLowerCase()}`;
  }
  return null;
}

export function themeFromBrand(primary: string, pageBg?: string) {
  const p = parseColor(primary) || '#0c5648';
  const metallic = luminance(p) >= 0.38 && saturation(p) >= 0.22;
  const chrome = metallic || luminance(p) > 0.62 ? '#111111' : p;
  const page = parseColor(pageBg || '') || (metallic ? mixHex(p, '#fffaf3', 0.88) : mixHex(p, '#ffffff', 0.78));
  const dark = mixHex(p, '#000000', 0.28);
  const soft = mixHex(p, '#ffffff', 0.35);
  const onP = onColor(p);
  const onChrome = '#ffffff';
  const accentOnChrome = metallic ? p : onP;
  const onPage = onColor(page);
  const muted = luminance(page) < 0.45 ? mixHex(page, '#ffffff', 0.55) : '#616161';
  return {
    layout: {
      background: page,
      homeButtonColor: p,
      homeButtonTextColor: onP,
    },
    navbar: {
      background: chrome,
      logoColor: accentOnChrome,
      textColor: onChrome,
      buttonBackground: dark,
      buttonText: onP,
      buttonHover: mixHex(p, '#ffffff', 0.22),
      iconColor: accentOnChrome,
    },
    sidebar: {
      background: chrome,
      titleColor: onChrome,
      menuItemBackground: mixHex(chrome, '#ffffff', 0.12),
      menuItemColor: onChrome,
      menuItemActive: dark,
      menuItemHover: mixHex(chrome, p, 0.35),
      iconColor: accentOnChrome,
    },
    drawer: {
      background: soft,
      titleColor: dark,
      menuItemColor: onP,
      footerTextColor: dark,
    },
    card: {
      backgroundColor: mixHex(p, '#ffffff', 0.42),
      bestSellerTagColor: p,
      productNameColor: dark,
      priceColor: dark,
      ingredientsColor: onPage,
      detailsButtonBackground: dark,
      detailsButtonIcon: onP,
      subtitleColor: dark,
      detailsIngredientsColor: muted,
      descriptionTextColor: muted,
      borderColor: p,
      detailsBorderColor: onP,
      allergenTagColor: onP,
      allergenTextColor: p,
    },
    sections: {
      titleColor: dark,
      descriptionColor: muted,
    },
    footer: {
      background: chrome,
      textColor: onChrome,
    },
  };
}
