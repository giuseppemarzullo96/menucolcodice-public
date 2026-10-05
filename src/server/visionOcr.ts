import { loadCategories, matchCategory } from './menuStore';
import { chatCompletions, extractJson } from './aiClient';
import { loadIntegrations } from './integrations';
import { compressMenuImageBase64 } from './imageCompress';
import { recordAiUsage } from './aiUsageStore';
import { currentTenant } from './tenant';
import { ALLERGEN_LABELS } from '@/constants/allergens';

export type ParsedMenuProduct = {
  name: string;
  category: string;
  price: number;
  ingredients: string;
  description: string;
  allergens: string[];
};

const OFFICIAL_ALLERGENS = ALLERGEN_LABELS;

/**
 * Il modello spesso risponde con la forma abbreviata di un allergene ("glutine",
 * "uova") anche quando gli si passa l'elenco ufficiale nel prompt. Il confronto
 * esatto con le stringhe lunghe le faceva sparire in silenzio: qui trattandosi di
 * un dato di sicurezza alimentare, meglio riconoscere i sinonimi comuni.
 */
const ALLERGEN_ALIASES: Array<{ official: string; keywords: string[] }> = [
  { official: OFFICIAL_ALLERGENS[0], keywords: ['glutine', 'cereali', 'grano', 'frumento', 'orzo', 'avena'] },
  { official: OFFICIAL_ALLERGENS[1], keywords: ['crostacei', 'gamberi', 'gamberetti', 'scampi'] },
  { official: OFFICIAL_ALLERGENS[2], keywords: ['uova', 'uovo'] },
  { official: OFFICIAL_ALLERGENS[3], keywords: ['pesce'] },
  { official: OFFICIAL_ALLERGENS[4], keywords: ['arachidi'] },
  { official: OFFICIAL_ALLERGENS[5], keywords: ['soia'] },
  { official: OFFICIAL_ALLERGENS[6], keywords: ['latte', 'lattosio', 'latticini'] },
  { official: OFFICIAL_ALLERGENS[7], keywords: ['frutta a guscio', 'noci', 'mandorle', 'nocciole', 'frutta secca', 'pistacchi', 'nocciola'] },
  { official: OFFICIAL_ALLERGENS[8], keywords: ['sedano'] },
  { official: OFFICIAL_ALLERGENS[9], keywords: ['senape', 'mostarda'] },
  { official: OFFICIAL_ALLERGENS[10], keywords: ['sesamo'] },
  { official: OFFICIAL_ALLERGENS[11], keywords: ['solfiti'] },
  { official: OFFICIAL_ALLERGENS[12], keywords: ['lupini'] },
  { official: OFFICIAL_ALLERGENS[13], keywords: ['molluschi', 'cozze', 'vongole', 'calamari', 'polpo', 'seppia'] },
];

function normalizeAllergen(raw: string): string | null {
  const value = String(raw || '').trim().toLowerCase();
  if (!value) return null;
  const exact = OFFICIAL_ALLERGENS.find((a) => a.toLowerCase() === value);
  if (exact) return exact;
  const hit = ALLERGEN_ALIASES.find((entry) => entry.keywords.some((kw) => value === kw || value.includes(kw)));
  return hit ? hit.official : null;
}

