/** Set curato di icone SVG custom per le categorie del menu (brand kit
 * public/brand/colori.css: tratto inchiostro #1A1A17, viewBox 24x24, stroke 1.75
 * arrotondato). Unica fonte: admin (CategoriesTab), sito pubblico (MenuItems) e
 * bot WhatsApp (whatsappCommands), per evitare che le liste finiscano fuori sync.
 *
 * `svgPath` è il markup interno (path/circle/...), SENZA il tag <svg> che lo
 * avvolge: lo aggiunge chi la usa (CategoryIcon, o il collage generato per
 * WhatsApp), impostando stroke="currentColor" così il colore segue il CSS.
 */
export type CategoryIconDef = {
  id: string;
  label: string;
  aliases: string[];
  svgPath: string;
};

export const CATEGORY_ICONS: CategoryIconDef[] = [
  {
    id: 'pizza',
    label: 'Pizza',
    aliases: ['pizza', 'pizze', 'pizzeria', 'focacce', 'focaccia'],
    svgPath:
      '<path d="M12 3 21 19 3 19Z"/><path d="M3 19c3 2 15 2 18 0"/><circle cx="12" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="9.5" cy="14.5" r="1" fill="currentColor" stroke="none"/><circle cx="14.5" cy="15.5" r="1" fill="currentColor" stroke="none"/>',
  },
  {
    id: 'pasta',
    label: 'Pasta',
    aliases: ['pasta', 'primo', 'primi', 'risotti', 'risotto', 'zuppe', 'zuppa'],
    svgPath:
      '<path d="M3 11c0 5 4 8 9 8s9-3 9-8"/><line x1="3" y1="11" x2="21" y2="11"/><path d="M7 8c1-1 2-1 3 0s2 1 3 0 2-1 3 0 2 1 3 0"/>',
  },
  {
    id: 'griglia',
    label: 'Griglia',
    aliases: [
      'griglia', 'grigliate', 'grigliata', 'carne', 'carni', 'arrosti', 'arrosto',
      'pollo', 'fiamma', 'fuoco', 'bacon', 'polpette',
    ],
    svgPath: '<rect x="3" y="6" width="18" height="12" rx="3"/><path d="M7 6 9 18M12 6 14 18M17 6 19 18"/>',
  },
  {
    id: 'pesce',
    label: 'Pesce',
    aliases: ['pesce', 'mare', 'crudi', 'crudo', 'frutti di mare'],
    svgPath:
      '<path d="M2 12s3.5-6.5 10.5-6.5c3 0 5 1.5 6.5 3.5L22 7v10l-3-2c-1.5 2-3.5 3.5-6.5 3.5C5.5 18.5 2 12 2 12Z"/><circle cx="7.5" cy="11" r="0.9" fill="currentColor" stroke="none"/>',
  },
  {
    id: 'antipasti',
    label: 'Antipasti',
    aliases: ['antipasti', 'antipasto', 'taglieri', 'tagliere', 'stuzzichini', 'spiedini', 'spiedino'],
    svgPath:
      '<line x1="4" y1="20" x2="20" y2="4"/><circle cx="7.5" cy="16.5" r="2.1"/><rect x="10.4" y="9.4" width="3.2" height="3.2" transform="rotate(45 12 11)"/><circle cx="16.5" cy="7.5" r="2.1"/>',
  },
  {
    id: 'insalata',
    label: 'Insalata',
    aliases: [
      'insalata', 'insalate', 'verdure', 'verdura', 'carota', 'vegetariano',
      'vegano', 'vegana',
    ],
    svgPath:
      '<path d="M3 11c0 5 4 8 9 8s9-3 9-8"/><line x1="3" y1="11" x2="21" y2="11"/><path d="M9 8c1-2 3-3 5-2 0 2-2 4-5 2Z"/>',
  },
  {
    id: 'dolci',
    label: 'Dolci',
    aliases: ['dolci', 'dolce', 'dessert', 'pasticceria', 'torta', 'biscotto', 'biscotti'],
    svgPath:
      '<path d="M6 11h12l-1.4 8.3a2 2 0 0 1-2 1.7H9.4a2 2 0 0 1-2-1.7Z"/><path d="M6 11c0-3 1.8-5 2.8-5 0-2 1.7-3 3.2-3s3.2 1 3.2 3c1 0 2.8 2 2.8 5"/><circle cx="12" cy="4.3" r="1" fill="currentColor" stroke="none"/>',
  },
  {
    id: 'hamburger',
    label: 'Hamburger',
    aliases: ['hamburger', 'burger', 'panini', 'panino', 'piadine', 'piadina', 'hotdog', 'hot dog', 'secondi', 'secondo'],
    svgPath:
      '<path d="M4 10c0-4 4-6 8-6s8 2 8 6Z"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="15" x2="21" y2="15"/><path d="M4 17c0 1.5 1.5 3 8 3s8-1.5 8-3Z"/>',
  },
  {
    id: 'colazione',
    label: 'Colazione',
    aliases: ['colazione', 'pane', 'brioche', 'cornetto', 'cornetti', 'uova', 'uovo'],
    svgPath: '<path d="M4 13c0-5 4-9 8-9s8 4 8 9c0 3-4 5-8 5s-8-2-8-5Z"/><path d="M8 8l1 3M12 6l1 4M16 8l1 3"/>',
  },
  {
    id: 'sushi',
    label: 'Sushi',
    aliases: ['sushi', 'sashimi', 'giapponese'],
    svgPath:
      '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>',
  },
  {
    id: 'contorni',
    label: 'Contorni',
    aliases: ['contorni', 'contorno'],
    svgPath:
      '<line x1="8" y1="21" x2="8" y2="10"/><line x1="12" y1="21" x2="12" y2="6"/><line x1="16" y1="21" x2="16" y2="10"/><path d="M6.3 10c1-1.3 3.4-1.3 4.4 0M10.3 6c1-1.3 3.4-1.3 4.4 0M14.3 10c1-1.3 3.4-1.3 4.4 0"/>',
  },
  {
    id: 'bibite',
    label: 'Bibite',
    aliases: ['bibite', 'bevande', 'bevanda', 'drink', 'analcolici', 'analcolico', 'bottiglia', 'lemon', 'limone'],
    svgPath: '<path d="M6 8h12l-1.5 12h-9Z"/><line x1="12" y1="3" x2="14" y2="8"/><line x1="5" y1="8" x2="19" y2="8"/>',
  },
  {
    id: 'vino',
    label: 'Vino',
    aliases: ['vino', 'vini', 'calice'],
    svgPath:
      '<path d="M8 3h8c0 5-2 8-4 8s-4-3-4-8Z"/><line x1="12" y1="11" x2="12" y2="18"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="9" y1="18" x2="15" y2="18"/>',
  },
  {
    id: 'birra',
    label: 'Birra',
    aliases: ['birra', 'birre'],
    svgPath:
      '<path d="M5 8h11v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z"/><path d="M16 10h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2"/><line x1="5" y1="8" x2="16" y2="8"/><path d="M7 8c0-2 1-3 1-4M11 8c0-2-1-3-1-4"/>',
  },
  {
    id: 'cocktail',
    label: 'Cocktail',
    aliases: ['cocktail', 'aperitivo', 'aperitivi', 'drink alcolico', 'glass whiskey', 'whiskey'],
    svgPath: '<path d="M4 4h16l-8 9Z"/><line x1="12" y1="13" x2="12" y2="20"/><line x1="8" y1="20" x2="16" y2="20"/><circle cx="10" cy="6" r="1" fill="currentColor" stroke="none"/>',
  },
  {
    id: 'caffe',
    label: 'Caffè',
    aliases: ['caffe', 'caffetteria', 'espresso', 'cappuccino', 'mug', 'tazza'],
    svgPath:
      '<path d="M5 9h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4Z"/><path d="M16 10h2a2 2 0 0 1 0 4h-2"/><path d="M8 6c0-1 1-1 1-2M12 6c0-1 1-1 1-2"/>',
  },
  {
    id: 'gelato',
    label: 'Gelato',
    aliases: ['gelato', 'gelati'],
    svgPath: '<circle cx="12" cy="8" r="5"/><path d="M8 11 12 21 16 11Z"/>',
  },
  {
    id: 'fritti',
    label: 'Fritti',
    aliases: ['fritti', 'fritto', 'friggitoria', 'patatine', 'peperoncino', 'piccante'],
    svgPath: '<path d="M6 9h12l-2 12H8Z"/><line x1="9" y1="9" x2="8" y2="3"/><line x1="12" y1="9" x2="12" y2="2"/><line x1="15" y1="9" x2="16" y2="3"/>',
  },
  {
    id: 'formaggi',
    label: 'Formaggi',
    aliases: ['formaggi', 'formaggio', 'salumi', 'cheese'],
    svgPath:
      '<path d="M3 17 10 4 21 10 21 17Z"/><circle cx="14" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="17" cy="13" r="1" fill="currentColor" stroke="none"/><circle cx="11" cy="12" r="1" fill="currentColor" stroke="none"/>',
  },
  {
    id: 'menu',
    label: 'Menu',
    aliases: ['menu', 'utensili', 'posate', 'default', 'normale', 'altro', 'varie'],
    svgPath:
      '<path d="M6 2v7a2 2 0 0 0 4 0V2"/><path d="M8 9v13"/><path d="M17 2c-2 0-3 2.5-3 5.5S15 12 17 12"/><path d="M17 2v20"/>',
  },
];

