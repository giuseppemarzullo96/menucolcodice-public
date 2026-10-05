import fs from 'fs';
import path from 'path';
import { invalidateCache, loadRestaurantData } from '@/utils/dataLoader';
import { assertCategoryLimit, assertProductLimit, currentTenant, tenantDataDir } from '@/server/tenant';
import { DEFAULT_CATEGORY_ICON, normalizeCategoryIconId } from '@/constants/categoryIcons';

export type MenuProduct = {
  id: string;
  name: string;
  category: string;
  ingredients: string;
  description: string;
  price: number;
  imageUrl: string;
  mediaType?: 'image' | 'model3d';
  bestSeller: boolean;
  allergens: string[];
  /** null = disponibile; 0 = finito finché non fai "torna"; timestamp = finito fino a quel momento */
  soldOutUntil?: number | null;
};

export type MenuCategory = {
  name: string;
  description: string;
  order: number;
  icon: string;
  /** nascosta dal menu pubblico (stagionale) */
  hidden?: boolean;
};

export function isProductSoldOut(product: Pick<MenuProduct, 'soldOutUntil'>): boolean {
  const until = product.soldOutUntil;
  if (until == null) return false;
  if (until === 0) return true;
  return Date.now() < until;
}

/** Mezzanotte di domani in Europe/Rome (ms). */
export function tomorrowMidnightRomeMs(now = Date.now()): number {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const today = formatter.format(new Date(now)); // YYYY-MM-DD
  const [y, m, d] = today.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0));
  // Trova l'offset Rome a mezzogiorno UTC del giorno successivo
  const probe = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth(), next.getUTCDate(), 12, 0, 0));
  const romeParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Rome',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(probe);
  const romeHour = Number(romeParts.find((p) => p.type === 'hour')?.value || 12);
  const offsetHours = romeHour - 12;
  return Date.UTC(next.getUTCFullYear(), next.getUTCMonth(), next.getUTCDate(), -offsetHours, 0, 0);
}

function escapeString(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

function productsPath() {
  return path.join(tenantDataDir(), 'menu', 'products.ts');
}

function sectionsPath() {
  return path.join(tenantDataDir(), 'menu', 'sections.ts');
}

function menuOptionsPath() {
  return path.join(process.cwd(), 'src', 'utils', 'menuOptions.js');
}

export function normalizeName(value: string): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function loadProducts(): MenuProduct[] {
  const { menuProducts } = loadRestaurantData();
  return (menuProducts || []).map((item: any) => {
    let soldOutUntil: number | null = null;
    if (item.soldOutUntil === 0 || item.soldOutUntil === '0') soldOutUntil = 0;
    else if (item.soldOutUntil != null && item.soldOutUntil !== '') {
      const n = Number(item.soldOutUntil);
      soldOutUntil = Number.isFinite(n) ? n : null;
      if (soldOutUntil != null && soldOutUntil > 0 && Date.now() >= soldOutUntil) soldOutUntil = null;
    }
    return {
      id: String(item.id),
      name: item.name || '',
      category: item.category || '',
      ingredients: item.ingredients || '',
      description: item.description || '',
      price: Number(item.prices?.[0]?.price ?? item.price ?? 0),
      imageUrl: item.imageUrl || '',
      mediaType: item.mediaType === 'model3d' ? 'model3d' : 'image',
      bestSeller: Boolean(item.bestSeller),
      allergens: Array.isArray(item.allergens) ? item.allergens : [],
      soldOutUntil,
    };
  });
}

function loadIconMap(): Map<string, string> {
  const file = menuOptionsPath();
  const map = new Map<string, string>();
  if (!fs.existsSync(file)) return map;
  const existing = fs.readFileSync(file, 'utf8');
  const names = Array.from(existing.matchAll(/name: "([^"]+)"/g)).map((m) => m[1]);
  const icons = Array.from(existing.matchAll(/icon: "([^"]+)"/g)).map((m) => m[1]);
  names.forEach((name, i) => map.set(name, icons[i] || DEFAULT_CATEGORY_ICON));
  return map;
}

/** Normalizza solo il valore restituito ai chiamanti: non riscrive i JSON/TS dei
 * tenant a ogni lettura, così categorie con vecchi ID FaXxx continuano a
 * funzionare finché non vengono risalvate (allora saveCategories li canonizza). */
export function loadCategories(): MenuCategory[] {
  const { menuSections } = loadRestaurantData();
  const icons = loadIconMap();
  return (menuSections || []).map((section: any, index: number) => ({
    name: section.name,
    description: section.description ?? section.name,
    order: section.order !== undefined ? section.order : index + 1,
    icon: normalizeCategoryIconId(section.icon || icons.get(section.name)),
    hidden: Boolean(section.hidden),
  }));
}

export function findCategory(query: string): MenuCategory | undefined {
  const categories = [...loadCategories()].sort((a, b) => a.order - b.order);
  const raw = String(query || '').trim();
  if (!raw) return undefined;
  const asNumber = Number(raw);
  if (Number.isInteger(asNumber) && asNumber >= 1 && asNumber <= categories.length) {
    return categories[asNumber - 1];
  }
  const needle = normalizeName(raw);
  return (
    categories.find((c) => normalizeName(c.name) === needle) ||
    categories.find((c) => {
      const n = normalizeName(c.name);
      return n.includes(needle) || needle.includes(n);
    })
  );
}

export function countProductsInCategory(name: string): number {
  return loadProducts().filter((p) => p.category === name).length;
}

function normalizeOrders(categories: MenuCategory[]): MenuCategory[] {
  return [...categories]
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'it'))
    .map((category, index) => ({ ...category, order: index + 1 }));
}

