import fs from 'fs';
import path from 'path';
import { invalidateCache, loadRestaurantData } from '@/utils/dataLoader';
import { tenantDataDir } from '@/server/tenant';
import { bestTextOn, contrastRatio } from '@/utils/colorContrast';

function escapeString(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

function tsValue(value: any, indent: string): string {
  if (value === null || value === undefined) return '""';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'string') return `"${escapeString(value)}"`;
  if (Array.isArray(value)) {
    return `[${value.map((item) => (typeof item === 'number' ? String(item) : tsValue(item, indent))).join(', ')}]`;
  }
  const inner = `${indent}  `;
  const lines = Object.entries(value).map(([key, nested]) => `${inner}${key}: ${tsValue(nested, inner)},`);
  return `{\n${lines.join('\n')}\n${indent}}`;
}

function writeTsConst(filePath: string, exportName: string, value: any) {
  const body = tsValue(value, '');
  fs.writeFileSync(filePath, `export const ${exportName} = ${body};\n`, 'utf8');
}

function deepMerge<T extends Record<string, any>>(base: T, patch: Record<string, any>): T {
  const out: Record<string, any> = { ...base };
  for (const [key, value] of Object.entries(patch || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value) && typeof out[key] === 'object' && out[key] && !Array.isArray(out[key])) {
      out[key] = deepMerge(out[key], value);
    } else if (value !== undefined) {
      out[key] = value;
    }
  }
  return out as T;
}

export type RestaurantPatch = {
  info?: Record<string, any>;
  contacts?: Record<string, any>;
  social?: Record<string, any>;
  layout?: Record<string, any>;
  colors?: Record<string, any>;
  /** Sostituisce anagrafica/social/contatti: i campi assenti vanno a vuoto. */
  replaceProfile?: boolean;
};

const EMPTY_SOCIAL = {
  facebook: '',
  instagram: '',
  whatsapp: '',
  glovo: '',
  deliveroo: '',
  justeat: '',
};

const EMPTY_CONTACTS = {
  phone: '',
  email: '',
  website: '',
};

const EMPTY_ADDRESS = {
  street: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'Italia',
};

export function currentRestaurant() {
  return loadRestaurantData();
}

export function patchRestaurant(patch: RestaurantPatch) {
  const current = loadRestaurantData();
  let info = deepMerge(current.restaurantInfo || {}, patch.info || {});
  if (patch.replaceProfile && patch.info) {
    info = {
      ...(current.restaurantInfo || {}),
      ...patch.info,
      menuShareImageUrl: patch.info.menuShareImageUrl ?? '',
    };
  }
  if (patch.info?.address) {
    info.address = patch.replaceProfile
      ? { ...EMPTY_ADDRESS, ...patch.info.address }
      : { ...(current.restaurantInfo?.address || {}), ...patch.info.address };
  }
  const contacts = patch.replaceProfile
    ? { ...EMPTY_CONTACTS, ...(patch.contacts || {}) }
    : deepMerge(current.restaurantContacts || {}, patch.contacts || {});
  const social = patch.replaceProfile
    ? { ...EMPTY_SOCIAL, ...(patch.social || {}) }
    : deepMerge(current.restaurantSocial || {}, patch.social || {});
  const layout = deepMerge(current.themeLayout || {}, patch.layout || {});
  const colors = deepMerge(current.themeColors || {}, patch.colors || {});

  const base = tenantDataDir();
  writeTsConst(path.join(base, 'restaurant', 'info.ts'), 'restaurantInfo', info);
  writeTsConst(path.join(base, 'restaurant', 'contacts.ts'), 'restaurantContacts', contacts);
  writeTsConst(path.join(base, 'restaurant', 'social.ts'), 'restaurantSocial', social);
  writeTsConst(path.join(base, 'theme', 'layout.ts'), 'themeLayout', layout);
  writeTsConst(path.join(base, 'theme', 'colors.ts'), 'themeColors', colors);
  invalidateCache(base);
  return { info, contacts, social, layout, colors };
}

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

/**
 * Luminanza "grezza" (senza correzione gamma): resta SOLO per le euristiche
 * estetiche già calibrate su di essa (metallic, chrome scuro/chiaro, muted).
 * Le decisioni di LEGGIBILITÀ usano contrastRatio/bestTextOn (WCAG) da
 * @/utils/colorContrast: la formula grezza sbaglia proprio nei casi borderline.
 */