/** Icona di fallback quando quella salvata non è (più) riconosciuta. */
export const DEFAULT_CATEGORY_ICON = 'menu';

/** Vecchi nomi Font Awesome (react-icons/fa) salvati prima del passaggio alle
 * icone custom: mappatura best-effort verso il nuovo set, usata in lettura per
 * non rompere le categorie già esistenti nei menu dei tenant. */
export const LEGACY_FA_ICON_MAP: Record<string, string> = {
  FaUtensils: 'menu',
  FaUtensilSpoon: 'menu',
  FaConciergeBell: 'menu',
  FaStore: 'menu',
  FaShoppingBasket: 'menu',
  FaShoppingCart: 'menu',
  FaShoppingBag: 'menu',
  FaDrumstickBite: 'griglia',
  FaBacon: 'griglia',
  FaFire: 'griglia',
  FaCloudMeatball: 'griglia',
  FaPizzaSlice: 'pizza',
  FaPastafarianism: 'pasta',
  FaHamburger: 'hamburger',
  FaHotdog: 'hamburger',
  FaFish: 'pesce',
  FaIceCream: 'gelato',
  FaBreadSlice: 'colazione',
  FaEgg: 'colazione',
  FaCarrot: 'insalata',
  FaAppleAlt: 'insalata',
  FaSeedling: 'insalata',
  FaLeaf: 'insalata',
  FaCookie: 'dolci',
  FaCookieBite: 'dolci',
  FaBirthdayCake: 'dolci',
  FaPepperHot: 'fritti',
  FaLemon: 'bibite',
  FaWineBottle: 'bibite',
  FaWineGlass: 'vino',
  FaWineGlassAlt: 'vino',
  FaGlassWhiskey: 'cocktail',
  FaCocktail: 'cocktail',
  FaBeer: 'birra',
  FaCoffee: 'caffe',
  FaMugHot: 'caffe',
  FaCheese: 'formaggi',
};

