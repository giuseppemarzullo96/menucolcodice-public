import dns from 'dns/promises';
import { extractJson, hasOpenAiKey } from './aiClient';
import { processDishImage } from './dishImage';
import { loadIntegrations } from './integrations';
import { loadCategories, matchCategory } from './menuStore';
import type { ParsedMenuProduct } from './visionOcr';

export type OnlineMenuDish = ParsedMenuProduct & { imageUrl?: string };

export type OnlineMenuSearchResult = {
  found: boolean;
  sourceLabel: string;
  sourceUrl: string;
  dishes: OnlineMenuDish[];
  notes: string[];
};

const UA =
  'Mozilla/5.0 (compatible; MenuColCodiceBot/1.0; +https://menucolcodice.it) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';

function stripCodeFence(text: string) {
  const fenced = String(text || '').match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced ? fenced[1] : text).trim();
}

function isPrivateIp(ip: string) {
  if (ip.includes(':')) {
    const lower = ip.toLowerCase();
    return lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80');
  }
  const parts = ip.split('.').map(Number);
  if (parts[0] === 10) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  return false;
}

async function assertPublicUrl(url: string) {
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Solo http/https');
  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local')) throw new Error('Host non consentito');
  const looked = await dns.lookup(host, { all: true });
  if (!looked.length || looked.some((row) => isPrivateIp(row.address))) throw new Error('Host non consentito');
  return parsed.toString();
}

async function fetchRemoteImage(url: string): Promise<Buffer | null> {
  try {
    const safe = await assertPublicUrl(url);
    const res = await fetch(safe, {
      redirect: 'follow',
      signal: AbortSignal.timeout(12000),
      headers: { 'User-Agent': UA, Accept: 'image/*,*/*;q=0.8' },
    });
    if (!res.ok) return null;
    await assertPublicUrl(res.url || safe);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 80 || buf.length > 8_000_000) return null;
    return buf;
  } catch {
    return null;
  }
}

function responseText(data: any) {
  const chunks: string[] = [];
  for (const item of data?.output || []) {
    if (item?.type !== 'message') continue;
    for (const part of item.content || []) {
      if (part?.type === 'output_text' && part.text) chunks.push(part.text);
    }
  }
  return chunks.join('\n').trim();
}