function parsePrice(value: unknown) {
  const n = Number(String(value ?? '').replace(/[^\d.,]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function toDataUrl(imageBase64: string): string {
  const raw = String(imageBase64 || '').trim();
  if (raw.startsWith('data:image/')) return raw;
  const b64 = raw.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '');
  const mime = b64.startsWith('iVBOR')
    ? 'image/png'
    : b64.startsWith('R0lGOD')
      ? 'image/gif'
      : b64.startsWith('UklGR')
        ? 'image/webp'
        : 'image/jpeg';
  return `data:${mime};base64,${b64}`;
}

function schemaPrompt(categoryNames: string) {
  return `Sei un assistente per ristoranti italiani. Leggi il menu cartaceo nella foto.

Categorie già presenti: ${categoryNames}

Restituisci SOLO JSON valido con questa forma:
{"products":[{"name":"","category":"","price":0,"ingredients":"","description":"","allergens":[]}]}

Regole:
- Estrai ogni piatto visibile con nome e prezzo.
- category: usa una categoria esistente se possibile, altrimenti un nome italiano chiaro.
- price: numero in euro (usa il punto per i decimali). Se ci sono più prezzi, prendi il primo.
- ingredients: TRASCRIVI gli ingredienti scritti per quel piatto. Sono spesso in piccolo sotto il nome, dopo un trattino, in corsivo o tra parentesi. Elenco breve, minuscolo, separato da virgole.
- Se per un piatto NON ci sono ingredienti scritti nel foglio, metti ingredients: "".
- VIETATO inventare ingredienti dal nome (es. non scrivere "pomodoro, mozzarella" per una Margherita se non sono scritti).
- description: eventuale nota breve già scritta nel menu, altrimenti "".
- allergens: solo se evidenti, scegliendo tra: ${OFFICIAL_ALLERGENS.join('; ')}
- Ignora loghi, QR, recapiti, slogan, numeri di pagina.
- Non inventare piatti che non sono nel foglio.`;
}

function cleanIngredients(name: string, raw: string) {
  const ingredients = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!ingredients) return '';
  const n = name.toLowerCase().replace(/[^a-z0-9]+/gi, ' ').trim();
  const i = ingredients.toLowerCase().replace(/[^a-z0-9]+/gi, ' ').trim();
  if (!i || i === n) return '';
  return ingredients;
}

function normalizeProducts(parsed: any): ParsedMenuProduct[] {
  const categories = loadCategories();
  const products = Array.isArray(parsed?.products) ? parsed.products : [];
  return products
    .map((item: any) => {
      const name = String(item.name || '').trim();
      if (!name) return null;
      const rawCategory = String(item.category || '').trim();
      return {
        name,
        category: matchCategory(rawCategory, categories),
        price: parsePrice(item.price),
        ingredients: cleanIngredients(name, String(item.ingredients || '')),
        description: String(item.description || item.ingredients || '').trim(),
        allergens: Array.isArray(item.allergens)
          ? Array.from(new Set(item.allergens.map((a: string) => normalizeAllergen(a)).filter(Boolean) as string[]))
          : [],
      } as ParsedMenuProduct;
    })
    .filter(Boolean) as ParsedMenuProduct[];
}

async function openaiReadMenu(imageBase64: string, prompt: string) {
  const cfg = loadIntegrations();
  if (!cfg.openai.apiKey) {
    throw new Error('Manca la OpenAI API key. Inseriscila nel tab Scansiona menu: le foto del menu richiedono OpenAI.');
  }
  const model = cfg.openai.model || 'gpt-4o-mini';
  const content = await chatCompletions({
    baseUrl: 'https://api.openai.com/v1',
    apiKey: cfg.openai.apiKey,
    model,
    timeoutMs: 120000,
    messages: [
      { role: 'system', content: prompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Analizza questa foto di un menu cartaceo. Trascrivi nome, prezzo e INGREDIENTI visibili di ogni piatto. Restituisci solo il JSON.' },
          // Immagine già compressa (max 1600px): detail high resta leggibile sui prezzi piccoli
          { type: 'image_url', image_url: { url: toDataUrl(imageBase64), detail: 'high' } },
        ],
      },
    ],
  });
  try {
    recordAiUsage({
      slug: currentTenant().slug,
      kind: 'openai',
      provider: 'openai',
      model,
      note: 'ocr-vision',
    });
  } catch {
    /* ignore usage log */
  }
  return content;
}

async function deepseekRefine(rawJson: string, prompt: string) {
  const cfg = loadIntegrations();
  if (!cfg.deepseek.apiKey) return rawJson;
  try {
    const model = cfg.deepseek.model || 'deepseek-v4-flash';
    const content = await chatCompletions({
      baseUrl: 'https://api.deepseek.com',
      apiKey: cfg.deepseek.apiKey,
      model,
      timeoutMs: 60000,
      messages: [
        { role: 'system', content: prompt },
        {
          role: 'user',
          content:
            'Normalizza questo JSON di piatti. Correggi categorie italiane, prezzi (punto decimale) e nomi.\n' +
            'Copia il campo ingredients così com’è: non svuotarlo, non inventarlo, non sostituirlo con il nome del piatto.\n' +
            'Se ingredients è vuoto, lascialo vuoto. Non aggiungere piatti assenti.\n\n' +
            rawJson,
        },
      ],
    });
    try {
      recordAiUsage({
        slug: currentTenant().slug,
        kind: 'deepseek',
        provider: 'deepseek',
        model,
        note: 'ocr-refine',
      });
    } catch {
      /* ignore */
    }
    return content;
  } catch (error) {
    console.error('DeepSeek refine fallback:', error instanceof Error ? error.message : error);
    return rawJson;
  }
}