function foldAccents(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/** Confronto case/accenti-insensitive contro id, label o alias di un'icona. */
export function resolveCategoryIconId(input: string): string | null {
  const needle = foldAccents(String(input || ''));
  if (!needle) return null;
  const hit = CATEGORY_ICONS.find(
    (item) =>
      foldAccents(item.id) === needle ||
      foldAccents(item.label) === needle ||
      item.aliases.some((alias) => foldAccents(alias) === needle)
  );
  return hit?.id || null;
}

/** Porta un valore icona (nuovo id, vecchio FaXxx, o parola libera) verso un id
 * valido del set corrente, con fallback sull'icona di default. */
export function normalizeCategoryIconId(input: string | undefined | null): string {
  const raw = String(input || '').trim();
  if (!raw) return DEFAULT_CATEGORY_ICON;
  if (CATEGORY_ICONS.some((item) => item.id === raw)) return raw;
  if (LEGACY_FA_ICON_MAP[raw]) return LEGACY_FA_ICON_MAP[raw];
  return resolveCategoryIconId(raw) || DEFAULT_CATEGORY_ICON;
}

/** Interpreta la risposta numerica al collage WhatsApp ("3" -> 3° icona). */
export function categoryIconByIndex(answer: string): string | null {
  const n = Number(String(answer || '').trim());
  if (Number.isInteger(n) && n >= 1 && n <= CATEGORY_ICONS.length) {
    return CATEGORY_ICONS[n - 1].id;
  }
  return null;
}

export function categoryIconLabel(id: string): string {
  return CATEGORY_ICONS.find((item) => item.id === id)?.label || 'Icona';
}