function cleanStr(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function parsePrice(value: unknown) {
  const n = Number(String(value ?? '').replace(/[^\d.,]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function normalizeDishes(raw: any): OnlineMenuDish[] {
  const categories = loadCategories();
  const list = Array.isArray(raw?.dishes) ? raw.dishes : Array.isArray(raw?.products) ? raw.products : [];
  const seen = new Set<string>();
  const out: OnlineMenuDish[] = [];

  for (const item of list) {
    const name = cleanStr(item?.name);
    if (!name || name.length < 2) continue;
    const rawCategory = cleanStr(item?.category || item?.section || 'Altro');
    const category = matchCategory(rawCategory, categories);
    const key = `${name.toLowerCase()}|${category.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const imageUrl = cleanStr(item?.image_url || item?.imageUrl || item?.photo || '');
    out.push({
      name,
      category,
      price: parsePrice(item?.price),
      ingredients: cleanStr(item?.ingredients),
      description: cleanStr(item?.description || item?.ingredients),
      allergens: [],
      ...( /^https?:\/\//i.test(imageUrl) ? { imageUrl } : {}),
    });
  }
  return out;
}

async function hydrateDishImages(dishes: OnlineMenuDish[], max = 18) {
  let done = 0;
  for (const dish of dishes) {
    if (!dish.imageUrl || done >= max) continue;
    const remote = dish.imageUrl;
    if (!/^https?:\/\//i.test(remote)) continue;
    const buf = await fetchRemoteImage(remote);
    if (!buf) {
      delete dish.imageUrl;
      continue;
    }
    try {
      const saved = await processDishImage(buf);
      dish.imageUrl = saved.url;
      done += 1;
    } catch {
      delete dish.imageUrl;
    }
  }
}

/** Scarica e salva le foto piatti (da chiamare solo dopo conferma import). */
export async function hydrateMenuImages(dishes: OnlineMenuDish[]) {
  await hydrateDishImages(dishes);
}

function sourceLabel(raw: string) {
  const lower = raw.toLowerCase();
  if (lower.includes('deliveroo')) return 'Deliveroo';
  if (lower.includes('glovo')) return 'Glovo';
  if (lower.includes('justeat') || lower.includes('just-eat')) return 'Just Eat';
  if (lower.includes('thefork') || lower.includes('lafourchette')) return 'TheFork';
  if (lower.includes('google')) return 'Google';
  if (lower.includes('tripadvisor')) return 'TripAdvisor';
  if (lower.includes('ubereats') || lower.includes('uber')) return 'Uber Eats';
  return raw || 'web';
}

export function formatOnlineMenuPreview(result: OnlineMenuSearchResult, existingCount = 0) {
  const withPhoto = result.dishes.filter((d) => d.imageUrl).length;
  const lines = result.dishes.slice(0, 12).map((item, index) => {
    const price = item.price > 0 ? `€${item.price.toFixed(2)}` : 'prezzo n/d';
    const photo = item.imageUrl ? ' 📷' : '';
    return `${index + 1}. *${item.name}* — ${item.category} — ${price}${photo}`;
  });
  const importHint =
    existingCount > 0
      ? `Hai già *${existingCount}* piatti nel menu.\n\n` +
        `• *aggiungi* — unisce i nuovi ai piatti attuali\n` +
        `• *sostituisci* — cancella i vecchi e importa solo questi\n` +
        `• *no* — salta l'import del menu`
      : `Li importo nel menu? Scrivi *sì* per importare tutto, *no* per saltare e continuare la configurazione.`;
  return (
    `Ho trovato un menu online su *${result.sourceLabel}*${result.sourceUrl ? `\n${result.sourceUrl}` : ''}.\n\n` +
    `${result.dishes.length} piatti${withPhoto ? ` (${withPhoto} con foto online)` : ''}:\n\n` +
    `${lines.join('\n')}${result.dishes.length > 12 ? '\n…' : ''}\n\n` +
    importHint
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timeout`)), ms);
    }),
  ]);
}

async function callOpenAIMenuSearch(prompt: string, timeoutMs = 50000) {
  const cfg = loadIntegrations();
  const model = cfg.openai.model || 'gpt-4o-mini';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs - 2000);
  try {
    const res = await withTimeout(
      fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${cfg.openai.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          tools: [{ type: 'web_search_preview' }],
          input: prompt,
        }),
      }),
      timeoutMs,
      'OpenAI menu search'
    );
    const body = await res.text();
    let data: any = null;
    try {
      data = body ? JSON.parse(body) : null;
    } catch {
      data = null;
    }
    if (!res.ok) {
      throw new Error(data?.error?.message || `HTTP ${res.status}`);
    }
    const text = responseText(data);
    if (!text) return null;
    return extractJson(stripCodeFence(text));
  } finally {
    clearTimeout(timer);
  }
}

function resultFromParsed(parsed: any, fallbackUrl = ''): OnlineMenuSearchResult | null {
  const dishes = normalizeDishes(parsed);
  if (dishes.length < 2) return null;
  const sourceUrl = cleanStr(parsed?.source_url || parsed?.sourceUrl) || fallbackUrl;
  const label = sourceLabel(cleanStr(parsed?.source) || sourceUrl);
  return {
    found: true,
    sourceLabel: label,
    sourceUrl,
    dishes,
    notes: [`Menu online: ${label} (${dishes.length} piatti)`],
  };
}

function dishKey(dish: OnlineMenuDish) {
  return `${dish.name.toLowerCase()}|${dish.category.toLowerCase()}`;
}

function mergeDishes(base: OnlineMenuDish[], extra: OnlineMenuDish[]) {
  const seen = new Set(base.map(dishKey));
  const out = [...base];
  for (const dish of extra) {
    const key = dishKey(dish);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(dish);
  }
  return out;
}

async function fetchMenuCategories(menuUrl: string, restaurantName: string, label: string) {
  const prompt = `Apri questa pagina menu (${label}):
${menuUrl}

Ristorante: "${restaurantName}" (Italia)

Elenca TUTTE le categorie/sezioni del menu visibili (es. Fritti Madison, Pizze speciali, Pizze classiche, Bevande…).

Restituisci SOLO JSON valido:
{
  "categories": ["Categoria 1", "Categoria 2"]
}

Regole:
- Solo categorie reali presenti sulla pagina.
- Non inventare categorie.
- In italiano come compaiono online.`;

  try {
    const parsed = await callOpenAIMenuSearch(prompt, 45000);
    const list = Array.isArray(parsed?.categories) ? parsed.categories.map((c: unknown) => cleanStr(c)).filter(Boolean) : [];
    return Array.from(new Set(list)).slice(0, 14);
  } catch {
    return [];
  }
}

async function fetchMenuCategoryDishes(
  menuUrl: string,
  restaurantName: string,
  label: string,
  category: string
) {
  const prompt = `Pagina menu (${label}): ${menuUrl}
Ristorante: "${restaurantName}" (Italia)

Estrai TUTTI i piatti della categoria/sezione *"${category}"* con prezzo.

Restituisci SOLO JSON valido:
{
  "dishes": [
    { "name": "", "category": "${category.replace(/"/g, '')}", "price": 0, "description": "", "ingredients": "", "image_url": "" }
  ]
}

Regole:
- Solo piatti di questa categoria, tutti quelli elencati.
- Non inventare piatti.
- price in euro; 0 se assente.`;

  try {
    const parsed = await callOpenAIMenuSearch(prompt, 50000);
    return normalizeDishes(parsed);
  } catch {
    return [];
  }
}

async function extractDeliveryMenuByCategories(menuUrl: string, restaurantName: string, label: string) {
  const categories = await fetchMenuCategories(menuUrl, restaurantName, label);
  if (categories.length < 2) return [] as OnlineMenuDish[];

  let dishes: OnlineMenuDish[] = [];
  for (const category of categories) {
    const batch = await fetchMenuCategoryDishes(menuUrl, restaurantName, label, String(category));
    if (batch.length) dishes = mergeDishes(dishes, batch);
  }
  return dishes;
}

async function searchMenuFromDeliveryPage(menuUrl: string, restaurantName: string) {
  const label = sourceLabel(menuUrl);
  const basePrompt = (extra = '') => `Apri e analizza questa pagina menu delivery (${label}):
${menuUrl}

Ristorante: "${restaurantName}" (Italia)

Estrai il menu COMPLETO: TUTTE le categorie e TUTTI i piatti visibili.
Su Deliveroo/Just Eat/Glovo ci sono spesso 30-80+ prodotti: scorri tutte le sezioni.
${extra}

Restituisci SOLO JSON valido:
{
  "found": false,
  "source": "${label.toLowerCase()}",
  "source_url": "${menuUrl}",
  "dishes": [
    {
      "name": "",
      "category": "",
      "price": 0,
      "description": "",
      "ingredients": "",
      "image_url": ""
    }
  ]
}

Regole:
- found:true solo con almeno 2 piatti reali dalla pagina.
- Non inventare piatti.
- category in italiano.
- price in euro; 0 se non visibile.
- Elenca ogni piatto di ogni categoria.`;

  try {
    let dishes = await extractDeliveryMenuByCategories(menuUrl, restaurantName, label);

    if (dishes.length < 10) {
      const parsed = await callOpenAIMenuSearch(basePrompt(), 65000);
      if (parsed) dishes = mergeDishes(dishes, normalizeDishes(parsed));
    }

    for (let pass = 0; pass < 3 && dishes.length < 20; pass += 1) {
      const known = dishes.map((d) => d.name).join(', ');
      const more = await callOpenAIMenuSearch(
        basePrompt(
          `\nPassaggio ${pass + 2}: estrazione incompleta (${dishes.length} piatti finora). ` +
            `Aggiungi TUTTE le categorie e piatti mancanti.\n` +
            `Già estratti (non ripetere): ${known || '(nessuno)'}`
        ),
        65000
      );
      if (!more) break;
      const before = dishes.length;
      dishes = mergeDishes(dishes, normalizeDishes(more));
      if (dishes.length === before) break;
    }

    if (dishes.length < 2) return null;
    return {
      found: true,
      sourceLabel: label,
      sourceUrl: menuUrl,
      dishes,
      notes: [`Menu online: ${label} (${dishes.length} piatti)`],
    };
  } catch {
    return null;
  }
}

export async function verifyPublicUrl(url?: string) {
  const u = String(url || '').trim();
  if (!/^https?:\/\//i.test(u)) return false;
  try {
    await assertPublicUrl(u);
    const res = await fetch(u, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': UA, Accept: 'text/html,*/*' },
    });
    return res.ok || res.status === 403;
  } catch {
    return false;
  }
}

export async function searchMenuOnline(opts: {
  name: string;
  city?: string;
  website?: string;
  urls?: string[];
  glovo?: string;
  deliveroo?: string;
  justeat?: string;
}): Promise<OnlineMenuSearchResult> {
  const empty: OnlineMenuSearchResult = {
    found: false,
    sourceLabel: '',
    sourceUrl: '',
    dishes: [],
    notes: [],
  };
  if (!hasOpenAiKey() || !opts.name?.trim()) return empty;

  const deliveryUrls = [opts.deliveroo, opts.glovo, opts.justeat].filter(Boolean) as string[];
  let bestDelivery: OnlineMenuSearchResult | null = null;
  for (const menuUrl of deliveryUrls) {
    const fromDelivery = await searchMenuFromDeliveryPage(menuUrl, opts.name);
    if (!fromDelivery) continue;
    if (!bestDelivery || fromDelivery.dishes.length > bestDelivery.dishes.length) {
      bestDelivery = fromDelivery;
    }
    if (fromDelivery.dishes.length >= 20) return fromDelivery;
  }
  if (bestDelivery && bestDelivery.dishes.length >= 2) return bestDelivery;

  const hints = [
    ...deliveryUrls,
    opts.website,
    ...(opts.urls || []).filter((u) => !deliveryUrls.includes(u)).slice(0, 6),
  ]
    .filter(Boolean)
    .join('\n');

  const prompt = `Cerca online il menu completo del ristorante "${opts.name}"${opts.city ? ` a ${opts.city}` : ''} (Italia).

PRIORITÀ: se hai link Deliveroo, Glovo o Just Eat del locale, usali per estrarre il menu da lì.

Consulta anche sito ufficiale, Google, TheFork — dove disponibili.

Link già noti:
${hints || '(nessuno)'}

Restituisci SOLO JSON valido:
{
  "found": false,
  "source": "",
  "source_url": "",
  "dishes": [
    {
      "name": "",
      "category": "",
      "price": 0,
      "description": "",
      "ingredients": "",
      "image_url": ""
    }
  ]
}

Regole:
- found:true solo se trovi almeno 2 piatti reali con nome (e prezzo quando visibile).
- source: deliveroo, glovo, justeat, website, google, thefork, ubereats…
- source_url: pagina menu usata.
- category: in italiano (Antipasti, Primi, Secondi, Pizze, Dolci, Bevande, Contorni…).
- price: numero in euro; 0 se assente online.
- image_url: URL diretto foto piatto se visibile, altrimenti "".
- Non inventare piatti o prezzi.`;

  try {
    const parsed = await callOpenAIMenuSearch(prompt, 50000);
    if (!parsed) return empty;
    const fromGeneral = resultFromParsed(parsed);
    if (fromGeneral) return fromGeneral;
    empty.notes.push(`Menu online: trovati solo ${normalizeDishes(parsed).length} piatti`);
    return empty;
  } catch (error) {
    empty.notes.push(`Ricerca menu: ${error instanceof Error ? error.message : 'errore'}`);
    return empty;
  }
}