function moveCategory(categories: MenuCategory[], name: string, newOrder: number): MenuCategory[] {
  const sorted = [...categories].sort((a, b) => a.order - b.order);
  const index = sorted.findIndex((c) => c.name === name);
  if (index < 0) return normalizeOrders(categories);
  const [item] = sorted.splice(index, 1);
  const target = Math.max(0, Math.min(sorted.length, Math.round(newOrder) - 1));
  sorted.splice(target, 0, item);
  return sorted.map((category, i) => ({ ...category, order: i + 1 }));
}

export function matchCategory(raw: string, categories: MenuCategory[]): string {
  const needle = normalizeName(raw);
  if (!needle) return categories[0]?.name || 'Altro';

  const exact = categories.find((c) => normalizeName(c.name) === needle);
  if (exact) return exact.name;

  const contains = categories.find((c) => {
    const n = normalizeName(c.name);
    return n.includes(needle) || needle.includes(n);
  });
  if (contains) return contains.name;

  const synonyms: Record<string, string[]> = {
    'primi piatti': ['primi', 'primo', 'pasta', 'risotti', 'risotto'],
    'secondi piatti': ['secondi', 'secondo', 'carne', 'pesce'],
    contorni: ['contorno', 'verdure', 'insalate', 'insalata'],
    dolci: ['dessert', 'dolce', 'pasticceria'],
    bevande: ['drink', 'drinks', 'vini', 'vino', 'birre', 'birra', 'analcolici', 'caffetteria'],
    antipasti: ['antipasto', 'starter', 'starters'],
    pizze: ['pizza', 'pizzeria'],
  };

  for (const cat of categories) {
    const key = normalizeName(cat.name);
    const extras = synonyms[key] || [];
    if (extras.includes(needle)) return cat.name;
  }

  return raw.trim() || 'Altro';
}

function writeProductsFile(products: MenuProduct[]) {
  let content = `import { PriceNameType } from "@/types/dish";

export const menuProducts = [
`;
  products.forEach((product, index) => {
    const allergensStr =
      product.allergens && product.allergens.length > 0
        ? `, allergens: [${product.allergens.map((a) => `"${escapeString(a)}"`).join(', ')}]`
        : '';
    const mediaTypeStr = product.mediaType === 'model3d' ? ', mediaType: "model3d"' : '';
    const soldOut =
      product.soldOutUntil === 0
        ? ', soldOutUntil: 0'
        : product.soldOutUntil != null && product.soldOutUntil > Date.now()
          ? `, soldOutUntil: ${Math.round(product.soldOutUntil)}`
          : '';
    content += `  { id: "${escapeString(product.id)}", name: "${escapeString(product.name)}", category: "${escapeString(product.category)}", ingredients: "${escapeString(product.ingredients)}", description: "${escapeString(product.description)}", prices: [{ name: PriceNameType.STANDARD, price: ${Number(product.price) || 0} }], imageUrl: "${escapeString(product.imageUrl || '')}", bestSeller: ${product.bestSeller ? 'true' : 'false'}${mediaTypeStr}${allergensStr}${soldOut} }${index < products.length - 1 ? ',' : ''}
`;
  });
  content += `];
`;
  fs.writeFileSync(productsPath(), content, 'utf8');
}