function restoreIngredients(refined: ParsedMenuProduct[], vision: ParsedMenuProduct[]) {
  // Se DeepSeek ha "normalizzato" un nome (refuso corretto, accenti, plurale...) il
  // match per nome esatto fallisce. Con lo stesso numero di piatti nello stesso ordine
  // possiamo appoggiarci anche alla posizione, invece di perdere ingredienti corretti.
  const sameCount = refined.length === vision.length;
  return refined.map((item, index) => {
    const fromVisionByName = vision.find(
      (other) => other.name.toLowerCase().trim() === item.name.toLowerCase().trim()
    );
    const fromVision = fromVisionByName || (sameCount ? vision[index] : undefined);
    const ingredients =
      cleanIngredients(item.name, item.ingredients) ||
      (fromVision ? cleanIngredients(fromVision.name, fromVision.ingredients) : '');
    return {
      ...item,
      ingredients,
      description: item.description || ingredients,
    };
  });
}

export async function parseMenuImage(imageBase64: string): Promise<ParsedMenuProduct[]> {
  const categories = loadCategories();
  const categoryNames =
    categories.map((c) => c.name).join(', ') ||
    'Antipasti, Primi Piatti, Secondi Piatti, Contorni, Dolci, Bevande';
  const prompt = schemaPrompt(categoryNames);
  const compressed = await compressMenuImageBase64(imageBase64);
  const openaiContent = await openaiReadMenu(compressed, prompt);
  let visionProducts: ParsedMenuProduct[] = [];
  try {
    visionProducts = normalizeProducts(extractJson(openaiContent));
  } catch {
    visionProducts = [];
  }
  const refined = await deepseekRefine(openaiContent, prompt);
  let products: ParsedMenuProduct[] = [];
  try {
    const refinedProducts = normalizeProducts(extractJson(refined));
    // DeepSeek deve solo ripulire gli stessi piatti letti dalla foto, non aggiungerne
    // o perderne. Se il conteggio non coincide con quello letto dalla foto (che ha un
    // prompt anti-allucinazione dedicato), non ci fidiamo del refine e teniamo la
    // lettura originale.
    const trustRefine = !visionProducts.length || refinedProducts.length === visionProducts.length;
    products = trustRefine ? restoreIngredients(refinedProducts, visionProducts) : visionProducts;
  } catch {
    products = visionProducts;
  }
  try {
    recordAiUsage({
      slug: currentTenant().slug,
      kind: 'ocr',
      pages: 1,
      note: 'menu-page',
    });
  } catch {
    /* ignore */
  }
  return products;
}

export async function parseMenuImages(imagesBase64: string[]): Promise<ParsedMenuProduct[]> {
  const all: ParsedMenuProduct[] = [];
  const seen = new Set<string>();
  let failures = 0;
  let lastError: unknown = null;
  for (const image of imagesBase64) {
    let batch: ParsedMenuProduct[] = [];
    try {
      batch = await parseMenuImage(image);
    } catch (error) {
      // Una foto che fallisce (rete, rate limit...) non deve far perdere i piatti
      // già letti dalle altre foto della stessa sessione.
      failures += 1;
      lastError = error;
      console.error('OCR foto menu fallita, continuo con le altre:', error instanceof Error ? error.message : error);
      continue;
    }
    for (const product of batch) {
      const key = `${product.name.toLowerCase()}|${product.category.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(product);
    }
  }
  // Se hanno fallito TUTTE le foto per un errore vero (non "non ho trovato piatti"),
  // il chiamante deve saperlo per non dire "fai una foto migliore" quando il problema
  // è tecnico (chiave, rete, quota) e non la qualità della foto.
  if (!all.length && imagesBase64.length > 0 && failures === imagesBase64.length && lastError) {
    throw lastError;
  }
  return all;
}