function luminance(hex: string) {
  const [r, g, b] = hexToRgb(hex).map((n) => n / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function onColor(hex: string) {
  return bestTextOn(hex, '#ffffff', '#111111');
}

function saturation(hex: string) {
  const [r, g, b] = hexToRgb(hex).map((n) => n / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

export function fitLogoSize(width: number, height: number) {
  const maxH = 52;
  const maxW = 200;
  const minH = 28;
  const minW = 40;
  if (!width || !height) return { logoWidth: 160, logoHeight: 52 };
  const ratio = width / height;
  let h = maxH;
  let w = Math.round(h * ratio);
  if (w > maxW) {
    w = maxW;
    h = Math.round(w / ratio);
  }
  // Clamp minimi con RICALCOLO dell'altra dimensione: prima il clamp secco
  // sull'altezza distorceva l'aspect ratio dei loghi molto larghi, e i loghi
  // molto stretti finivano salvati con larghezze di pochi pixel.
  if (h < minH) {
    h = minH;
    w = Math.min(maxW, Math.round(h * ratio));
  }
  if (w < minW) {
    w = minW;
    h = Math.min(maxH, Math.round(w / ratio));
  }
  return { logoWidth: w, logoHeight: h };
}

const COLOR_NAMES: Record<string, string> = {
  rosso: '#c0392b',
  'rosso scuro': '#7b1e1e',
  bordeaux: '#6b1326',
  blu: '#1a4b8c',
  'blu scuro': '#0d2c5a',
  azzurro: '#3498db',
  verde: '#0c5648',
  'verde scuro': '#084036',
  'verde acqua': '#7fb8ad',
  menta: '#a1cec6',
  nero: '#111111',
  bianco: '#f7f7f7',
  panna: '#f4efe6',
  oro: '#c9a227',
  giallo: '#f1c40f',
  arancio: '#e67e22',
  arancione: '#e67e22',
  viola: '#6c3483',
  rosa: '#e91e63',
  marrone: '#6d4c41',
  beige: '#e8dcc8',
  crema: '#f3e6d0',
  grigio: '#7f8c8d',
  'grigio scuro': '#2c3e50',
  turchese: '#1abc9c',
  petrolio: '#0a5648',
  senape: '#e0a32e',
  ocra: '#c07f28',
  corallo: '#e8604c',
  salmone: '#f28b82',
  lime: '#a4c639',
  ciano: '#00a5ad',
};

export function parseColor(input: string): string | null {
  // Nel wizard guidato si scrive solo il colore ("verde"), ma lo shortcut standalone
  // insegna la sintassi "colore verde": accettare anche il prefisso qui evita di dover
  // ricordare due sintassi diverse a seconda di dove ci si trova.
  const raw = String(input || '')
    .trim()
    .toLowerCase()
    .replace(/^(colore|colori)\s+/, '');
  if (!raw) return null;
  if (COLOR_NAMES[raw]) return COLOR_NAMES[raw];
  const hex = raw.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1];
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    return `#${full.toLowerCase()}`;
  }
  const rgb = raw.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
  if (rgb) return rgbToHex(Number(rgb[1]), Number(rgb[2]), Number(rgb[3]));
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
      bestSellerTextColor: onP,
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

export type ThemePalette = {
  brand: string;
  brandDark: string;
  brandSoft: string;
  page: string;
  surface: string;
  chrome: string;
  chromeText: string;
  accent: string;
  ink: string;
  muted: string;
  button: string;
  buttonText: string;
};

function contrastOn(bg: string, preferLight = '#f7f3ec', preferDark = '#16120e') {
  return bestTextOn(bg, preferLight, preferDark);
}

/** Tiene fg solo se regge il contrasto AA (4.5:1) contro lo sfondo reale. */
function pickReadable(bg: string, fg: string, preferLight = '#f7f3ec', preferDark = '#16120e') {
  const parsed = parseColor(fg);
  if (!parsed) return contrastOn(bg, preferLight, preferDark);
  if (contrastRatio(bg, parsed) < 4.5) {
    return contrastOn(bg, preferLight, preferDark);
  }
  return parsed;
}

export function themeFromPalette(raw: Partial<ThemePalette>) {
  const brand = parseColor(raw.brand || '') || '#0c5648';
  const page = parseColor(raw.page || '') || mixHex(brand, '#fffaf3', 0.88);
  const chrome = parseColor(raw.chrome || '') || (luminance(brand) > 0.42 ? '#16120e' : mixHex(brand, '#000000', 0.45));
  const ink = parseColor(raw.ink || '') || contrastOn(page, '#f7f3ec', '#16120e');
  const muted = parseColor(raw.muted || '') || mixHex(ink, page, 0.45);
  const surface = parseColor(raw.surface || '') || mixHex(page, '#ffffff', 0.45);
  const brandDark = parseColor(raw.brandDark || '') || mixHex(brand, '#000000', 0.28);
  const brandSoft = parseColor(raw.brandSoft || '') || mixHex(brand, page, 0.55);
  const accent = parseColor(raw.accent || '') || brand;
  const chromeText = pickReadable(chrome, raw.chromeText || '', '#f7f3ec', '#16120e');
  const button = parseColor(raw.button || '') || brand;
  const buttonText = pickReadable(button, raw.buttonText || '', '#f7f3ec', '#16120e');
  // Logo/icone sulla navbar: elemento grafico, soglia AA 3:1 contro lo sfondo reale.
  const accentOnChrome = contrastRatio(accent, chrome) >= 3 ? accent : contrastOn(chrome);
  return {
    layout: {
      background: page,
      homeButtonColor: button,
      homeButtonTextColor: buttonText,
    },
    navbar: {
      background: chrome,
      logoColor: accentOnChrome,
      textColor: chromeText,
      buttonBackground: brandDark,
      buttonText: pickReadable(brandDark, buttonText),
      buttonHover: brandSoft,
      iconColor: accentOnChrome,
    },
    sidebar: {
      background: chrome,
      titleColor: chromeText,
      menuItemBackground: mixHex(chrome, '#ffffff', 0.1),
      menuItemColor: chromeText,
      menuItemActive: brandDark,
      menuItemHover: mixHex(chrome, brand, 0.28),
      iconColor: accentOnChrome,
    },
    drawer: {
      background: brandSoft,
      titleColor: ink,
      menuItemColor: ink,
      footerTextColor: muted,
    },
    card: {
      backgroundColor: surface,
      bestSellerTagColor: brand,
      // Testo del badge "Consigliato" calcolato contro il SUO sfondo (brand),
      // non ereditato da un colore pensato per un altro sfondo.
      bestSellerTextColor: bestTextOn(brand, '#f7f3ec', '#16120e'),
      productNameColor: ink,
      priceColor: brandDark,
      ingredientsColor: muted,
      detailsButtonBackground: button,
      detailsButtonIcon: buttonText,
      subtitleColor: ink,
      detailsIngredientsColor: muted,
      descriptionTextColor: muted,
      borderColor: brandSoft,
      detailsBorderColor: brand,
      allergenTagColor: brandDark,
      allergenTextColor: pickReadable(brandDark, buttonText),
    },
    sections: {
      titleColor: ink,
      descriptionColor: muted,
    },
    footer: {
      background: chrome,
      textColor: chromeText,
    },
  };
}

export function applyThemePalette(palette: Partial<ThemePalette>) {
  const colors = themeFromPalette(palette);
  const button = parseColor(palette.button || palette.brand || '') || '#0c5648';
  return patchRestaurant({
    colors,
    layout: {
      socialButtonColor: button,
      socialIconColor: pickReadable(button, palette.buttonText || ''),
    },
  });
}

export function paletteFromBrand(primary: string, pageBg?: string): ThemePalette {
  const p = parseColor(primary) || '#0c5648';
  const metallic = luminance(p) >= 0.38 && saturation(p) >= 0.22;
  const parsedPage = parseColor(pageBg || '');
  const pageOk = Boolean(parsedPage && parsedPage !== p && luminance(parsedPage) >= 0.55);
  const page = pageOk
    ? parsedPage!
    : metallic
      ? mixHex(p, '#fffaf3', 0.88)
      : mixHex(p, '#ffffff', 0.82);
  const chrome = metallic || luminance(p) > 0.55 ? '#16120e' : mixHex(p, '#000000', 0.42);
  const brandDark = mixHex(p, '#000000', 0.28);
  // Brand chiarissimo (bianco, panna, crema — tutti nomi validi): la pagina generata
  // gli somiglia troppo e bottoni/accenti sparirebbero nel fondo. Gli elementi
  // interattivi passano alla variante scura, lo sfondo resta quello scelto.
  const controls = contrastRatio(p, page) >= 1.3 ? p : brandDark;
  return {
    brand: p,
    brandDark,
    brandSoft: mixHex(p, page, 0.55),
    page,
    surface: mixHex(page, '#ffffff', 0.4),
    chrome,
    chromeText: contrastOn(chrome),
    accent: controls,
    ink: contrastOn(page),
    muted: mixHex(contrastOn(page), page, 0.42),
    button: controls,
    buttonText: contrastOn(controls),
  };
}

export function applyViewMode(mode: 'list' | 'carousel') {
  return patchRestaurant({
    colors: {
      card: { viewMode: mode },
    },
  });
}

export function applyBrandColors(primary: string, pageBg?: string) {
  return applyThemePalette(paletteFromBrand(primary, pageBg));
}