function writeSectionsFile(categories: MenuCategory[]) {
  const sorted = [...categories].sort((a, b) => a.order - b.order);
  let content = `export const menuSections = [
`;
  sorted.forEach((category, index) => {
    content += `  {
    name: "${escapeString(category.name)}",
    description: "${escapeString(category.description || category.name)}",
    order: ${category.order},
    icon: "${escapeString(normalizeCategoryIconId(category.icon))}",${category.hidden ? '\n    hidden: true,' : ''}
  }${index < sorted.length - 1 ? ',' : ''}
`;
  });
  content += `];
`;
  fs.writeFileSync(sectionsPath(), content, 'utf8');
}

/** menuOptions.js non viene mai importato come modulo reale (solo letto via
 * regex da questo file e dalle API get/save-categories): l'icona è quindi
 * salvata come id stringa del set custom, non più come componente react-icons. */
function ensureMenuOptions(categories: MenuCategory[]) {
  if (currentTenant().slug !== 'demo') return;
  const file = menuOptionsPath();
  const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const existingNames = Array.from(existing.matchAll(/name: "([^"]+)"/g)).map((m) => m[1]);
  const iconsFromFile = Array.from(existing.matchAll(/icon: "([^"]+)"/g)).map((m) => m[1]);
  const nameToIcon = new Map<string, string>();
  existingNames.forEach((name, i) => nameToIcon.set(name, iconsFromFile[i] || DEFAULT_CATEGORY_ICON));

  let content = `export const menuOptions = [
`;
  categories.forEach((category, index) => {
    const key = category.name.toLowerCase();
    const iconId = normalizeCategoryIconId(category.icon || nameToIcon.get(category.name));
    content += `  {
    key: "${escapeString(key)}",
    icon: "${escapeString(iconId)}",
    label: <a href="#${escapeString(key)}">${escapeString(category.name)}</a>,
    name: "${escapeString(category.name)}",
    description: "${escapeString(category.description || category.name)}",
  }${index < categories.length - 1 ? ',' : ''}
`;
  });
  content += `];
`;
  fs.writeFileSync(file, content, 'utf8');
}

export function nextProductId(products: MenuProduct[] = loadProducts()): string {
  let maxId = -1;
  products.forEach((p) => {
    const n = parseInt(p.id, 10);
    if (!Number.isNaN(n) && n > maxId) maxId = n;
  });
  return String(maxId + 1);
}

export function ensureCategories(names: string[]): MenuCategory[] {
  const categories = loadCategories();
  let changed = false;
  let maxOrder = categories.reduce((max, c) => Math.max(max, c.order || 0), 0);
  names.forEach((name) => {
    const matched = matchCategory(name, categories);
    const exists = categories.some((c) => normalizeName(c.name) === normalizeName(matched));
    if (!exists && name.trim()) {
      maxOrder += 1;
      categories.push({
        name: name.trim(),
        description: name.trim(),
        order: maxOrder,
        icon: DEFAULT_CATEGORY_ICON,
      });
      changed = true;
    }
  });
  if (changed) saveCategories(categories);
  else assertCategoryLimit(categories.length);
  return loadCategories();
}

export function saveCategories(categories: MenuCategory[]) {
  assertCategoryLimit(categories.length);
  const normalized = normalizeOrders(
    categories.map((category) => ({
      name: category.name.trim(),
      description: category.description || category.name,
      order: Number(category.order) || 999,
      icon: normalizeCategoryIconId(category.icon),
      hidden: Boolean(category.hidden),
    }))
  );
  writeSectionsFile(normalized);
  ensureMenuOptions(normalized);
  invalidateCache(tenantDataDir());
}

export function addCategory(input: {
  name: string;
  description?: string;
  icon?: string;
  order?: number;
}): MenuCategory {
  const name = String(input.name || '').trim();
  if (name.length < 2) {
    throw new Error('Il nome della categoria è troppo corto.');
  }
  const categories = loadCategories();
  if (categories.some((c) => normalizeName(c.name) === normalizeName(name))) {
    throw new Error(`La categoria ${name} esiste già.`);
  }
  const created: MenuCategory = {
    name,
    description: String(input.description || name).trim() || name,
    icon: normalizeCategoryIconId(input.icon),
    order: input.order != null ? Number(input.order) : categories.length + 1,
  };
  const next =
    input.order != null ? moveCategory([...categories, created], name, Number(input.order)) : [...categories, created];
  saveCategories(next);
  const saved = findCategory(name);
  if (!saved) throw new Error('Non sono riuscito a salvare la categoria.');
  return saved;
}

export function updateCategory(
  query: string,
  patch: { name?: string; description?: string; icon?: string; order?: number; hidden?: boolean }
): MenuCategory {
  const current = findCategory(query);
  if (!current) {
    throw new Error(`Categoria non trovata: ${query}`);
  }
  const oldName = current.name;
  const nextName = String(patch.name != null ? patch.name : oldName).trim();
  if (nextName.length < 2) {
    throw new Error('Il nome della categoria è troppo corto.');
  }
  const categories = loadCategories();
  const clash = categories.find(
    (c) => c.name !== oldName && normalizeName(c.name) === normalizeName(nextName)
  );
  if (clash) {
    throw new Error(`Esiste già una categoria chiamata ${clash.name}.`);
  }
  let next = categories.map((category) => {
    if (category.name !== oldName) return category;
    return {
      ...category,
      name: nextName,
      description: patch.description !== undefined ? patch.description : category.description,
      icon: patch.icon || category.icon,
      order: patch.order !== undefined ? Number(patch.order) : category.order,
      hidden: patch.hidden !== undefined ? Boolean(patch.hidden) : category.hidden,
    };
  });
  if (patch.order !== undefined) {
    next = moveCategory(next, nextName, Number(patch.order));
  }
  if (nextName !== oldName) {
    writeProductsFile(
      loadProducts().map((product) =>
        product.category === oldName ? { ...product, category: nextName } : product
      )
    );
  }
  saveCategories(next);
  const saved = findCategory(nextName);
  if (!saved) throw new Error('Non sono riuscito ad aggiornare la categoria.');
  return saved;
}

export function deleteCategory(query: string): MenuCategory {
  const current = findCategory(query);
  if (!current) {
    throw new Error(`Categoria non trovata: ${query}`);
  }
  const count = countProductsInCategory(current.name);
  if (count > 0) {
    throw new Error(
      `Non puoi eliminare *${current.name}*: ci sono ${count} piatti. Spostali o cancellali prima.`
    );
  }
  saveCategories(loadCategories().filter((category) => category.name !== current.name));
  return current;
}

export function saveProducts(products: MenuProduct[]) {
  assertProductLimit(products.length);
  writeProductsFile(products);
  invalidateCache(tenantDataDir());
}

export function appendProducts(incoming: Array<Partial<MenuProduct>>): MenuProduct[] {
  return importProducts(incoming, 'add');
}

export function importProducts(
  incoming: Array<Partial<MenuProduct>>,
  mode: 'add' | 'replace'
): MenuProduct[] {
  const existing = loadProducts();
  const categories = ensureCategories(
    incoming.map((p) => p.category || '').filter(Boolean) as string[]
  );
  let nextId = mode === 'replace' ? 1 : parseInt(nextProductId(existing), 10);
  const added: MenuProduct[] = incoming.map((item) => {
    const category = matchCategory(item.category || '', categories);
    const product: MenuProduct = {
      id: String(nextId++),
      name: (item.name || 'Piatto').trim(),
      category,
      ingredients: item.ingredients || item.description || '',
      description: item.description || item.ingredients || '',
      price: Number(item.price) || 0,
      imageUrl: item.imageUrl || '',
      mediaType: 'image',
      bestSeller: Boolean(item.bestSeller),
      allergens: Array.isArray(item.allergens) ? item.allergens : [],
      soldOutUntil: item.soldOutUntil ?? null,
    };
    return product;
  });
  const all = mode === 'replace' ? added : [...existing, ...added];
  saveProducts(all);
  return added;
}

export function findProduct(query: string): MenuProduct | undefined {
  const products = loadProducts();
  const byId = products.find((p) => p.id === query.trim());
  if (byId) return byId;
  const needle = normalizeName(query);
  return products.find((p) => normalizeName(p.name) === needle)
    || products.find((p) => normalizeName(p.name).includes(needle));
}

export function updateProduct(id: string, patch: Partial<MenuProduct>): MenuProduct | null {
  const products = loadProducts();
  const index = products.findIndex((p) => p.id === id);
  if (index < 0) return null;
  products[index] = { ...products[index], ...patch, id: products[index].id };
  saveProducts(products);
  return products[index];
}

export function deleteProduct(id: string): boolean {
  const products = loadProducts();
  const next = products.filter((p) => p.id !== id);
  if (next.length === products.length) return false;
  saveProducts(next);
  return true;
}

export function deleteProducts(ids: string[]): number {
  const unique = Array.from(new Set(ids.map(String)));
  const products = loadProducts();
  const next = products.filter((p) => !unique.includes(p.id));
  const removed = products.length - next.length;
  if (removed > 0) saveProducts(next);
  return removed;
}
