import fs from 'fs';
import path from 'path';
import {
  addCategory,
  appendProducts,
  countProductsInCategory,
  deleteCategory,
  deleteProduct,
  deleteProducts,
  findCategory,
  findProduct,
  loadCategories,
  loadProducts,
  matchCategory,
  normalizeName,
  tomorrowMidnightRomeMs,
  updateCategory,
  updateProduct,
  type MenuProduct,
} from './menuStore';
import { parseMenuImages, ParsedMenuProduct } from './visionOcr';
import { processDishImageFromBase64, uploadsDir, dishImageUrl } from './dishImage';
import { hasImportableUrls } from './restaurantImport';
import { sendWhatsAppImage, sendWhatsAppPoll, sendWhatsAppSticker, sendWhatsAppText } from './whatsapp';
import {
  stickerPublicUrl,
  type StickerId,
} from './whatsappStickers';
import {
  continueSetup,
  handleSetupShortcut,
  isSetupTrigger,
  type SetupDraft,
  type SetupSession,
} from './whatsappSetup';
import { normalizeVoiceCommand, looksLikeMultipleCommands, splitMultiCommandMessage, startsWithCommand } from './whatsappVoice';
import { assertOcrAllowed, assertOcrScanQuota, assertWhatsAppAllowed, assertModel3dQuota, PlanLimitError, tenantDataDir, currentTenant } from './tenant';
import { submitMultiviewTask, tripo3dConfigured } from './tripo3d';
import { addModel3dJob, hasActiveJobForProduct } from './model3dJobs';
import { regenerateTenantAccessCode } from './adminAccessCode';
import { ALLERGENS } from '@/constants/allergens';
import {
  categoryIconByIndex,
  categoryIconLabel,
  DEFAULT_CATEGORY_ICON,
  normalizeCategoryIconId,
  resolveCategoryIconId,
} from '@/constants/categoryIcons';
import { generateCategoryIconsCollage } from './categoryIconsImage';
import {
  welcomeText,
  shortHelpText,
  everythingMenuText,
  dishesHelpText,
  dishesHelpTextAdvanced,
  categoriesHelpText,
  graphicsHelpText,
  graphicsHelpTextAdvanced,
  securityHelpText,
  statsAndOtherHelpText,
  pinnedMessageText,
  SESSION_EXPIRED_MSG,
} from './whatsappHelp';
import { pushUndo, applyUndo } from './whatsappUndo';
import { statsText, menuLinkText, menuOrigin } from './whatsappStats';

type AddDraft = {
  step: 'name' | 'category' | 'price' | 'ingredients' | 'allergens' | 'bestSeller' | 'photo' | 'confirm';
  name?: string;
  category?: string;
  price?: number;
  ingredients?: string;
  imageUrl?: string;
  allergens?: string[];
  bestSeller?: boolean;
  /** In attesa di conferma: il testo scritto sembrava un comando (es. "cancella"), non un nome. */
  pendingLiteralName?: string;
};

type EditDraft = {
  step: 'pick' | 'edit-field' | 'edit-value' | 'allergens' | 'bestSeller' | 'photo';
  productId?: string;
  field?: 'name' | 'category' | 'price' | 'ingredients' | 'allergens' | 'bestSeller' | 'photo';
};

type CategoryDraft = {
  step: 'name' | 'description' | 'icon' | 'confirm' | 'pick' | 'edit-field' | 'edit-value' | 'delete-confirm';
  action: 'add' | 'edit' | 'delete';
  target?: string;
  name?: string;
  description?: string;
  icon?: string;
  order?: number;
  field?: 'name' | 'description' | 'icon' | 'order';
  /** In attesa di conferma: il testo scritto sembrava un comando (es. "cancella"), non un nome. */
  pendingLiteralName?: string;
};

type PollOption = { label: string; productId: string };
type PollPage = { msgId: string; options: PollOption[] };

type BulkPriceChange = { id: string; name: string; from: number; to: number };

type PendingSession = {
  number: string;
  createdAt: number;
  kind:
    | 'import'
    | 'add'
    | 'delete'
    | 'delete-confirm'
    | 'photo'
    | 'setup'
    | 'ocr'
    | 'category'
    | 'edit'
    | 'bulk-price'
    | 'voice-confirm'
    | 'regen-code-confirm'
    | 'model3d-photos'
    | 'category-icon-pick';
  products?: ParsedMenuProduct[];
  add?: AddDraft;
  edit?: EditDraft;
  setup?: SetupDraft;
  category?: CategoryDraft;
  polls?: PollPage[];
  selectedIds?: string[];
  photoProductId?: string;
  ocrFiles?: string[];
  bulkPrice?: BulkPriceChange[];
  /** Testo pulito da un vocale in attesa di conferma */
  voiceText?: string;
  /** Foto raccolte per la generazione del modello 3D (nome file in public/uploads/). */
  model3dPhotos?: string[];
  /** Categoria in attesa di un numero dal collage icone (kind: 'category-icon-pick'). */
  iconPickTarget?: string;
};

function pendingPath() {
  return path.join(tenantDataDir(), 'whatsapp-pending.json');
}

const SESSION_MS = 24 * 60 * 60 * 1000;
const SESSION_EXPIRED = SESSION_EXPIRED_MSG;
const CANCEL_MSG = 'Ok, lasciamo stare. Non ho cambiato niente.';
const ON_MENU_ALREADY = 'È già così sul menu del locale.';
const OCR_UNREADABLE_MSG =
  'Non riesco a leggere questa foto. Provo meglio se la fai dall’alto, con il foglio ben illuminato e una pagina per volta.';
const OCR_TECHNICAL_MSG =
  'Il servizio di lettura foto ha un problema momentaneo. Riprova tra qualche minuto, oppure scrivi i piatti a mano con *aggiungi*.';

function loadPending(): Record<string, PendingSession> {
  if (!fs.existsSync(pendingPath())) return {};
  try {
    const raw = JSON.parse(fs.readFileSync(pendingPath(), 'utf8'));
    const out: Record<string, PendingSession> = {};
    for (const [key, value] of Object.entries(raw || {})) {
      const session = value as any;
      if (!session) continue;
      out[key] = {
        number: session.number || key,
        createdAt: session.createdAt || Date.now(),
        kind: session.kind || (session.products ? 'import' : 'add'),
        products: session.products,
        add: session.add,
        edit: session.edit,
        setup: session.setup,
        category: session.category,
        polls: session.polls,
        selectedIds: session.selectedIds,
        photoProductId: session.photoProductId,
        model3dPhotos: Array.isArray(session.model3dPhotos) ? session.model3dPhotos : undefined,
        ocrFiles: Array.isArray(session.ocrFiles) ? session.ocrFiles : [],
        bulkPrice: Array.isArray(session.bulkPrice) ? session.bulkPrice : undefined,
        voiceText: session.voiceText ? String(session.voiceText) : undefined,
        iconPickTarget: session.iconPickTarget ? String(session.iconPickTarget) : undefined,
      };
    }
    return out;
  } catch {
    return {};
  }
}

function savePending(data: Record<string, PendingSession>) {
  fs.writeFileSync(pendingPath(), JSON.stringify(data, null, 2), 'utf8');
}

export async function beginSetupSession(number: string, session: PendingSession, message: string, sendCovers = false) {
  const pending = loadPending();
  pending[number] = session;
  savePending(pending);
  await sendWhatsAppText(number, message);
  if (sendCovers && session.setup) {
    await sendCoverChoices(number, session.setup);
  }
}

function ocrDir() {
  return path.join(tenantDataDir(), 'whatsapp-ocr');
}
const OCR_WAIT_MS = 3500;
const ocrTimers = new Map<string, NodeJS.Timeout>();
const ocrRunning = new Set<string>();

function cleanupOcrFiles(files?: string[]) {
  for (const file of files || []) {
    try {
      if (file && fs.existsSync(file)) fs.unlinkSync(file);
    } catch {
      /* ignore */
    }
  }
}

function saveOcrImage(number: string, imageBase64: string) {
  fs.mkdirSync(ocrDir(), { recursive: true });
  const raw = Buffer.from(String(imageBase64).replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, ''), 'base64');
  const file = path.join(ocrDir(), `${number}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`);
  fs.writeFileSync(file, raw);
  return file;
}

function readOcrImage(file: string) {
  const buf = fs.readFileSync(file);
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

function mergeParsed(base: ParsedMenuProduct[], extra: ParsedMenuProduct[]) {
  const seen = new Set(base.map((item) => `${item.name.toLowerCase()}|${item.category.toLowerCase()}`));
  const out = [...base];
  for (const item of extra) {
    const key = `${item.name.toLowerCase()}|${item.category.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function importPreview(products: ParsedMenuProduct[]) {
  const lines = products.slice(0, 12).map((item, index) => {
    const ingredients = item.ingredients
      ? item.ingredients.length > 90
        ? `${item.ingredients.slice(0, 87)}…`
        : item.ingredients
      : 'ingredienti non letti';
    // Prezzo non letto/non interpretabile: non mostrarlo come "€0,00" (sembra un
    // piatto gratis), va segnalato così il ristoratore lo corregge prima di importare.
    const price = item.price > 0 ? `€${item.price.toFixed(2)}` : 'prezzo da controllare';
    return `${index + 1}. *${item.name}* — ${item.category} — ${price}\n   ${ingredients}`;
  });
  const withIng = products.filter((item) => item.ingredients).length;
  const missingPrice = products.filter((item) => !(item.price > 0)).length;
  return (
    `Ho trovato ${products.length} piatti (ingredienti letti su ${withIng}` +
    `${missingPrice ? `, ${missingPrice} da controllare il prezzo` : ''}):\n\n` +
    `${lines.join('\n')}${products.length > 12 ? '\n…' : ''}\n\n` +
    `Li importo nel menu? Scrivi *sì* / *conferma*, oppure *annulla*.\n` +
    `Se manca una pagina, invia un’altra foto.`
  );
}

function scheduleMenuOcr(number: string) {
  const prev = ocrTimers.get(number);
  if (prev) clearTimeout(prev);
  ocrTimers.set(
    number,
    setTimeout(() => {
      ocrTimers.delete(number);
      finishMenuOcr(number).catch((error) => {
        console.error('OCR menu WhatsApp:', error);
      });
    }, OCR_WAIT_MS)
  );
}

async function enqueueMenuPhoto(number: string, imageBase64: string) {
  try {
    assertOcrAllowed();
  } catch (error) {
    await reply(
      number,
      error instanceof PlanLimitError
        ? error.message
        : 'La scansione del menu cartaceo è disponibile solo nel piano Pro.'
    );
    return;
  }
  const pending = loadPending();
  const current = pending[number];
  const keepProducts = current?.kind === 'ocr' || current?.kind === 'import' ? current.products || [] : [];
  const keepFiles = current?.kind === 'ocr' ? current.ocrFiles || [] : [];
  const file = saveOcrImage(number, imageBase64);
  const files = [...keepFiles, file];
  pending[number] = {
    number,
    createdAt: Date.now(),
    kind: 'ocr',
    products: keepProducts,
    ocrFiles: files,
  };
  savePending(pending);
  await reply(
    number,
    files.length === 1
      ? 'Sto elaborando la foto del menu cartaceo…\nSe hai altre pagine, inviale ora.'
      : `Ho ricevuto ${files.length} pagine. Continuo a elaborare…`
  );
  scheduleMenuOcr(number);
}

async function finishMenuOcr(number: string) {
  if (ocrRunning.has(number)) {
    scheduleMenuOcr(number);
    return;
  }
  ocrRunning.add(number);
  try {
    while (true) {
      const pending = loadPending();
      const session = pending[number];
      if (!session || session.kind !== 'ocr') return;
      const files = (session.ocrFiles || []).filter((file) => file && fs.existsSync(file));
      if (files.length === 0) {
        if (session.products?.length) {
          session.kind = 'import';
          session.ocrFiles = [];
          pending[number] = session;
          savePending(pending);
          await reply(number, importPreview(session.products));
        } else {
          delete pending[number];
          savePending(pending);
          await reply(
            number,
            OCR_UNREADABLE_MSG,
            'illeggibile'
          );
        }
        return;
      }
      session.ocrFiles = [];
      pending[number] = session;
      savePending(pending);
      let batch: ParsedMenuProduct[] = [];
      try {
        assertOcrScanQuota(files.length);
        batch = await parseMenuImages(files.map(readOcrImage));
      } catch (error) {
        cleanupOcrFiles(files);
        const { message, sticker } = ocrFailureMessage(error);
        await reply(number, message, sticker);
        const again = loadPending();
        if (again[number]?.kind === 'ocr' && !(again[number].ocrFiles || []).length && !again[number].products?.length) {
          delete again[number];
          savePending(again);
        }
        return;
      }
      cleanupOcrFiles(files);
      const latest = loadPending();
      const live = latest[number];
      if (!live || (live.kind !== 'ocr' && live.kind !== 'import')) return;
      live.products = mergeParsed(live.products || [], batch);
      live.createdAt = Date.now();
      if ((live.ocrFiles || []).length > 0) {
        live.kind = 'ocr';
        latest[number] = live;
        savePending(latest);
        await reply(number, 'Sto leggendo anche le altre pagine…');
        continue;
      }
      live.kind = 'import';
      live.ocrFiles = [];
      latest[number] = live;
      savePending(latest);
      if (!live.products.length) {
        delete latest[number];
        savePending(latest);
        await reply(number, OCR_UNREADABLE_MSG, 'illeggibile');
        return;
      }
      await reply(number, importPreview(live.products));
      return;
    }
  } finally {
    ocrRunning.delete(number);
    const leftover = loadPending()[number];
    if (leftover?.kind === 'ocr' && (leftover.ocrFiles || []).length) {
      scheduleMenuOcr(number);
    }
  }
}

function suggestClosestProduct(query: string): MenuProduct | undefined {
  const needle = normalizeName(query);
  if (!needle) return undefined;
  const products = loadProducts();
  const byInclude = products.find((p) => {
    const n = normalizeName(p.name);
    return n.includes(needle) || needle.includes(n);
  });
  if (byInclude) return byInclude;
  const words = needle.split(' ').filter((w) => w.length > 2);
  let best: { product: MenuProduct; score: number } | undefined;
  for (const p of products) {
    const n = normalizeName(p.name);
    const score = words.filter((w) => n.includes(w)).length;
    if (score > 0 && (!best || score > best.score)) best = { product: p, score };
  }
  return best?.product;
}

function productNotFoundMessage(query: string) {
  const hint = suggestClosestProduct(query);
  if (hint) return `Piatto non trovato: ${query}. Intendevi *${hint.name}*?`;
  return `Piatto non trovato: ${query}`;
}

/**
 * Un errore tecnico (chiave mancante, rete, quota API) non è colpa della foto: dirlo
 * come se lo fosse manda il ristoratore a rifare foto inutilmente, mentre il problema
 * vero resta invisibile a chi gestisce la piattaforma. Qui si logga sempre il dettaglio
 * reale lato server e si sceglie un messaggio onesto per l'utente.
 */
function ocrFailureMessage(error: unknown): { message: string; sticker?: StickerId } {
  if (error instanceof PlanLimitError) {
    return { message: error.message };
  }
  console.error('OCR menu fallito:', error instanceof Error ? error.stack || error.message : error);
  const text = error instanceof Error ? error.message : '';
  const isTechnical = /manca la .*api key|openai \d|deepseek \d|http \d{3}|timeout|fetch failed|network|ECONNRESET|ETIMEDOUT/i.test(
    text
  );
  return { message: isTechnical ? OCR_TECHNICAL_MSG : OCR_UNREADABLE_MSG, sticker: 'illeggibile' };
}

function categoryNotFoundMessage(query: string) {
  const needle = normalizeName(query);
  const categories = loadCategories();
  const hint = categories.find((c) => {
    const n = normalizeName(c.name);
    return n.includes(needle) || needle.includes(n);
  });
  if (hint) return `Categoria non trovata: ${query}. Intendevi *${hint.name}*?`;
  return `Categoria non trovata: ${query}`;
}

function formatProduct(p: { id: string; name: string; category: string; price: number }) {
  return `#${p.id} ${p.name} (${p.category}) €${Number(p.price).toFixed(2)}`;
}

async function reply(number: string, text: string, sticker?: StickerId | null) {
  if (sticker) {
    try {
      await sendWhatsAppSticker({ number, stickerUrl: stickerPublicUrl(sticker) });
    } catch (error) {
      console.error('Invio sticker WhatsApp fallito', sticker, error);
    }
  }
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > 3500) {
    chunks.push(rest.slice(0, 3500));
    rest = rest.slice(3500);
  }
  chunks.push(rest);
  for (const chunk of chunks) {
    await sendWhatsAppText(number, chunk);
  }
}

function uploadPathFromUrl(url: string) {
  const match = String(url || '').match(/filename=([^&]+)/);
  if (!match) return '';
  return path.join(process.cwd(), 'public', 'uploads', decodeURIComponent(match[1]));
}

async function sendCoverChoices(number: string, draft?: SetupDraft | null) {
  const choices = draft?.coverChoices || [];
  for (let i = 0; i < choices.length; i += 1) {
    const filePath = uploadPathFromUrl(choices[i]);
    if (!filePath || !fs.existsSync(filePath)) continue;
    try {
      await sendWhatsAppImage({
        number,
        filePath,
        caption: `${i + 1}`,
      });
    } catch (error) {
      console.error('Invio sfondo WhatsApp fallito', error);
    }
  }
}

async function runSetup(number: string, session: SetupSession, text: string, imageBase64?: string | null) {
  try {
    const result = await continueSetup(session, text, imageBase64);
    const pending = loadPending();
    if (result.done) {
      delete pending[number];
    } else if (result.session) {
      pending[number] = result.session;
    }
    savePending(pending);
    if (result.message) {
      await reply(number, result.message, result.message.includes('grafica e logo') ? 'grafica' : undefined);
    }
    if (result.sendCovers && result.session?.setup) {
      await sendCoverChoices(number, result.session.setup);
    }
  } catch (error) {
    console.error('runSetup error:', error);
    await reply(
      number,
      `Si è verificato un errore durante la configurazione. Scrivi *configura* per riprendere.\n(${error instanceof Error ? error.message : 'errore'})`
    );
  }
}

function isCancel(text: string) {
  return ['annulla', 'anulla', 'esci', 'stop', 'basta'].includes(text);
}

function isYes(text: string) {
  return ['si', 'sì', 'ok', 'okay', 'va bene', 'conferma', 'confermo', 'yes'].includes(text);
}

function isNo(text: string) {
  return ['no', 'nope', 'non ancora'].includes(text);
}

function isSkip(text: string) {
  return ['salta', 'skip', 'nessuno', 'niente', '-', 'no'].includes(text);
}

/**
 * "cancella" scritto da chi intendeva "annulla" (confusione comune) finiva salvato
 * come nome/descrizione senza nessun avviso. Qui si intercettano le parole più
 * ambigue quando arrivano da sole, per chiedere conferma invece di accettarle mute.
 */
const STRAY_COMMAND_WORDS = ['cancella', 'annulla', 'elimina', 'basta', 'stop', 'esci'];

function looksLikeStrayCommand(text: string) {
  return STRAY_COMMAND_WORDS.includes(text.trim().toLowerCase());
}

function parsePrice(text: string): number | null {
  const match = text.replace(/\s/g, '').replace('€', '').match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  const value = Number(match[1].replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

function categoryPrompt() {
  const categories = loadCategories();
  const lines = categories.map((c, i) => `${i + 1}. ${c.name}`);
  return `In quale categoria lo metto?\n\n${lines.join('\n') || 'Nessuna categoria ancora.'}\n\nRispondi col numero, oppure scrivi un nome (anche nuovo).`;
}

function recap(draft: AddDraft) {
  const allergens = (draft.allergens || []).length ? draft.allergens!.join(', ') : 'nessuno';
  return `Perfetto, controlla:\n\n• Nome: ${draft.name}\n• Categoria: ${draft.category}\n• Prezzo: €${Number(draft.price || 0).toFixed(2)}\n• Ingredienti: ${draft.ingredients || '—'}\n• Allergeni: ${allergens}\n• Consigliato: ${draft.bestSeller ? 'sì' : 'no'}\n• Foto: ${draft.imageUrl ? 'sì' : 'no'}\n\nLo metto nel menu? Scrivi *sì* o *no*.`;
}

function startAdd(number: string, nameHint = '') {
  const pending = loadPending();
  const name = nameHint.trim();
  pending[number] = {
    number,
    createdAt: Date.now(),
    kind: 'add',
    add: name
      ? { step: 'category', name }
      : { step: 'name' },
  };
  savePending(pending);
  return name
    ? `Ok, aggiungiamo *${name}*.\n\n${categoryPrompt()}`
    : 'Ok, aggiungiamo un piatto.\n\nCome si chiama?';
}

const SKIP_POLL_LABEL = 'Nessuno di questi';

const BEST_SELLER_YES = 'Sì, è consigliato';
const BEST_SELLER_NO = 'No, non lo è';

function productPollLabel(p: { id: string; name: string; price: number }) {
  return `#${p.id} ${p.name} €${Number(p.price).toFixed(2)}`.slice(0, 80);
}

function chunkItems<T>(items: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += size) groups.push(items.slice(i, i + size));
  return groups;
}

async function sendProductPolls(
  number: string,
  products: { id: string; name: string; price: number }[],
  title: string,
  mode: 'multi' | 'single'
): Promise<PollPage[]> {
  const pages: PollPage[] = [];
  const groups = chunkItems(products, 10);
  for (let i = 0; i < groups.length; i++) {
    const options: PollOption[] = groups[i].map((p) => ({
      label: productPollLabel(p),
      productId: p.id,
    }));
    if (options.length === 1) {
      options.push({ label: SKIP_POLL_LABEL, productId: '' });
    }
    const values = options.map((o) => o.label);
    const { msgId } = await sendWhatsAppPoll({
      number,
      name: groups.length > 1 ? `${title} (${i + 1}/${groups.length})` : title,
      values,
      selectableCount: mode === 'multi' ? values.length : 1,
    });
    pages.push({ msgId, options });
    if (i < groups.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 700));
    }
  }
  return pages;
}

async function sendAllergenPolls(number: string): Promise<PollPage[]> {
  const pages: PollPage[] = [];
  const groups = chunkItems(ALLERGENS, 7);
  for (let i = 0; i < groups.length; i += 1) {
    const options: PollOption[] = groups[i].map((item) => ({
      label: item.short,
      productId: item.full,
    }));
    if (options.length === 1) {
      options.push({ label: SKIP_POLL_LABEL, productId: '' });
    }
    const values = options.map((o) => o.label);
    const { msgId } = await sendWhatsAppPoll({
      number,
      name: groups.length > 1 ? `Allergeni (${i + 1}/${groups.length})` : 'Allergeni',
      values,
      selectableCount: values.length,
    });
    pages.push({ msgId, options });
    if (i < groups.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 700));
    }
  }
  return pages;
}

async function sendBestSellerPoll(number: string): Promise<PollPage[]> {
  const options: PollOption[] = [
    { label: BEST_SELLER_YES, productId: 'yes' },
    { label: BEST_SELLER_NO, productId: 'no' },
  ];
  const { msgId } = await sendWhatsAppPoll({
    number,
    name: 'È consigliato?',
    values: options.map((o) => o.label),
    selectableCount: 1,
  });
  return [{ msgId, options }];
}

function allergenSummary(names: string[]) {
  if (!names.length) return 'Nessun allergene selezionato.';
  return names.map((name) => `• ${name}`).join('\n');
}

function applyPollSelection(
  session: PendingSession,
  votedLabels: string[],
  pollMessageId: string,
  mode: 'multi' | 'single'
) {
  const polls = session.polls || [];
  let poll = polls.find((p) => p.msgId && pollMessageId && p.msgId === pollMessageId);
  if (!poll) {
    poll = polls.find((p) => p.options.some((o) => votedLabels.includes(o.label)));
  }
  const votedIds = votedLabels
    .map((label) => {
      const fromPoll = poll?.options.find((o) => o.label === label)?.productId;
      if (fromPoll) return fromPoll;
      const match = label.match(/^#(\d+)/);
      return match ? match[1] : '';
    })
    .filter(Boolean);

  if (mode === 'single') {
    session.selectedIds = votedIds.slice(0, 1);
    session.photoProductId = session.selectedIds[0] || '';
    return;
  }

  if (!poll) {
    session.selectedIds = Array.from(new Set([...(session.selectedIds || []), ...votedIds]));
    return;
  }
  const pageIds = new Set(poll.options.map((o) => o.productId).filter(Boolean));
  const rest = (session.selectedIds || []).filter((id) => !pageIds.has(id));
  session.selectedIds = [...rest, ...votedIds];
}

function selectedSummary(ids: string[]) {
  const products = loadProducts();
  const selected = ids
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean) as { id: string; name: string; category: string; price: number }[];
  if (selected.length === 0) return 'Nessun piatto selezionato.';
  return selected.map((p) => `• ${formatProduct(p)}`).join('\n');
}

async function startDeletePoll(number: string) {
  const products = loadProducts();
  if (products.length === 0) {
    await reply(number, 'Non ci sono piatti da eliminare.');
    return;
  }
  const polls = await sendProductPolls(
    number,
    products,
    'Quali piatti vuoi eliminare?',
    'multi'
  );
  const pending = loadPending();
  pending[number] = {
    number,
    createdAt: Date.now(),
    kind: 'delete',
    polls,
    selectedIds: [],
  };
  savePending(pending);
  await reply(
    number,
    'Ti ho mandato una lista: spunta i piatti da cancellare. Poi scrivi *cancella* per toglierli, o *annulla*.'
  );
}

async function startPhotoPoll(number: string, hint = '') {
  const products = loadProducts();
  if (hint) {
    const product = findProduct(hint);
    if (!product) {
      await reply(number, `${productNotFoundMessage(hint)}`);
      return;
    }
    const pending = loadPending();
    pending[number] = {
      number,
      createdAt: Date.now(),
      kind: 'photo',
      photoProductId: product.id,
      selectedIds: [product.id],
    };
    savePending(pending);
    await reply(number, `Invia la nuova foto per *${product.name}*.`);
    return;
  }
  if (products.length === 0) {
    await reply(number, 'Non ci sono piatti. Aggiungine uno prima.');
    return;
  }
  if (products.length === 1) {
    const pending = loadPending();
    pending[number] = {
      number,
      createdAt: Date.now(),
      kind: 'photo',
      photoProductId: products[0].id,
      selectedIds: [products[0].id],
    };
    savePending(pending);
    await reply(number, `Invia la nuova foto per *${products[0].name}*.`);
    return;
  }
  const polls = await sendProductPolls(number, products, 'Di quale piatto vuoi cambiare la foto?', 'single');
  const pending = loadPending();
  pending[number] = {
    number,
    createdAt: Date.now(),
    kind: 'photo',
    polls,
    selectedIds: [],
    photoProductId: '',
  };
  savePending(pending);
  await reply(number, 'Scegli un piatto nella lista, poi invia la nuova foto.');
}

function resolveCategory(answer: string) {
  const categories = loadCategories();
  const asNumber = Number(answer);
  if (Number.isInteger(asNumber) && asNumber >= 1 && asNumber <= categories.length) {
    return categories[asNumber - 1].name;
  }
  return matchCategory(answer, categories);
}

async function continueAdd(number: string, text: string, imageBase64?: string | null) {
  const pending = loadPending();
  const session = pending[number];
  if (!session?.add) return false;
  if (Date.now() - session.createdAt > SESSION_MS) {
    delete pending[number];
    savePending(pending);
    await reply(number, SESSION_EXPIRED, 'scaduta');
    return true;
  }

  const draft = session.add;
  const lower = text.toLowerCase();

  if (isCancel(lower) && !imageBase64) {
    delete pending[number];
    savePending(pending);
    await reply(number, CANCEL_MSG);
    return true;
  }

  if (imageBase64) {
    try {
      draft.imageUrl = (await processDishImageFromBase64(imageBase64)).url;
    } catch {
      await reply(number, 'Non sono riuscito a salvare la foto. Inviarla di nuovo, oppure scrivi *salta*.');
      return true;
    }
    if (draft.step === 'photo' || draft.step === 'confirm') {
      draft.step = 'confirm';
      session.createdAt = Date.now();
      savePending(pending);
      await reply(number, `Foto ricevuta.\n\n${recap(draft)}`);
      return true;
    }
    session.createdAt = Date.now();
    savePending(pending);
    await reply(number, 'Foto salvata, la allego a questo piatto. Continua a rispondere alle domande.');
    return true;
  }

  if (draft.step === 'name') {
    if (draft.pendingLiteralName) {
      const candidate = draft.pendingLiteralName;
      delete draft.pendingLiteralName;
      if (isYes(lower)) {
        draft.name = candidate;
        draft.step = 'category';
        session.createdAt = Date.now();
        savePending(pending);
        await reply(number, `Nome: *${draft.name}*.\n\n${categoryPrompt()}`);
        return true;
      }
      await reply(number, 'Ok, non l’ho salvato. Dimmi il nome del piatto.');
      savePending(pending);
      return true;
    }
    if (text.length < 2) {
      await reply(number, 'Dimmi il nome del piatto, ad esempio: Spaghetti carbonara');
      return true;
    }
    if (looksLikeStrayCommand(text)) {
      draft.pendingLiteralName = text;
      savePending(pending);
      await reply(
        number,
        `"${text}" sembra un comando, non il nome del piatto. È davvero il nome? Rispondi *sì* per salvarlo così, oppure scrivi il nome giusto.`
      );
      return true;
    }
    draft.name = text;
    draft.step = 'category';
    session.createdAt = Date.now();
    savePending(pending);
    await reply(number, `Nome: *${draft.name}*.\n\n${categoryPrompt()}`);
    return true;
  }

  if (draft.step === 'category') {
    draft.category = resolveCategory(text);
    draft.step = 'price';
    session.createdAt = Date.now();
    savePending(pending);
    await reply(number, `Categoria: *${draft.category}*.\n\nQuanto costa, in euro? Ad esempio: 12 oppure 7,50`);
    return true;
  }

  if (draft.step === 'price') {
    const price = parsePrice(text);
    if (price === null) {
      await reply(number, 'Non ho capito il prezzo. Scrivimi solo il numero: *9,50*');
      return true;
    }
    draft.price = price;
    draft.step = 'ingredients';
    session.createdAt = Date.now();
    savePending(pending);
    await reply(
      number,
      `Prezzo: *€${price.toFixed(2)}*.\n\nQuali sono gli ingredienti?\nSe non li vuoi indicare ora, scrivi *salta*.`
    );
    return true;
  }

  if (draft.step === 'ingredients') {
    draft.ingredients = isSkip(lower) ? draft.name || '' : text;
    draft.allergens = [];
    draft.step = 'allergens';
    session.selectedIds = [];
    session.polls = await sendAllergenPolls(number);
    session.createdAt = Date.now();
    savePending(pending);
    await reply(
      number,
      `Ingredienti: *${draft.ingredients || '—'}*.\n\nSeleziona gli *allergeni* nelle liste (puoi sceglierne più di uno). Poi scrivi *vai*.\nSe non ce ne sono, scrivi *nessuno* o *salta*.`
    );
    return true;
  }

  if (draft.step === 'allergens') {
    if (['salta', 'skip', 'nessuno', 'niente', 'nessun allergene', '-'].includes(lower)) {
      draft.allergens = [];
    } else if (lower !== 'vai' && lower !== 'avanti' && lower !== 'ok' && !isYes(lower)) {
      await reply(
        number,
        `Allergeni ora:\n${allergenSummary(draft.allergens || [])}\n\nScegli nelle liste, poi *vai*. Oppure *salta*.`
      );
      return true;
    } else {
      draft.allergens = session.selectedIds || draft.allergens || [];
    }
    draft.step = 'bestSeller';
    session.polls = await sendBestSellerPoll(number);
    session.createdAt = Date.now();
    savePending(pending);
    await reply(
      number,
      `Allergeni: *${(draft.allergens || []).length ? draft.allergens!.join(', ') : 'nessuno'}*.\n\nÈ *consigliato*?\nScegli nella lista, oppure scrivi *sì* o *no*.`
    );
    return true;
  }

  if (draft.step === 'bestSeller') {
    if (isYes(lower) || lower === BEST_SELLER_YES.toLowerCase()) {
      draft.bestSeller = true;
    } else if (isNo(lower) || lower === 'salta' || lower === 'skip' || lower === BEST_SELLER_NO.toLowerCase()) {
      draft.bestSeller = false;
    } else {
      await reply(number, 'È consigliato? Scegli nella lista, oppure scrivi *sì* o *no*.');
      return true;
    }
    draft.step = 'photo';
    session.polls = [];
    session.createdAt = Date.now();
    savePending(pending);
    await reply(
      number,
      `Consigliato: *${draft.bestSeller ? 'sì' : 'no'}*.\n\nOra invia una *foto del piatto*.\nSe non ce l’hai, scrivi *salta*.`
    );
    return true;
  }

  if (draft.step === 'photo') {
    if (!isSkip(lower)) {
      await reply(number, 'Invia la foto del piatto, oppure scrivi *salta*.');
      return true;
    }
    draft.step = 'confirm';
    session.createdAt = Date.now();
    savePending(pending);
    await reply(number, recap(draft));
    return true;
  }

  if (draft.step === 'confirm') {
    if (isNo(lower)) {
      delete pending[number];
      savePending(pending);
      await reply(number, 'Ok, non l’ho aggiunto. Scrivi *aggiungi* se vuoi riprovare.');
      return true;
    }
    if (!isYes(lower)) {
      await reply(number, 'Scrivi *sì* per salvarlo nel menu, o *no* per annullare.');
      return true;
    }
    const added = appendProducts([
      {
        name: draft.name || 'Piatto',
        category: draft.category || 'Altro',
        price: Number(draft.price) || 0,
        ingredients: draft.ingredients || draft.name || '',
        description: draft.ingredients || draft.name || '',
        imageUrl: draft.imageUrl || '',
        allergens: draft.allergens || [],
        bestSeller: Boolean(draft.bestSeller),
      },
    ]);
    pushUndo({ type: 'add', ids: added.map((p) => p.id), at: Date.now() });
    delete pending[number];
    savePending(pending);
    await reply(
      number,
      `Fatto! Ho aggiunto ${formatProduct(added[0])}. ${ON_MENU_ALREADY}\n\nPer aggiungerne un altro scrivi *aggiungi*.`,
      'aggiunto'
    );
    return true;
  }

  return true;
}

function dishSummary(p: {
  id: string;
  name: string;
  category: string;
  price: number;
  ingredients: string;
  allergens: string[];
  bestSeller: boolean;
  imageUrl: string;
}) {
  const allergens = p.allergens?.length ? p.allergens.join(', ') : 'nessuno';
  return (
    `• Nome: ${p.name}\n` +
    `• Categoria: ${p.category}\n` +
    `• Prezzo: €${Number(p.price).toFixed(2)}\n` +
    `• Ingredienti: ${p.ingredients || '—'}\n` +
    `• Allergeni: ${allergens}\n` +
    `• Consigliato: ${p.bestSeller ? 'sì' : 'no'}\n` +
    `• Foto: ${p.imageUrl ? 'sì' : 'no'}`
  );
}

function editDishFieldPrompt(name: string) {
  return (
    `Piatto *${name}*. Cosa vuoi cambiare?\n\n` +
    `1. Nome\n2. Categoria\n3. Prezzo\n4. Ingredienti\n5. Allergeni\n6. Consigliato\n7. Foto\n\n` +
    `Rispondi col numero, oppure *fine* / *annulla*.`
  );
}

function resolveEditDishField(answer: string): EditDraft['field'] | null {
  const lower = answer.toLowerCase().trim();
  if (['1', 'nome', 'name'].includes(lower)) return 'name';
  if (['2', 'categoria', 'category', 'sezione'].includes(lower)) return 'category';
  if (['3', 'prezzo', 'price', 'euro', 'costo'].includes(lower)) return 'price';
  if (['4', 'ingredienti', 'ingredients', 'descrizione'].includes(lower)) return 'ingredients';
  if (['5', 'allergeni', 'allergens', 'allergene'].includes(lower)) return 'allergens';
  if (['6', 'best seller', 'bestseller', 'best', 'consigliato'].includes(lower)) return 'bestSeller';
  if (['7', 'foto', 'immagine', 'photo', 'image'].includes(lower)) return 'photo';
  return null;
}

function saveEditSession(number: string, session: PendingSession) {
  const pending = loadPending();
  pending[number] = { ...session, number, createdAt: Date.now() };
  savePending(pending);
}

function clearEditSession(number: string) {
  const pending = loadPending();
  delete pending[number];
  savePending(pending);
}

async function openEditDish(number: string, product: { id: string; name: string }) {
  saveEditSession(number, {
    number,
    createdAt: Date.now(),
    kind: 'edit',
    edit: { step: 'edit-field', productId: product.id },
    selectedIds: [product.id],
    photoProductId: product.id,
  });
  const full = findProduct(product.id);
  await reply(
    number,
    `${full ? `Ecco *${full.name}*:\n${dishSummary(full)}\n\n` : ''}${editDishFieldPrompt(product.name)}`
  );
}

async function startEditDish(number: string, hint = '') {
  const products = loadProducts();
  if (!products.length) {
    await reply(number, 'Non ci sono piatti da modificare. Scrivi *aggiungi* per crearne uno.');
    return;
  }
  const q = hint.trim();
  if (q) {
    const product = findProduct(q);
    if (!product) {
      await reply(number, `${productNotFoundMessage(q)}\nScrivi *lista* oppure *modifica* senza nome.`);
      return;
    }
    await openEditDish(number, product);
    return;
  }
  if (products.length === 1) {
    await openEditDish(number, products[0]);
    return;
  }
  const polls = await sendProductPolls(number, products, 'Quale piatto vuoi modificare?', 'single');
  saveEditSession(number, {
    number,
    createdAt: Date.now(),
    kind: 'edit',
    edit: { step: 'pick' },
    polls,
    selectedIds: [],
    photoProductId: '',
  });
  await reply(number, 'Scegli il piatto nella lista.');
}

async function promptEditDishValue(number: string, session: PendingSession, field: NonNullable<EditDraft['field']>) {
  const draft = session.edit!;
  const product = findProduct(draft.productId || '');
  if (!product) {
    clearEditSession(number);
    await reply(number, 'Piatto non trovato. Scrivi di nuovo *modifica*.');
    return;
  }
  draft.field = field;
  if (field === 'allergens') {
    draft.step = 'allergens';
    session.selectedIds = [...(product.allergens || [])];
    session.polls = await sendAllergenPolls(number);
    saveEditSession(number, session);
    await reply(
      number,
      `Allergeni attuali:\n${allergenSummary(product.allergens || [])}\n\n` +
        `Seleziona nelle liste, poi *vai*. Oppure *nessuno* / *salta* per toglierli tutti.`
    );
    return;
  }
  if (field === 'bestSeller') {
    draft.step = 'bestSeller';
    session.polls = await sendBestSellerPoll(number);
    saveEditSession(number, session);
    await reply(
      number,
      `Consigliato ora: *${product.bestSeller ? 'sì' : 'no'}*.\nScegli nella lista, oppure scrivi *sì* o *no*.`
    );
    return;
  }
  if (field === 'photo') {
    draft.step = 'photo';
    session.photoProductId = product.id;
    session.polls = [];
    saveEditSession(number, session);
    await reply(
      number,
      `Invia la nuova foto per *${product.name}*.\nSe vuoi toglierla, scrivi *togli*. Per lasciare com’è: *salta*.`
    );
    return;
  }
  draft.step = 'edit-value';
  session.polls = [];
  saveEditSession(number, session);
  if (field === 'name') {
    await reply(number, `Nome attuale: *${product.name}*.\nScrivi il nuovo nome.`);
    return;
  }
  if (field === 'category') {
    await reply(number, `Categoria attuale: *${product.category}*.\n\n${categoryPrompt()}`);
    return;
  }
  if (field === 'price') {
    await reply(number, `Prezzo attuale: *€${Number(product.price).toFixed(2)}*.\nScrivi il nuovo prezzo, tipo 9.50`);
    return;
  }
  await reply(
    number,
    `Ingredienti attuali: *${product.ingredients || '—'}*.\nScrivi il nuovo testo, oppure *salta* per lasciare così.`
  );
}

async function afterDishFieldUpdated(
  number: string,
  session: PendingSession,
  product: { id: string; name: string },
  message: string,
  sticker: StickerId = 'modificato'
) {
  session.edit = { step: 'edit-field', productId: product.id };
  session.polls = [];
  session.selectedIds = [product.id];
  session.photoProductId = product.id;
  saveEditSession(number, session);
  await reply(number, `${message}\n\n${editDishFieldPrompt(product.name)}`, sticker);
}

async function continueEditDish(number: string, text: string, imageBase64?: string | null) {
  const pending = loadPending();
  const session = pending[number];
  if (!session?.edit || session.kind !== 'edit') return false;
  if (Date.now() - session.createdAt > SESSION_MS) {
    clearEditSession(number);
    await reply(number, SESSION_EXPIRED, 'scaduta');
    return true;
  }

  const draft = session.edit;
  const lower = text.toLowerCase().trim();

  if ((isCancel(lower) || ['fine', 'basta', 'esci'].includes(lower)) && !imageBase64) {
    clearEditSession(number);
    await reply(number, CANCEL_MSG);
    return true;
  }

  if (draft.step === 'pick') {
    await reply(number, 'Scegli il piatto nella lista, oppure scrivi *annulla*.');
    return true;
  }

  const product = findProduct(draft.productId || '');
  if (!product) {
    clearEditSession(number);
    await reply(number, 'Piatto non trovato. Scrivi di nuovo *modifica*.');
    return true;
  }

  if (imageBase64) {
    if (draft.step !== 'photo' && draft.field !== 'photo') {
      await reply(number, 'Adesso serve un testo. Per cambiare la foto scegli *7. Foto*.');
      return true;
    }
    try {
      const imageUrl = (await processDishImageFromBase64(imageBase64)).url;
      const updated = updateProduct(product.id, { imageUrl, mediaType: 'image' });
      await afterDishFieldUpdated(number, session, updated || product, `Foto aggiornata per *${product.name}*.`, 'foto');
    } catch {
      await reply(number, 'Non sono riuscito a salvare la foto. Inviarla di nuovo, oppure *salta*.');
    }
    return true;
  }

  if (draft.step === 'edit-field') {
    const field = resolveEditDishField(text);
    if (!field) {
      await reply(number, `Non ho capito, scegli un numero dalla lista:\n\n${editDishFieldPrompt(product.name)}`);
      return true;
    }
    await promptEditDishValue(number, session, field);
    return true;
  }

  if (draft.step === 'allergens') {
    if (['salta', 'skip', 'nessuno', 'niente', 'nessun allergene', '-'].includes(lower)) {
      const updated = updateProduct(product.id, { allergens: [] });
      await afterDishFieldUpdated(number, session, updated || product, `Allergeni tolti da *${product.name}*.`);
      return true;
    }
    if (lower !== 'vai' && lower !== 'avanti' && lower !== 'ok' && !isYes(lower)) {
      await reply(
        number,
        `Allergeni ora:\n${allergenSummary(session.selectedIds || product.allergens || [])}\n\nScegli nelle liste, poi *vai*. Oppure *nessuno*.`
      );
      return true;
    }
    const allergens = session.selectedIds || [];
    const updated = updateProduct(product.id, { allergens });
    await afterDishFieldUpdated(
      number,
      session,
      updated || product,
      `Allergeni aggiornati per *${product.name}*:\n${allergenSummary(allergens)}\n${ON_MENU_ALREADY}`
    );
    return true;
  }

  if (draft.step === 'bestSeller') {
    let value: boolean | null = null;
    if (isYes(lower) || lower === BEST_SELLER_YES.toLowerCase()) value = true;
    else if (isNo(lower) || lower === 'salta' || lower === BEST_SELLER_NO.toLowerCase()) value = false;
    if (value === null) {
      await reply(number, 'È consigliato? Scegli nella lista, oppure scrivi *sì* o *no*.');
      return true;
    }
    const updated = updateProduct(product.id, { bestSeller: value });
    await afterDishFieldUpdated(
      number,
      session,
      updated || product,
      `Consigliato di *${product.name}*: *${value ? 'sì' : 'no'}*. ${ON_MENU_ALREADY}`
    );
    return true;
  }

  if (draft.step === 'photo') {
    if (['togli', 'rimuovi', 'cancella foto', 'niente'].includes(lower)) {
      const updated = updateProduct(product.id, { imageUrl: '', mediaType: 'image' });
      await afterDishFieldUpdated(number, session, updated || product, `Foto tolta da *${product.name}*.`);
      return true;
    }
    if (isSkip(lower)) {
      await afterDishFieldUpdated(number, session, product, `Foto di *${product.name}* lasciata com’è.`);
      return true;
    }
    await reply(number, 'Invia la nuova foto, oppure *togli* / *salta*.');
    return true;
  }

  if (draft.step === 'edit-value') {
    if (draft.field === 'name') {
      if (text.length < 2) {
        await reply(number, 'Scrivi il nuovo nome del piatto.');
        return true;
      }
      const updated = updateProduct(product.id, { name: text });
      await afterDishFieldUpdated(number, session, updated || { ...product, name: text }, `Nome aggiornato: *${text}*.`);
      return true;
    }
    if (draft.field === 'category') {
      const category = resolveCategory(text);
      const updated = updateProduct(product.id, { category });
      await afterDishFieldUpdated(number, session, updated || product, `Categoria di *${product.name}*: *${category}*.`);
      return true;
    }
    if (draft.field === 'price') {
      const price = parsePrice(text);
      if (price === null) {
        await reply(number, 'Non ho capito il prezzo. Scrivimi solo il numero: *9,50*');
        return true;
      }
      pushUndo({
        type: 'price',
        id: product.id,
        previousPrice: Number(product.price) || 0,
        name: product.name,
        at: Date.now(),
      });
      const updated = updateProduct(product.id, { price });
      await afterDishFieldUpdated(
        number,
        session,
        updated || product,
        `Prezzo di *${product.name}*: *€${price.toFixed(2)}*. ${ON_MENU_ALREADY}`,
        'prezzo'
      );
      return true;
    }
    if (draft.field === 'ingredients') {
      if (isSkip(lower)) {
        await afterDishFieldUpdated(number, session, product, `Ingredienti di *${product.name}* lasciati com’è.`);
        return true;
      }
      const updated = updateProduct(product.id, { ingredients: text, description: text });
      await afterDishFieldUpdated(number, session, updated || product, `Ingredienti di *${product.name}* aggiornati.`);
      return true;
    }
  }

  await reply(number, editDishFieldPrompt(product.name));
  return true;
}

/** Icona come parola libera ("pizza"): resta per compatibilità con chi la scrive
 * a memoria senza guardare il collage. Il collage numerato (sendCategoryIconChoices)
 * è il percorso principale, perché prima il cliente doveva indovinare la parola
 * giusta senza vedere le icone. */
function resolveIcon(answer: string): string | null {
  return resolveCategoryIconId(answer);
}

function iconLabel(icon: string) {
  return categoryIconLabel(normalizeCategoryIconId(icon));
}

/** Risponde con il numero del collage ("3") oppure con la parola dell'icona. */
function resolveIconAnswer(answer: string): string | null {
  return categoryIconByIndex(answer) || resolveCategoryIconId(answer);
}

async function sendCategoryIconChoices(number: string) {
  try {
    const filePath = await generateCategoryIconsCollage();
    await sendWhatsAppImage({
      number,
      filePath,
      caption: 'Rispondi con il numero dell’icona che preferisci.',
    });
  } catch (error) {
    console.error('Invio collage icone categoria fallito', error);
  }
}

function formatCategoryLine(c: { name: string; description: string; order: number; icon: string }) {
  const count = countProductsInCategory(c.name);
  return `${c.order}. *${c.name}* — ${count} piatti — ${iconLabel(c.icon)}\n   ${c.description || '—'}`;
}

function listCategoriesText() {
  const categories = [...loadCategories()].sort((a, b) => a.order - b.order);
  if (!categories.length) {
    return 'Non ci sono categorie. Scrivi *aggiungi categoria* per crearne una.';
  }
  return (
    `Categorie del menu:\n\n${categories.map(formatCategoryLine).join('\n')}\n\n` +
    `• *aggiungi categoria*\n• *modifica categoria*\n• *elimina categoria*`
  );
}

function categoryRecap(draft: CategoryDraft) {
  return (
    `Controlla:\n\n• Nome: ${draft.name}\n• Descrizione: ${draft.description || '—'}\n• Icona: ${iconLabel(draft.icon || DEFAULT_CATEGORY_ICON)}\n\n` +
    `La salvo? Scrivi *sì* o *no*.`
  );
}

function editFieldPrompt(name: string) {
  return (
    `Categoria *${name}*. Cosa vuoi cambiare?\n\n` +
    `1. Nome\n2. Descrizione\n3. Icona\n4. Ordine\n\nRispondi col numero, oppure *annulla*.`
  );
}

function saveCategorySession(number: string, session: PendingSession) {
  const pending = loadPending();
  pending[number] = { ...session, number, createdAt: Date.now() };
  savePending(pending);
}

function clearCategorySession(number: string) {
  const pending = loadPending();
  delete pending[number];
  savePending(pending);
}

async function sendCategoryChoicePolls(
  number: string,
  title: string,
  mode: 'multi' | 'single'
): Promise<PollPage[]> {
  const categories = [...loadCategories()].sort((a, b) => a.order - b.order);
  const pages: PollPage[] = [];
  const groups = chunkItems(categories, 10);
  for (let i = 0; i < groups.length; i += 1) {
    const options: PollOption[] = groups[i].map((c) => ({
      label: `${c.order}. ${c.name}`.slice(0, 80),
      productId: c.name,
    }));
    if (options.length === 1) {
      options.push({ label: SKIP_POLL_LABEL, productId: '' });
    }
    const values = options.map((o) => o.label);
    const { msgId } = await sendWhatsAppPoll({
      number,
      name: groups.length > 1 ? `${title} (${i + 1}/${groups.length})` : title,
      values,
      selectableCount: mode === 'multi' ? values.length : 1,
    });
    pages.push({ msgId, options });
    if (i < groups.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 700));
    }
  }
  return pages;
}

function parseCategoryPipe(rest: string) {
  const parts = rest.split('|').map((p) => p.trim()).filter(Boolean);
  return {
    name: parts[0] || '',
    description: parts[1] || '',
    icon: parts[2] ? resolveIcon(parts[2]) || '' : '',
  };
}

function selectedCategoriesSummary(names: string[]) {
  const selected = names.map((name) => findCategory(name)).filter(Boolean) as {
    name: string;
    description: string;
    order: number;
    icon: string;
  }[];
  if (!selected.length) return 'Nessuna categoria selezionata.';
  return selected.map((c) => `• ${c.order}. ${c.name}`).join('\n');
}

async function startAddCategory(number: string, rest = '') {
  const parsed = rest.includes('|') ? parseCategoryPipe(rest) : { name: rest.trim(), description: '', icon: '' };
  if (parsed.name && parsed.description) {
    try {
      const created = addCategory({
        name: parsed.name,
        description: parsed.description,
        icon: parsed.icon || DEFAULT_CATEGORY_ICON,
      });
      await reply(number, `Aggiunta *${created.name}*.\n\n${listCategoriesText()}`);
    } catch (error) {
      await reply(number, error instanceof Error ? error.message : 'Non sono riuscito ad aggiungere la categoria.');
    }
    return;
  }
  saveCategorySession(number, {
    number,
    createdAt: Date.now(),
    kind: 'category',
    category: parsed.name
      ? { step: 'description', action: 'add', name: parsed.name }
      : { step: 'name', action: 'add' },
  });
  await reply(
    number,
    parsed.name
      ? `Ok, categoria *${parsed.name}*.\n\nScrivi una breve descrizione, oppure *salta*.`
      : 'Ok, nuova categoria.\n\nCome si chiama?'
  );
}

async function startEditCategory(number: string, rest = '') {
  const hint = rest.trim();
  if (hint) {
    const category = findCategory(hint);
    if (!category) {
      await reply(number, `Categoria non trovata: ${hint}\n\n${listCategoriesText()}`);
      return;
    }
    saveCategorySession(number, {
      number,
      createdAt: Date.now(),
      kind: 'category',
      category: { step: 'edit-field', action: 'edit', target: category.name },
    });
    await reply(number, editFieldPrompt(category.name));
    return;
  }
  const categories = loadCategories();
  if (!categories.length) {
    await reply(number, 'Non ci sono categorie da modificare. Scrivi *aggiungi categoria*.');
    return;
  }
  const polls = await sendCategoryChoicePolls(number, 'Quale categoria vuoi modificare?', 'single');
  saveCategorySession(number, {
    number,
    createdAt: Date.now(),
    kind: 'category',
    category: { step: 'pick', action: 'edit' },
    polls,
    selectedIds: [],
  });
  await reply(number, 'Scegli la categoria nella lista, oppure scrivi il nome.');
}

async function startDeleteCategory(number: string, rest = '') {
  const hint = rest.trim();
  if (hint) {
    try {
      const removed = deleteCategory(hint);
      await reply(number, `Eliminata *${removed.name}*.\n\n${listCategoriesText()}`);
    } catch (error) {
      await reply(number, error instanceof Error ? error.message : 'Non sono riuscito a eliminare la categoria.');
    }
    return;
  }
  const categories = loadCategories();
  if (!categories.length) {
    await reply(number, 'Non ci sono categorie da eliminare.');
    return;
  }
  const polls = await sendCategoryChoicePolls(number, 'Quali categorie vuoi eliminare?', 'multi');
  saveCategorySession(number, {
    number,
    createdAt: Date.now(),
    kind: 'category',
    category: { step: 'delete-confirm', action: 'delete' },
    polls,
    selectedIds: [],
  });
  await reply(
    number,
    'Seleziona le categorie nella lista. Poi scrivi *cancella* per toglierle, o *annulla*.\nSe una categoria ha ancora piatti, non la tolgo.'
  );
}

async function continueCategory(number: string, text: string) {
  const pending = loadPending();
  const session = pending[number];
  if (!session?.category) return false;
  if (Date.now() - session.createdAt > SESSION_MS) {
    delete pending[number];
    savePending(pending);
    await reply(number, SESSION_EXPIRED, 'scaduta');
    return true;
  }

  const draft = session.category;
  const lower = text.toLowerCase().trim();

  if (isCancel(lower)) {
    delete pending[number];
    savePending(pending);
    await reply(number, CANCEL_MSG);
    return true;
  }

  if (draft.action === 'delete' && draft.step === 'delete-confirm') {
    // "vai" non basta per una cancellazione: solo "cancella"/"conferma"/sì.
    if (lower !== 'cancella' && lower !== 'conferma' && !isYes(lower)) {
      await reply(
        number,
        `${selectedCategoriesSummary(session.selectedIds || [])}\n\nScrivi *cancella* per toglierle, o *annulla*.`
      );
      return true;
    }
    const names = session.selectedIds || [];
    if (!names.length) {
      await reply(number, 'Non hai selezionato nessuna categoria. Scegli nella lista, poi *cancella*.');
      return true;
    }
    const ok: string[] = [];
    const failed: string[] = [];
    for (const name of names) {
      try {
        const removed = deleteCategory(name);
        ok.push(removed.name);
      } catch (error) {
        failed.push(error instanceof Error ? error.message : String(name));
      }
    }
    delete pending[number];
    savePending(pending);
    const parts = [
      ok.length ? `Eliminate: ${ok.map((name) => `*${name}*`).join(', ')}.` : '',
      failed.length ? failed.join('\n') : '',
    ].filter(Boolean);
    await reply(number, `${parts.join('\n')}\n\n${listCategoriesText()}`);
    return true;
  }

  if (draft.action === 'edit' && draft.step === 'pick') {
    const category = findCategory(text);
    if (!category) {
      await reply(number, `Non ho trovato *${text}*. Scegli nella lista o scrivi il nome.`);
      return true;
    }
    draft.target = category.name;
    draft.step = 'edit-field';
    session.createdAt = Date.now();
    savePending(pending);
    await reply(number, editFieldPrompt(category.name));
    return true;
  }

  if (draft.action === 'edit' && draft.step === 'edit-field') {
    const map: Record<string, CategoryDraft['field']> = {
      '1': 'name',
      nome: 'name',
      '2': 'description',
      descrizione: 'description',
      '3': 'icon',
      icona: 'icon',
      '4': 'order',
      ordine: 'order',
    };
    const field = map[lower];
    if (!field) {
      await reply(number, `Non ho capito, scegli un numero dalla lista:\n\n${editFieldPrompt(draft.target || '')}`);
      return true;
    }
    draft.field = field;
    draft.step = 'edit-value';
    session.createdAt = Date.now();
    if (field === 'icon') {
      savePending(pending);
      await sendCategoryIconChoices(number);
      await reply(number, 'Rispondi con il numero, oppure scrivi il nome (pizza, pesce, torta…). *salta* lascia quella attuale.');
      return true;
    }
    savePending(pending);
    if (field === 'name') await reply(number, `Nuovo nome per *${draft.target}*?`);
    else if (field === 'description') await reply(number, `Nuova descrizione per *${draft.target}*? Oppure *salta*.`);
    else await reply(number, `In che posizione la metto? Scrivi un numero, 1 è la prima.`);
    return true;
  }

  if (draft.action === 'edit' && draft.step === 'edit-value') {
    try {
      if (draft.field === 'name') {
        if (text.trim().length < 2) {
          await reply(number, 'Il nome è troppo corto. Scrivilo di nuovo.');
          return true;
        }
        const updated = updateCategory(draft.target || '', { name: text.trim() });
        clearCategorySession(number);
        await reply(number, `Aggiornata: *${updated.name}*.\n\n${listCategoriesText()}`);
        return true;
      }
      if (draft.field === 'description') {
        const updated = updateCategory(draft.target || '', {
          description: isSkip(lower) ? draft.target || '' : text.trim(),
        });
        clearCategorySession(number);
        await reply(number, `Descrizione aggiornata per *${updated.name}*.`);
        return true;
      }
      if (draft.field === 'icon') {
        if (isSkip(lower)) {
          clearCategorySession(number);
          await reply(number, 'Ok, icona invariata.');
          return true;
        }
        const icon = resolveIconAnswer(text);
        if (!icon) {
          await reply(number, 'Non ho capito l’icona. Rispondi con il numero del collage, oppure scrivi pizza, pesce, torta, bevande…');
          return true;
        }
        const updated = updateCategory(draft.target || '', { icon });
        clearCategorySession(number);
        await reply(number, `Icona *${iconLabel(updated.icon)}* per *${updated.name}*.`);
        return true;
      }
      const order = Number(text.replace(/[^\d]/g, ''));
      if (!Number.isInteger(order) || order < 1) {
        await reply(number, 'Scrivi un numero, ad esempio 1.');
        return true;
      }
      const updated = updateCategory(draft.target || '', { order });
      clearCategorySession(number);
      await reply(number, `*${updated.name}* ora è in posizione ${updated.order}.\n\n${listCategoriesText()}`);
      return true;
    } catch (error) {
      await reply(number, error instanceof Error ? error.message : 'Non sono riuscito a modificare la categoria.');
      return true;
    }
  }

  if (draft.action === 'add' && draft.step === 'name') {
    if (draft.pendingLiteralName) {
      const candidate = draft.pendingLiteralName;
      delete draft.pendingLiteralName;
      if (isYes(lower)) {
        draft.name = candidate;
        draft.step = 'description';
        session.createdAt = Date.now();
        savePending(pending);
        await reply(number, `Nome: *${draft.name}*.\n\nScrivi una breve descrizione, oppure *salta*.`);
        return true;
      }
      await reply(number, 'Ok, non l’ho salvato. Dimmi il nome della categoria.');
      savePending(pending);
      return true;
    }
    if (text.trim().length < 2) {
      await reply(number, 'Dimmi il nome della categoria, ad esempio: Antipasti');
      return true;
    }
    if (looksLikeStrayCommand(text)) {
      draft.pendingLiteralName = text.trim();
      savePending(pending);
      await reply(
        number,
        `"${text.trim()}" sembra un comando, non il nome della categoria. È davvero il nome? Rispondi *sì* per salvarlo così, oppure scrivi il nome giusto.`
      );
      return true;
    }
    draft.name = text.trim();
    draft.step = 'description';
    session.createdAt = Date.now();
    savePending(pending);
    await reply(number, `Nome: *${draft.name}*.\n\nScrivi una breve descrizione, oppure *salta*.`);
    return true;
  }

  if (draft.action === 'add' && draft.step === 'description') {
    draft.description = isSkip(lower) ? draft.name || '' : text.trim();
    draft.step = 'icon';
    session.createdAt = Date.now();
    savePending(pending);
    await sendCategoryIconChoices(number);
    await reply(
      number,
      `Descrizione: *${draft.description || '—'}*.\n\nRispondi con il numero dell’icona, oppure scrivi *salta* per l’icona generica.`
    );
    return true;
  }

  if (draft.action === 'add' && draft.step === 'icon') {
    if (isSkip(lower)) {
      draft.icon = DEFAULT_CATEGORY_ICON;
    } else {
      const icon = resolveIconAnswer(text);
      if (!icon) {
        await reply(number, 'Rispondi con il numero del collage, oppure scrivi pizza, pesce, torta… Altrimenti *salta*.');
        return true;
      }
      draft.icon = icon;
    }
    draft.step = 'confirm';
    session.createdAt = Date.now();
    savePending(pending);
    await reply(number, categoryRecap(draft));
    return true;
  }

  if (draft.action === 'add' && draft.step === 'confirm') {
    if (isNo(lower)) {
      delete pending[number];
      savePending(pending);
      await reply(number, 'Ok, non l’ho aggiunta. Scrivi *aggiungi categoria* se vuoi riprovare.');
      return true;
    }
    if (!isYes(lower)) {
      await reply(number, 'Scrivi *sì* per salvarla, o *no* per annullare.');
      return true;
    }
    try {
      const created = addCategory({
        name: draft.name || 'Categoria',
        description: draft.description,
        icon: draft.icon,
      });
      delete pending[number];
      savePending(pending);
      await reply(number, `Fatto! Ho aggiunto *${created.name}*.\n\nPer aggiungerne un’altra scrivi *aggiungi categoria*.`);
    } catch (error) {
      await reply(number, error instanceof Error ? error.message : 'Non sono riuscito a salvare la categoria.');
    }
    return true;
  }

  return true;
}

/** Gestisce esattamente un comando/turno di conversazione. Non tenta lo split
 * multi-comando: usata sia come motore da handleWhatsAppCommand (il wrapper
 * pubblico sotto) sia dalle chiamate ricorsive interne (conferma vocale, ecc.)
 * dove il testo è già un singolo comando pulito. */
async function handleSingleWhatsAppCommand(opts: {
  number: string;
  text: string;
  imageBase64?: string | null;
  pollOptions?: string[];
  pollMessageId?: string;
}) {
  try {
    assertWhatsAppAllowed();
  } catch (error) {
    const message = error instanceof PlanLimitError ? error.message : 'WhatsApp non disponibile su questo piano.';
    await sendWhatsAppText(opts.number, message);
    return;
  }
  const text = (opts.text || '').trim();
  const lower = text.toLowerCase();
  /** "nuovo codice d'accesso" / "nuovo codice di accesso" -> "nuovo codice accesso":
   * i comandi codice-accesso sono confrontati per uguaglianza esatta, ma nel parlato
   * naturale ci si infila spesso un connettivo tra "codice" e "accesso". */
  const lowerNoConnectors = lower.replace(/\bd['’]|\bdi\b/g, '').replace(/\s+/g, ' ').trim();
  const pending = loadPending();
  const session = pending[opts.number];
  const pollOptions = opts.pollOptions || [];
  const pollMessageId = opts.pollMessageId || '';

  if (session?.kind === 'voice-confirm' && Date.now() - session.createdAt <= SESSION_MS) {
    if (isCancel(lower) || isNo(lower)) {
      delete pending[opts.number];
      savePending(pending);
      await reply(opts.number, CANCEL_MSG);
      return;
    }
    if (isYes(lower) || lower === 'conferma' || lower === 'vai' || lower === 'ok') {
      const cmd = String(session.voiceText || '').trim();
      delete pending[opts.number];
      savePending(pending);
      if (!cmd) {
        await reply(opts.number, 'Non ho più il comando del vocale. Mandalo di nuovo.');
        return;
      }
      await handleSingleWhatsAppCommand({ number: opts.number, text: cmd });
      return;
    }
    // Nuovo comando scritto/vocale al posto di sì/no: esegui quello
    if (text.length >= 2) {
      delete pending[opts.number];
      savePending(pending);
      await handleSingleWhatsAppCommand({ number: opts.number, text });
      return;
    }
    await reply(
      opts.number,
      `Ho capito: *${session.voiceText || '…'}*.\n\nScrivi *sì* per procedere, *no* per annullare, oppure un comando nuovo.`
    );
    return;
  }

  if (session?.kind === 'category-icon-pick' && Date.now() - session.createdAt <= SESSION_MS) {
    if (isCancel(lower)) {
      delete pending[opts.number];
      savePending(pending);
      await reply(opts.number, CANCEL_MSG);
      return;
    }
    const target = session.iconPickTarget || '';
    const icon = resolveIconAnswer(text);
    if (!icon) {
      await reply(opts.number, `Non ho capito. Rispondi con il numero dell’icona per *${target}*, oppure *annulla*.`);
      return;
    }
    delete pending[opts.number];
    savePending(pending);
    try {
      const updated = updateCategory(target, { icon });
      await reply(opts.number, `Icona *${iconLabel(updated.icon)}* per *${updated.name}*.`);
    } catch (error) {
      await reply(opts.number, error instanceof Error ? error.message : 'Non sono riuscito a cambiare l’icona.');
    }
    return;
  }

  if (session?.kind === 'regen-code-confirm' && Date.now() - session.createdAt <= SESSION_MS) {
    delete pending[opts.number];
    savePending(pending);
    if (isCancel(lower) || isNo(lower)) {
      await reply(opts.number, CANCEL_MSG);
      return;
    }
    if (isYes(lower) || lower === 'conferma' || lower === 'vai' || lower === 'ok') {
      const newCode = regenerateTenantAccessCode();
      await reply(
        opts.number,
        `Fatto. Nuovo codice di accesso al pannello: *${newCode}*.\n\nIl vecchio non funziona più, e chi era già collegato dovrà rientrare con questo nuovo codice.`
      );
      return;
    }
    await reply(opts.number, 'Non ho capito. Scrivi *sì* per rigenerare il codice di accesso, o *no* per annullare.');
    return;
  }

  if (pollOptions.length > 0 || (pollMessageId && session && (session.kind === 'delete' || session.kind === 'photo' || session.kind === 'add' || session.kind === 'category' || session.kind === 'edit'))) {
    if (session?.kind === 'delete') {
      applyPollSelection(session, pollOptions, pollMessageId, 'multi');
      session.createdAt = Date.now();
      pending[opts.number] = session;
      savePending(pending);
      const ids = session.selectedIds || [];
      await reply(
        opts.number,
        ids.length
          ? `Selezionati:\n${selectedSummary(ids)}\n\nScrivi *cancella* per toglierli, o *annulla*.`
          : 'Nessun piatto selezionato. Scegli nella lista, poi *cancella*.'
      );
      return;
    }
    if (session?.kind === 'photo') {
      applyPollSelection(session, pollOptions, pollMessageId, 'single');
      session.createdAt = Date.now();
      pending[opts.number] = session;
      savePending(pending);
      const product = session.photoProductId ? findProduct(session.photoProductId) : undefined;
      await reply(
        opts.number,
        product
          ? `Ok, *${product.name}*. Invia ora la nuova foto.`
          : 'Scegli un piatto nella lista, poi invia la foto.'
      );
      return;
    }
    if (session?.kind === 'edit' && session.edit) {
      const draft = session.edit;
      if (draft.step === 'pick') {
        applyPollSelection(session, pollOptions, pollMessageId, 'single');
        const productId = session.photoProductId || session.selectedIds?.[0] || '';
        const product = productId ? findProduct(productId) : undefined;
        if (!product) {
          session.createdAt = Date.now();
          pending[opts.number] = session;
          savePending(pending);
          await reply(opts.number, 'Scegli un piatto nella lista.');
          return;
        }
        draft.step = 'edit-field';
        draft.productId = product.id;
        session.selectedIds = [product.id];
        session.photoProductId = product.id;
        session.polls = [];
        session.createdAt = Date.now();
        pending[opts.number] = session;
        savePending(pending);
        await reply(
          opts.number,
          `Ecco *${product.name}*:\n${dishSummary(product)}\n\n${editDishFieldPrompt(product.name)}`
        );
        return;
      }
      if (draft.step === 'allergens') {
        applyPollSelection(session, pollOptions, pollMessageId, 'multi');
        const fromLabels = pollOptions
          .map((label) => ALLERGENS.find((item) => item.short === label || item.full === label)?.full || '')
          .filter(Boolean);
        session.selectedIds = Array.from(new Set([...(session.selectedIds || []), ...fromLabels]));
        session.createdAt = Date.now();
        pending[opts.number] = session;
        savePending(pending);
        await reply(
          opts.number,
          `Allergeni selezionati:\n${allergenSummary(session.selectedIds)}\n\nPuoi segnarne altri. Poi scrivi *vai*, o *nessuno*.`
        );
        return;
      }
      if (draft.step === 'bestSeller') {
        applyPollSelection(session, pollOptions, pollMessageId, 'single');
        const vote = (session.selectedIds || [])[0] || pollOptions[0] || '';
        const value = vote === 'yes' || vote === BEST_SELLER_YES || /^s[iì]/i.test(vote);
        const product = findProduct(draft.productId || '');
        if (!product) {
          clearEditSession(opts.number);
          await reply(opts.number, 'Piatto non trovato. Scrivi di nuovo *modifica*.');
          return;
        }
        const updated = updateProduct(product.id, { bestSeller: value });
        await afterDishFieldUpdated(
          opts.number,
          session,
          updated || product,
          `Consigliato di *${product.name}*: *${value ? 'sì' : 'no'}*.`
        );
        return;
      }
    }
    if (session?.kind === 'add' && session.add?.step === 'allergens') {
      applyPollSelection(session, pollOptions, pollMessageId, 'multi');
      const fromLabels = pollOptions
        .map((label) => ALLERGENS.find((item) => item.short === label || item.full === label)?.full || '')
        .filter(Boolean);
      session.add.allergens = Array.from(new Set([...(session.selectedIds || []), ...fromLabels]));
      session.selectedIds = session.add.allergens;
      session.createdAt = Date.now();
      pending[opts.number] = session;
      savePending(pending);
      await reply(
        opts.number,
        `Allergeni selezionati:\n${allergenSummary(session.add.allergens)}\n\nPuoi segnarne altri nella seconda lista. Poi scrivi *vai*, o *salta* se non ce ne sono.`
      );
      return;
    }
    if (session?.kind === 'add' && session.add?.step === 'bestSeller') {
      applyPollSelection(session, pollOptions, pollMessageId, 'single');
      const vote = (session.selectedIds || [])[0] || pollOptions[0] || '';
      session.add.bestSeller = vote === 'yes' || vote === BEST_SELLER_YES || /^s[iì]/i.test(vote);
      session.add.step = 'photo';
      session.polls = [];
      session.createdAt = Date.now();
      pending[opts.number] = session;
      savePending(pending);
      await reply(
        opts.number,
        `Consigliato: *${session.add.bestSeller ? 'sì' : 'no'}*.\n\nOra invia una *foto del piatto*.\nSe non ce l’hai, scrivi *salta*.`
      );
      return;
    }
    if (session?.kind === 'category' && session.category) {
      const draft = session.category;
      if (draft.action === 'delete') {
        applyPollSelection(session, pollOptions, pollMessageId, 'multi');
        session.createdAt = Date.now();
        pending[opts.number] = session;
        savePending(pending);
        const names = session.selectedIds || [];
        await reply(
          opts.number,
          names.length
            ? `Selezionate:\n${selectedCategoriesSummary(names)}\n\nScrivi *cancella* per toglierle, o *annulla*.`
            : 'Nessuna categoria selezionata. Scegli nella lista, poi *cancella*.'
        );
        return;
      }
      if (draft.step === 'pick') {
        applyPollSelection(session, pollOptions, pollMessageId, 'single');
        const name = session.selectedIds?.[0] || '';
        const category = name ? findCategory(name) : undefined;
        if (!category) {
          await reply(opts.number, 'Scegli una categoria nella lista.');
          return;
        }
        draft.target = category.name;
        draft.step = 'edit-field';
        session.createdAt = Date.now();
        pending[opts.number] = session;
        savePending(pending);
        await reply(opts.number, editFieldPrompt(category.name));
        return;
      }
    }
  }

  if (opts.imageBase64 && session?.kind === 'edit') {
    await continueEditDish(opts.number, text, opts.imageBase64);
    return;
  }

  if (opts.imageBase64 && session?.kind === 'photo') {
    const productId = session.photoProductId || session.selectedIds?.[0];
    if (!productId) {
      await reply(opts.number, 'Prima scegli il piatto nella lista, poi invia la foto.');
      return;
    }
    const product = findProduct(productId);
    if (!product) {
      delete pending[opts.number];
      savePending(pending);
      await reply(opts.number, 'Piatto non trovato. Scrivi di nuovo *foto*.');
      return;
    }
    try {
      const imageUrl = (await processDishImageFromBase64(opts.imageBase64)).url;
      updateProduct(product.id, { imageUrl, mediaType: 'image' });
      delete pending[opts.number];
      savePending(pending);
      await reply(opts.number, `Foto aggiornata per *${product.name}*.`, 'foto');
    } catch {
      await reply(opts.number, 'Non sono riuscito a salvare la foto. Inviarla di nuovo.');
    }
    return;
  }

  if (opts.imageBase64 && session?.kind === 'model3d-photos') {
    const photos = session.model3dPhotos || [];
    if (photos.length >= 4) {
      await reply(opts.number, 'Ho già 4 foto, il massimo. Scrivi *fatto* per generare il modello, o *annulla*.');
      return;
    }
    try {
      const { filename } = await processDishImageFromBase64(opts.imageBase64);
      photos.push(filename);
      session.model3dPhotos = photos;
      pending[opts.number] = session;
      savePending(pending);
      await reply(
        opts.number,
        photos.length < 2
          ? `Foto ${photos.length}/4 ricevuta. Mandane almeno un'altra da un'angolazione diversa.`
          : `Foto ${photos.length}/4 ricevuta. Mandane altre (fino a 4) o scrivi *fatto* per generare il modello.`
      );
    } catch {
      await reply(opts.number, 'Non sono riuscito a salvare questa foto. Rimandala.');
    }
    return;
  }

  if (opts.imageBase64 && session?.kind === 'setup' && session.setup) {
    await runSetup(opts.number, session as SetupSession, text, opts.imageBase64);
    return;
  }

  if (opts.imageBase64 && session?.kind === 'delete') {
    await reply(opts.number, 'Stai eliminando dei piatti. Scrivi *cancella* per confermare, o *annulla*. Per una foto usa *foto*.');
    return;
  }

  if (opts.imageBase64 && session?.kind === 'category') {
    await reply(opts.number, 'Stai gestendo le categorie. Continua con il testo, oppure scrivi *annulla*.');
    return;
  }

  if (opts.imageBase64) {
    if (session?.kind === 'add') {
      await continueAdd(opts.number, text, opts.imageBase64);
      return;
    }
    await enqueueMenuPhoto(opts.number, opts.imageBase64);
    return;
  }

  const helpOrEscape = [
    'aiuto',
    'help',
    'comandi',
    'ciao',
    'buongiorno',
    'salve',
    'tutto',
    'comandi piatti',
    'comandi categorie',
    'comandi grafica',
    'comandi sicurezza',
    'comandi statistiche',
    'comandi altro',
    'annulla ultima',
    'annulla ultimo',
    'messaggio fisso',
    'fissa messaggio',
    'pin',
    'messaggio pin',
    'nuovo codice accesso',
    'rigenera codice',
    'nuovo codice',
    'cambia codice accesso',
  ].includes(lower) || ['nuovo codice accesso', 'cambia codice accesso'].includes(lowerNoConnectors);

  if (session?.kind === 'setup' && session.setup && (text || opts.imageBase64) && !helpOrEscape) {
    await runSetup(opts.number, session as SetupSession, text, opts.imageBase64);
    return;
  }

  if (session?.kind === 'add' && (text || opts.imageBase64) && !helpOrEscape) {
    await continueAdd(opts.number, text, opts.imageBase64);
    return;
  }

  if (session?.kind === 'edit' && (text || opts.imageBase64) && !helpOrEscape) {
    await continueEditDish(opts.number, text, opts.imageBase64);
    return;
  }

  if (session?.kind === 'category' && text && !helpOrEscape) {
    await continueCategory(opts.number, text);
    return;
  }

  if (!text && pollOptions.length === 0) {
    return;
  }

  if (['ciao', 'buongiorno', 'salve'].includes(lower)) {
    await reply(opts.number, welcomeText());
    return;
  }

  if (['aiuto', 'help', 'comandi'].includes(lower)) {
    await reply(opts.number, shortHelpText());
    return;
  }

  if (['messaggio fisso', 'fissa messaggio', 'pin', 'messaggio pin'].includes(lower)) {
    await sendWhatsAppText(
      opts.number,
      `Ecco il messaggio pronto — tienilo premuto qui sotto e scegli *Fissa* per tenerlo sempre in cima alla chat (WhatsApp non permette di fissarlo automaticamente, va fatto a mano una volta sola):`
    );
    await reply(opts.number, pinnedMessageText());
    return;
  }

  if (lower === 'tutto') {
    await reply(opts.number, everythingMenuText());
    return;
  }

  if (lower === 'comandi piatti') {
    await reply(opts.number, dishesHelpText());
    await reply(opts.number, dishesHelpTextAdvanced());
    return;
  }

  if (lower === 'comandi categorie') {
    await reply(opts.number, categoriesHelpText());
    return;
  }

  if (lower === 'comandi grafica') {
    await reply(opts.number, graphicsHelpText());
    await reply(opts.number, graphicsHelpTextAdvanced());
    return;
  }

  if (lower === 'comandi sicurezza') {
    await reply(opts.number, securityHelpText());
    return;
  }

  if (lower === 'comandi statistiche' || lower === 'comandi altro') {
    await reply(opts.number, statsAndOtherHelpText());
    return;
  }

  if (lower === 'annulla ultima' || lower === 'annulla ultimo') {
    const result = applyUndo();
    await reply(opts.number, result.message);
    return;
  }

  if (isCancel(lower)) {
    const t = ocrTimers.get(opts.number);
    if (t) clearTimeout(t);
    ocrTimers.delete(opts.number);
    cleanupOcrFiles(session?.ocrFiles);
    delete pending[opts.number];
    savePending(pending);
    await reply(opts.number, CANCEL_MSG);
    return;
  }

  if (session?.kind === 'ocr') {
    if (['vai', 'ok', 'elabora', 'leggi'].includes(lower)) {
      const t = ocrTimers.get(opts.number);
      if (t) clearTimeout(t);
      ocrTimers.delete(opts.number);
      await finishMenuOcr(opts.number);
      return;
    }
    await reply(
      opts.number,
      'Sto ancora elaborando il menu cartaceo. Invia altre pagine se ce ne sono, oppure scrivi *vai*. Per fermarti: *annulla*.'
    );
    return;
  }

  if (session?.kind === 'delete-confirm') {
    if (isNo(lower) || isCancel(lower)) {
      delete pending[opts.number];
      savePending(pending);
      await reply(opts.number, CANCEL_MSG);
      return;
    }
    if (isYes(lower) || lower === 'cancella' || lower === 'conferma') {
      const ids = session.selectedIds || [];
      const snapshots = ids.map((id) => findProduct(id)).filter(Boolean) as MenuProduct[];
      if (!snapshots.length) {
        delete pending[opts.number];
        savePending(pending);
        await reply(opts.number, 'Non trovo più quel piatto.');
        return;
      }
      pushUndo({ type: 'delete', products: snapshots, at: Date.now() });
      deleteProducts(ids);
      delete pending[opts.number];
      savePending(pending);
      await reply(
        opts.number,
        `Eliminato ${snapshots.map((p) => `*${p.name}*`).join(', ')}. ${ON_MENU_ALREADY}\nScrivi *annulla ultima* se ti sei pentito.`,
        'eliminato'
      );
      return;
    }
    await reply(opts.number, 'Scrivi *sì* per cancellarlo, o *annulla*.');
    return;
  }

  if (session?.kind === 'bulk-price') {
    if (isNo(lower) || isCancel(lower)) {
      delete pending[opts.number];
      savePending(pending);
      await reply(opts.number, CANCEL_MSG);
      return;
    }
    // "vai" non basta per applicare un cambio prezzi in blocco: solo "conferma"/sì.
    if (isYes(lower) || lower === 'conferma') {
      const changes = session.bulkPrice || [];
      if (!changes.length) {
        delete pending[opts.number];
        savePending(pending);
        await reply(opts.number, 'Non c’è nessun aggiornamento prezzi in attesa.');
        return;
      }
      pushUndo({
        type: 'bulkPrice',
        previous: changes.map((c) => ({ id: c.id, price: c.from })),
        at: Date.now(),
      });
      for (const c of changes) updateProduct(c.id, { price: c.to });
      delete pending[opts.number];
      savePending(pending);
      await reply(
        opts.number,
        `Fatto: aggiornati ${changes.length} prezzi. ${ON_MENU_ALREADY}\nScrivi *annulla ultima* per tornare indietro.`,
        'prezzo'
      );
      return;
    }
    await reply(opts.number, 'Scrivi *sì* per applicare i nuovi prezzi, o *annulla*.');
    return;
  }

  if (session?.kind === 'import' && (isNo(lower) || isCancel(lower))) {
    delete pending[opts.number];
    savePending(pending);
    await reply(opts.number, CANCEL_MSG);
    return;
  }

  if (isYes(lower) || lower === 'ok importa' || (lower === 'importa' && !hasImportableUrls(text))) {
    if (!session || session.kind !== 'import' || Date.now() - session.createdAt > SESSION_MS) {
      if (lower === 'importa' || lower.startsWith('importa ')) {
        const started = await handleSetupShortcut(opts.number, text);
        if (!started) return;
        pending[opts.number] = started.session;
        savePending(pending);
        await reply(opts.number, started.message);
        if (started.sendCovers) await sendCoverChoices(opts.number, started.session.setup);
        return;
      }
      await reply(opts.number, 'Non c’è un import in attesa. Invia prima la foto del menu, oppure scrivi *aggiungi*.');
      return;
    }
    const added = appendProducts(session.products || []);
    if (added.length) pushUndo({ type: 'add', ids: added.map((p) => p.id), at: Date.now() });
    delete pending[opts.number];
    savePending(pending);
    await reply(opts.number, `Importati ${added.length} piatti nel menu. ${ON_MENU_ALREADY}`, 'importato');
    return;
  }

  if (['categorie', 'lista categorie', 'lista categoria', 'categoria'].includes(lower)) {
    await reply(opts.number, listCategoriesText());
    return;
  }

  if (/^(aggiungi|nuova)\s+categor(?:ia|ie)\b/i.test(text)) {
    const rest = text.replace(/^(aggiungi|nuova)\s+categor(?:ia|ie)\s*/i, '').trim();
    await startAddCategory(opts.number, rest);
    return;
  }

  if (/^(modifica|cambia)\s+categor(?:ia|ie)\b/i.test(text)) {
    const rest = text.replace(/^(modifica|cambia)\s+categor(?:ia|ie)\s*/i, '').trim();
    await startEditCategory(opts.number, rest);
    return;
  }

  if (/^rinomina\s+categor(?:ia|ie)\b/i.test(text)) {
    const rest = text.replace(/^rinomina\s+categor(?:ia|ie)\s*/i, '').trim();
    if (rest.includes('|')) {
      const [from, to] = rest.split('|').map((part) => part.trim());
      try {
        const updated = updateCategory(from, { name: to });
        await reply(opts.number, `Ora si chiama *${updated.name}*.\n\n${listCategoriesText()}`);
      } catch (error) {
        await reply(opts.number, error instanceof Error ? error.message : 'Non sono riuscito a rinominare.');
      }
      return;
    }
    await startEditCategory(opts.number, rest);
    return;
  }

  if (/^descrizione\s+categor(?:ia|ie)\b/i.test(text)) {
    const rest = text.replace(/^descrizione\s+categor(?:ia|ie)\s*/i, '').trim();
    if (rest.includes('|')) {
      const [from, description] = rest.split('|').map((part) => part.trim());
      try {
        const updated = updateCategory(from, { description });
        await reply(opts.number, `Descrizione aggiornata per *${updated.name}*.`);
      } catch (error) {
        await reply(opts.number, error instanceof Error ? error.message : 'Non sono riuscito ad aggiornare la descrizione.');
      }
      return;
    }
    await startEditCategory(opts.number, rest);
    return;
  }

  if (/^(ordine|sposta)\s+categor(?:ia|ie)\b/i.test(text)) {
    const rest = text.replace(/^(ordine|sposta)\s+categor(?:ia|ie)\s*/i, '').trim();
    const match = rest.match(/^(.*)\s+(\d+)$/);
    if (match) {
      try {
        const updated = updateCategory(match[1].trim(), { order: Number(match[2]) });
        await reply(opts.number, `*${updated.name}* ora è in posizione ${updated.order}.\n\n${listCategoriesText()}`);
      } catch (error) {
        await reply(opts.number, error instanceof Error ? error.message : 'Non sono riuscito a spostare la categoria.');
      }
      return;
    }
    await startEditCategory(opts.number, rest);
    return;
  }

  if (/^icona\s+categor(?:ia|ie)\b/i.test(text)) {
    const rest = text.replace(/^icona\s+categor(?:ia|ie)\s*/i, '').trim();
    if (!rest) {
      await startEditCategory(opts.number, rest);
      return;
    }
    const match = rest.match(/^(.+?)\s+(\S+)$/);
    const icon = match ? resolveIcon(match[2]) : null;
    if (match && icon) {
      try {
        const updated = updateCategory(match[1].trim(), { icon });
        await reply(opts.number, `Icona *${iconLabel(updated.icon)}* per *${updated.name}*.`);
      } catch (error) {
        await reply(opts.number, error instanceof Error ? error.message : 'Non sono riuscito a cambiare l’icona.');
      }
      return;
    }
    // Nome della categoria senza icona riconosciuta (o bare "icona categoria <nome>"):
    // manda il collage con i numeri invece di far indovinare la parola giusta.
    const category = findCategory(rest);
    if (!category) {
      await reply(opts.number, categoryNotFoundMessage(rest));
      return;
    }
    saveCategorySession(opts.number, {
      number: opts.number,
      createdAt: Date.now(),
      kind: 'category-icon-pick',
      iconPickTarget: category.name,
    });
    await sendCategoryIconChoices(opts.number);
    await reply(opts.number, `Scegli il numero dell’icona per *${category.name}* e rispondimi con quel numero.`);
    return;
  }

  if (/^(nascondi|mostra)\s+.+/i.test(text) && !/^(nascondi|mostra)\s+categor(?:ia|ie)\b/i.test(text)) {
    const hide = /^nascondi\b/i.test(text);
    const q = text.replace(/^(nascondi|mostra)\s+/i, '').trim();
    try {
      const updated = updateCategory(q, { hidden: hide });
      await reply(
        opts.number,
        hide
          ? `Ok, *${updated.name}* è nascosta dal menu. Scrivi *mostra ${updated.name}* per rimetterla.`
          : `Ok, *${updated.name}* è di nuovo visibile sul menu.`
      );
    } catch {
      await reply(opts.number, categoryNotFoundMessage(q));
    }
    return;
  }

  if (/^(elimina|cancella|togli)\s+categor(?:ia|ie)\b/i.test(text)) {
    const rest = text.replace(/^(elimina|cancella|togli)\s+categor(?:ia|ie)\s*/i, '').trim();
    await startDeleteCategory(opts.number, rest);
    return;
  }

  if (lower === 'lista' || lower.startsWith('lista ')) {
    const filter = text.slice(5).trim();
    const products = loadProducts().filter((p) =>
      !filter || p.category.toLowerCase().includes(filter.toLowerCase()) || p.name.toLowerCase().includes(filter.toLowerCase())
    );
    if (products.length === 0) {
      await reply(opts.number, 'Nessun piatto trovato.');
      return;
    }
    await reply(opts.number, products.slice(0, 40).map(formatProduct).join('\n'));
    return;
  }

  if (lower.startsWith('cerca ')) {
    const q = text.slice(6).trim();
    const products = loadProducts().filter((p) =>
      p.name.toLowerCase().includes(q.toLowerCase())
    );
    if (products.length === 0) {
      const hint = suggestClosestProduct(q);
      await reply(opts.number, hint ? `Nessun risultato per "${q}". Intendevi *${hint.name}*?` : `Nessun risultato per "${q}".`);
      return;
    }
    await reply(opts.number, products.slice(0, 20).map(formatProduct).join('\n'));
    return;
  }

  if (['statistiche', 'stats'].includes(lower)) {
    await reply(opts.number, statsText());
    return;
  }

  if (
    ['nuovo codice accesso', 'rigenera codice', 'nuovo codice', 'cambia codice accesso'].includes(lower) ||
    ['nuovo codice accesso', 'cambia codice accesso'].includes(lowerNoConnectors)
  ) {
    pending[opts.number] = { number: opts.number, createdAt: Date.now(), kind: 'regen-code-confirm' };
    savePending(pending);
    await reply(
      opts.number,
      'Genero un nuovo codice di accesso al pannello admin: quello vecchio smetterà subito di funzionare, e se qualcuno è già collegato verrà disconnesso. Procedo? Scrivi *sì* o *no*.'
    );
    return;
  }

  if ((lower === 'link' || lower === 'menu' || lower === 'indirizzo menu') && !hasImportableUrls(text)) {
    await reply(opts.number, menuLinkText());
    return;
  }

  if (lower === 'qr') {
    const origin = menuOrigin();
    await reply(
      opts.number,
      `${menuLinkText()}\n\nApri il menu e stampa il QR dalla pagina /qr del locale: ${origin}/qr`,
      'qr'
    );
    return;
  }

  if (/^(finito|esaurito|finita|terminato|manca|non c['’]è)\s+.+/i.test(text)) {
    let rest = text
      .replace(/^(finito|esaurito|finita|terminato|manca|non c['’]è)\s+/i, '')
      .trim();
    const todayOnly = /\s+oggi$/i.test(rest);
    if (todayOnly) rest = rest.replace(/\s+oggi$/i, '').trim();
    const product = findProduct(rest);
    if (!product) {
      await reply(opts.number, productNotFoundMessage(rest));
      return;
    }
    const soldOutUntil = todayOnly ? tomorrowMidnightRomeMs() : 0;
    pushUndo({
      type: 'soldOut',
      id: product.id,
      previousUntil: product.soldOutUntil,
      name: product.name,
      at: Date.now(),
    });
    updateProduct(product.id, { soldOutUntil });
    await reply(
      opts.number,
      todayOnly
        ? `Ok, *${product.name}* non è più disponibile. Sul menu resta visibile ma segnata come finita. Torna disponibile da domani mattina in automatico.`
        : `Ok, *${product.name}* non è più disponibile. Sul menu resta visibile ma segnata come finita. Scrivi *torna ${product.name.toLowerCase()}* quando c’è di nuovo.`,
      'finito'
    );
    return;
  }

  if (/^(torna|disponibile|di nuovo|c['’]è)\s+.+/i.test(text)) {
    const rest = text.replace(/^(torna|disponibile|di nuovo|c['’]è)\s+/i, '').trim();
    const product = findProduct(rest);
    if (!product) {
      await reply(opts.number, productNotFoundMessage(rest));
      return;
    }
    pushUndo({
      type: 'soldOut',
      id: product.id,
      previousUntil: product.soldOutUntil,
      name: product.name,
      at: Date.now(),
    });
    updateProduct(product.id, { soldOutUntil: null });
    await reply(opts.number, `Ok, *${product.name}* è di nuovo disponibile. ${ON_MENU_ALREADY}`, 'tornato');
    return;
  }

  /** Applica bestSeller a una lista di piatti separati da virgola/"e" (es. "lampu,
   * caffoncello e pineta"). Un solo piatto ci passa lo stesso, la virgola non serve. */
  async function setBestSellerForList(rawList: string, value: boolean) {
    const names = rawList
      .split(/\s*,\s*|\s+e\s+/i)
      .map((n) => n.trim())
      .filter(Boolean);
    if (!names.length) {
      await reply(opts.number, productNotFoundMessage(rawList));
      return;
    }
    const found: MenuProduct[] = [];
    const notFound: string[] = [];
    for (const name of names) {
      const product = findProduct(name);
      if (product) found.push(product);
      else notFound.push(name);
    }
    if (!found.length) {
      await reply(opts.number, productNotFoundMessage(names.join(', ')));
      return;
    }
    if (found.length === 1) {
      pushUndo({ type: 'update', previous: found[0], at: Date.now() });
    } else {
      pushUndo({ type: 'bulkUpdate', previous: found, at: Date.now() });
    }
    for (const product of found) updateProduct(product.id, { bestSeller: value });
    const doneNames = found.map((p) => `*${p.name}*`).join(', ');
    const label = value ? 'segnati come consigliati' : 'non sono più segnati come consigliati';
    const missing = notFound.length ? `\n\nNon trovati: ${notFound.join(', ')}.` : '';
    await reply(opts.number, `Ok, ${doneNames} ora ${label}. ${ON_MENU_ALREADY}${missing}`, 'modificato');
  }

  if (/^(consiglia|consigliato|imposta)\s+.+\s+(come\s+)?consigliat[oi]$/i.test(text)) {
    const rest = text.replace(/^(consiglia|consigliato|imposta)\s+/i, '').replace(/\s+(come\s+)?consigliat[oi]$/i, '').trim();
    await setBestSellerForList(rest, true);
    return;
  }

  if (/^(consiglia|consigliato)\s+.+/i.test(text)) {
    const rest = text.replace(/^(consiglia|consigliato)\s+/i, '').trim();
    await setBestSellerForList(rest, true);
    return;
  }

  if (/^(non consigliato|togli consigliato|non è consigliato|imposta)\s+.+\s+(come\s+)?non\s+consigliat[oi]$/i.test(text)) {
    const rest = text.replace(/^(imposta)\s+/i, '').replace(/\s+(come\s+)?non\s+consigliat[oi]$/i, '').trim();
    await setBestSellerForList(rest, false);
    return;
  }

  if (/^(non consigliato|togli consigliato|non è consigliato)\s+.+/i.test(text)) {
    const rest = text.replace(/^(non consigliato|togli consigliato|non è consigliato)\s+/i, '').trim();
    await setBestSellerForList(rest, false);
    return;
  }

  if (/^sposta\s+(?!categor(?:ia|ie)\b).+\s+in\s+.+/i.test(text)) {
    const match = text.match(/^sposta\s+(.+?)\s+in\s+(?:la\s+)?(?:categor(?:ia|ie)\s+)?(.+)$/i);
    if (!match) {
      await reply(opts.number, 'Dimmi: sposta, poi il piatto, poi in categoria e il nome.\nEsempio: *sposta insalatina in categoria cocktails*');
      return;
    }
    const product = findProduct(match[1].trim());
    if (!product) {
      await reply(opts.number, productNotFoundMessage(match[1].trim()));
      return;
    }
    const category = resolveCategory(match[2].trim());
    pushUndo({ type: 'update', previous: product, at: Date.now() });
    updateProduct(product.id, { category });
    await reply(opts.number, `Ok, *${product.name}* ora è in *${category}*. ${ON_MENU_ALREADY}`, 'modificato');
    return;
  }

  if (/^copia\s+.+/i.test(text)) {
    const q = text.replace(/^copia\s+/i, '').trim();
    const product = findProduct(q);
    if (!product) {
      await reply(opts.number, productNotFoundMessage(q));
      return;
    }
    const added = appendProducts([
      {
        name: `Copia di ${product.name}`,
        category: product.category,
        price: product.price,
        ingredients: product.ingredients,
        description: product.description,
        imageUrl: product.imageUrl,
        allergens: product.allergens || [],
        bestSeller: product.bestSeller,
        soldOutUntil: null,
      },
    ]);
    pushUndo({ type: 'add', ids: added.map((p) => p.id), at: Date.now() });
    await reply(opts.number, `Ho creato ${formatProduct(added[0])}. ${ON_MENU_ALREADY}`, 'aggiunto');
    return;
  }

  if (/^aumenta\s+prezzi\b/i.test(text) || /^riduci\s+prezzi\b/i.test(text)) {
    const increase = /^aumenta\b/i.test(text);
    const rest = text.replace(/^(aumenta|riduci)\s+prezzi\s*/i, '').trim();
    const pctMatch = rest.match(/^(?:(.+?)\s+)?(\d+(?:[.,]\d+)?)\s*%$/i);
    const euroMatch = rest.match(/^(?:(.+?)\s+)?(\d+(?:[.,]\d+)?)\s*(?:euro|€)?$/i);
    let categoryFilter = '';
    let amount = 0;
    let mode: 'percent' | 'euro' = 'euro';
    if (pctMatch) {
      categoryFilter = (pctMatch[1] || '').trim();
      amount = Number(pctMatch[2].replace(',', '.'));
      mode = 'percent';
    } else if (euroMatch) {
      categoryFilter = (euroMatch[1] || '').trim();
      amount = Number(euroMatch[2].replace(',', '.'));
      mode = 'euro';
    } else {
      await reply(
        opts.number,
        'Dimmi tipo: *aumenta prezzi 5%* oppure *aumenta prezzi primi 1 euro*.'
      );
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      await reply(opts.number, 'Non ho capito l’importo. Esempio: *aumenta prezzi 5%*.');
      return;
    }
    const products = loadProducts().filter((p) => {
      if (!categoryFilter) return true;
      return (
        normalizeName(p.category).includes(normalizeName(categoryFilter)) ||
        normalizeName(categoryFilter).includes(normalizeName(p.category))
      );
    });
    if (!products.length) {
      await reply(opts.number, categoryFilter ? categoryNotFoundMessage(categoryFilter) : 'Nessun piatto nel menu.');
      return;
    }
    const sign = increase ? 1 : -1;
    const changes: BulkPriceChange[] = products.map((p) => {
      const from = Number(p.price) || 0;
      const to =
        mode === 'percent'
          ? Math.round(from * (1 + (sign * amount) / 100) * 100) / 100
          : Math.max(0, Math.round((from + sign * amount) * 100) / 100);
      return { id: p.id, name: p.name, from, to };
    });
    pending[opts.number] = {
      number: opts.number,
      createdAt: Date.now(),
      kind: 'bulk-price',
      bulkPrice: changes,
    };
    savePending(pending);
    const preview = changes
      .slice(0, 25)
      .map((c) => `• *${c.name}*: €${c.from.toFixed(2)} → €${c.to.toFixed(2)}`)
      .join('\n');
    await reply(
      opts.number,
      `Anteprima (${changes.length} piatti):\n${preview}${changes.length > 25 ? '\n…' : ''}\n\nScrivi *sì* per applicare, o *annulla*.`
    );
    return;
  }

  if (lower.startsWith('prezzo ')) {
    const rest = text.slice(7).trim();
    const match = rest.match(/^(.*)\s+(\d+(?:[.,]\d+)?)$/);
    if (!match) {
      await reply(opts.number, 'Dimmi: prezzo, poi id o nome, poi euro.\nEsempio: *prezzo carbonara 9,50*');
      return;
    }
    const product = findProduct(match[1].trim());
    if (!product) {
      await reply(opts.number, productNotFoundMessage(match[1].trim()));
      return;
    }
    const price = Number(match[2].replace(',', '.'));
    pushUndo({
      type: 'price',
      id: product.id,
      previousPrice: Number(product.price) || 0,
      name: product.name,
      at: Date.now(),
    });
    updateProduct(product.id, { price });
    await reply(opts.number, `Aggiornato *${product.name}*: €${price.toFixed(2)}. ${ON_MENU_ALREADY}`, 'prezzo');
    return;
  }

  async function confirmDeleteSelection(ids: string[]) {
    if (ids.length === 0) {
      await reply(opts.number, 'Non hai selezionato nessun piatto. Scegli nella lista, poi scrivi *cancella*.');
      return;
    }
    const snapshots = ids.map((id) => findProduct(id)).filter(Boolean) as MenuProduct[];
    const names = selectedSummary(ids);
    pushUndo({ type: 'delete', products: snapshots, at: Date.now() });
    const removed = deleteProducts(ids);
    delete pending[opts.number];
    savePending(pending);
    await reply(opts.number, `Cancellati ${removed} piatti:\n${names}\n${ON_MENU_ALREADY}`, 'eliminato');
  }

  // "vai" non è accettato qui: è una cancellazione, va confermata solo con "cancella"/"conferma"/sì.
  if (['cancella', 'conferma'].includes(lower)) {
    if (session?.kind === 'delete' && Date.now() - session.createdAt <= SESSION_MS) {
      await confirmDeleteSelection(session.selectedIds || []);
      return;
    }
  }

  if (lower === 'elimina') {
    await startDeletePoll(opts.number);
    return;
  }

  if (lower === 'cancella' && session?.kind !== 'delete') {
    // "cancella" da sola, fuori da un flusso di eliminazione già avviato, non è
    // documentata come comando a sé: aprire comunque un nuovo elenco da cancellare
    // confondeva chi la scriveva pensando che annullasse qualcosa.
    await reply(opts.number, 'Non c’è niente da cancellare al momento. Scrivi *elimina* se vuoi togliere un piatto.');
    return;
  }

  if (lower.startsWith('elimina ') || lower.startsWith('cancella ')) {
    const q = text.replace(/^(elimina|cancella)\s+/i, '').trim();
    const product = findProduct(q);
    if (!product) {
      await reply(opts.number, productNotFoundMessage(q));
      return;
    }
    pending[opts.number] = {
      number: opts.number,
      createdAt: Date.now(),
      kind: 'delete-confirm',
      selectedIds: [product.id],
    };
    savePending(pending);
    await reply(opts.number, `Vuoi davvero eliminare *${product.name}*? Scrivi *sì* oppure *annulla*.`);
    return;
  }

  if (lower === 'foto' || lower === 'cambia foto') {
    await startPhotoPoll(opts.number);
    return;
  }

  if (lower.startsWith('foto ') || lower.startsWith('cambia foto ')) {
    const q = text.replace(/^(cambia\s+)?foto\s+/i, '').trim();
    await startPhotoPoll(opts.number, q);
    return;
  }

  if (session?.kind === 'model3d-photos' && ['fatto', 'genera', 'ok genera', 'vai'].includes(lower)) {
    const photos = session.model3dPhotos || [];
    if (photos.length < 2) {
      await reply(opts.number, 'Servono almeno 2 foto da angolazioni diverse. Mandane un\'altra prima di scrivere *fatto*.');
      return;
    }
    const productId = session.photoProductId;
    const product = productId ? findProduct(productId) : null;
    if (!product) {
      delete pending[opts.number];
      savePending(pending);
      await reply(opts.number, 'Piatto non trovato. Riprova con *modello 3d nome piatto*.');
      return;
    }
    await reply(opts.number, 'Ricevute le foto, avvio la generazione del modello 3D…');
    try {
      const origin = menuOrigin();
      const imageUrls = photos.map((filename) => `${origin}${dishImageUrl(filename)}`);
      const taskId = await submitMultiviewTask(imageUrls);
      addModel3dJob({
        id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
        tenantSlug: currentTenant().slug,
        productId: product.id,
        productName: product.name,
        taskId,
        whatsappNumber: opts.number,
        createdAt: Date.now(),
        photoFilenames: photos,
        attempts: 0,
      });
      delete pending[opts.number];
      savePending(pending);
      await reply(opts.number, `Generazione avviata per *${product.name}*. Di solito richiede 1-2 minuti, ti scrivo appena è pronto.`);
    } catch (error) {
      console.error('Avvio generazione 3D fallito:', error instanceof Error ? error.stack || error.message : error);
      await reply(opts.number, 'Non sono riuscito ad avviare la generazione. Riprova tra poco con *modello 3d nome piatto*.');
    }
    return;
  }

  if (lower.startsWith('modello 3d ') || lower.startsWith('modello3d ') || lower.startsWith('3d ')) {
    const q = text.replace(/^(modello\s*3d|3d)\s+/i, '').trim();
    const product = findProduct(q);
    if (!product) {
      await reply(opts.number, productNotFoundMessage(q));
      return;
    }
    try {
      assertModel3dQuota();
    } catch (error) {
      await reply(opts.number, error instanceof PlanLimitError ? error.message : 'Modelli 3D non disponibili al momento.');
      return;
    }
    if (!tripo3dConfigured()) {
      await reply(opts.number, 'Il servizio di generazione modelli 3D non è ancora attivo su questo locale.');
      return;
    }
    if (hasActiveJobForProduct(currentTenant().slug, product.id)) {
      await reply(opts.number, `C'è già un modello 3D in generazione per *${product.name}*. Aspetta che sia pronto.`);
      return;
    }
    pending[opts.number] = {
      number: opts.number,
      createdAt: Date.now(),
      kind: 'model3d-photos',
      photoProductId: product.id,
      model3dPhotos: [],
    };
    savePending(pending);
    await reply(
      opts.number,
      `Mandami 2-4 foto di *${product.name}* da angolazioni diverse (davanti, di lato, dall'alto…). Più angolazioni mandi, meglio viene il modello. Quando hai finito scrivi *fatto*.`
    );
    return;
  }

  if (
    lower === 'modifica' ||
    lower === 'modifica piatto' ||
    lower === 'cambia piatto' ||
    /^(modifica|cambia)\s+piatto\b/i.test(text)
  ) {
    const rest = text
      .replace(/^(modifica|cambia)(\s+piatto)?\s*/i, '')
      .trim();
    await startEditDish(opts.number, rest);
    return;
  }

  if (/^modifica\s+.+/i.test(text) && !/^(modifica)\s+categor(?:ia|ie)\b/i.test(text)) {
    const rest = text.replace(/^modifica\s+/i, '').trim();
    if (rest && !/^piatto\b/i.test(rest)) {
      await startEditDish(opts.number, rest);
      return;
    }
  }

  if (isSetupTrigger(lower)) {
    const started = await handleSetupShortcut(opts.number, text);
    if (!started) return;
    pending[opts.number] = started.session;
    savePending(pending);
    await reply(opts.number, started.message);
    if (started.sendCovers) await sendCoverChoices(opts.number, started.session.setup);
    return;
  }

  const addMatch = lower.match(/^(aggiungi|nuovo piatto|aggiungi piatto|voglio aggiungere)(?:\s+(.+))?$/i);
  if (addMatch || lower === 'aggiungi') {
    const rest = text.replace(/^(aggiungi|nuovo piatto|aggiungi piatto|voglio aggiungere)\s*/i, '').trim();
    let parts: string[] | null = null;
    if (rest.includes('|')) {
      parts = rest.split('|').map((p) => p.trim());
    } else if (rest.includes(',')) {
      const commaParts = rest.split(',').map((p) => p.trim()).filter(Boolean);
      if (commaParts.length >= 3 && parsePrice(commaParts[2]) !== null) {
        parts = [
          commaParts[0],
          commaParts[1],
          commaParts[2],
          commaParts.slice(3).join(', '),
        ];
      }
    }
    if (parts) {
      if (parts.length < 3) {
        // Formato veloce incompleto (es. "aggiungi Carbonara | primi", manca il prezzo):
        // il nome già scritto resta pre-compilato invece di doverlo riscrivere da capo.
        await reply(opts.number, startAdd(opts.number, parts[0] || ''));
        return;
      }
      const categories = loadCategories();
      const category = matchCategory(parts[1] || '', categories);
      const price = parsePrice(parts[2]) ?? (Number(String(parts[2]).replace(',', '.')) || 0);
      const ingredients = parts[3] || parts[0];
      const added = appendProducts([
        {
          name: parts[0],
          category,
          price,
          ingredients,
          description: ingredients,
          allergens: [],
        },
      ]);
      pushUndo({ type: 'add', ids: added.map((p) => p.id), at: Date.now() });
      await reply(opts.number, `Aggiunto ${formatProduct(added[0])}. ${ON_MENU_ALREADY}`, 'aggiunto');
      return;
    }
    // Nessun formato veloce riconosciuto (es. "aggiungi Carbonara, primi" senza prezzo):
    // tiene solo il primo pezzo come nome pre-compilato, non l'intera frase con virgola.
    const firstPiece = rest.split(',')[0]?.trim() || '';
    await reply(opts.number, startAdd(opts.number, firstPiece));
    return;
  }

  await reply(
    opts.number,
    'Non ho capito. Prova a riscriverlo in modo semplice (es. *prezzo carbonara 9,50*), oppure mandami un vocale — a voce capisco anche le frasi normali. Scrivi *aiuto* per l’elenco comandi.',
    'noncapito'
  );
}

/**
 * Punto di ingresso pubblico per un messaggio testuale. Prova a riconoscere se il
 * messaggio contiene più comandi in una frase sola (es. "prezzo carbonara 9,50 e
 * finito margherita") ed eseguirli in sequenza; altrimenti (la stragrande
 * maggioranza dei messaggi) passa dritto a handleSingleWhatsAppCommand col testo
 * originale, senza alcuna chiamata extra.
 *
 * Lo split multi-comando è tentato solo se non c'è un flusso guidato già aperto
 * (aggiungi, modifica, setup…): lì il messaggio è la risposta a una domanda
 * precisa, non un nuovo comando libero, e va passato così com'è.
 */
export async function handleWhatsAppCommand(opts: {
  number: string;
  text: string;
  imageBase64?: string | null;
  pollOptions?: string[];
  pollMessageId?: string;
}) {
  const text = (opts.text || '').trim();
  if (opts.imageBase64 || opts.pollOptions?.length) {
    await handleSingleWhatsAppCommand(opts);
    return;
  }

  const pending = loadPending();
  const session = pending[opts.number];
  const inFlow = session && Date.now() - session.createdAt <= SESSION_MS;
  if (inFlow) {
    await handleSingleWhatsAppCommand(opts);
    return;
  }

  if (looksLikeMultipleCommands(text)) {
    const commands = await splitMultiCommandMessage(text);
    if (commands) {
      for (const cmd of commands) {
        await handleSingleWhatsAppCommand({ number: opts.number, text: cmd });
      }
      return;
    }
  }

  // Il testo non inizia con nessuna parola-comando nota: prima di lasciare che il
  // parser a regex risponda "non ho capito", proviamo a tradurlo in un comando
  // canonico con lo stesso normalizzatore usato per i vocali (funziona identico su
  // testo libero digitato, es. "cambia colore top bar in viola" -> "colore viola").
  // Per i messaggi che già iniziano con un comando riconosciuto non scatta nulla:
  // zero chiamate extra, comportamento identico a prima.
  if (text.length >= 3 && !startsWithCommand(text)) {
    const normalized = await normalizeVoiceCommand(text);
    if (normalized) {
      await handleSingleWhatsAppCommand({ number: opts.number, text: normalized });
      return;
    }
  }

  await handleSingleWhatsAppCommand(opts);
}

/** Dopo la trascrizione: conferma se lungo/ambiguo, altrimenti esegue subito. */
export async function runVoiceCommand(
  number: string,
  transcript: { cleaned: string; needsConfirm: boolean }
) {
  const cleaned = String(transcript.cleaned || '').trim();
  if (!cleaned) {
    await reply(number, 'Non ho capito il vocale. Riprova o scrivi il comando.', 'noncapito');
    return;
  }

  const pending = loadPending();
  const session = pending[number];
  const inFlow =
    session &&
    session.kind !== 'voice-confirm' &&
    Date.now() - session.createdAt <= SESSION_MS;

  // In un flusso già aperto (aggiungi, modifica…): passa il testo pulito senza chiedere.
  // Qui il vocale è la risposta a una singola domanda (un prezzo, un nome…), non una
  // frase-comando da interpretare, quindi niente normalizzazione.
  if (inFlow) {
    await handleSingleWhatsAppCommand({ number, text: cleaned });
    return;
  }

  // Se il testo non inizia già con un comando riconosciuto, proviamo a tradurlo
  // (indipendentemente dalla lunghezza: anche una frase corta come "cambia colore in
  // viola" non è nel formato rigido "colore <colore>" che il parser capisce). Se la
  // normalizzazione non è disponibile o non è sicura, ricadiamo sul testo grezzo
  // (comportamento precedente: il comando finale potrebbe non essere riconosciuto,
  // ma non è peggio di prima).
  let toRun = cleaned;
  if (!startsWithCommand(cleaned)) {
    const normalized = await normalizeVoiceCommand(cleaned);
    if (normalized) toRun = normalized;
  }

  if (!transcript.needsConfirm) {
    await handleSingleWhatsAppCommand({ number, text: toRun });
    return;
  }

  pending[number] = {
    number,
    createdAt: Date.now(),
    kind: 'voice-confirm',
    voiceText: toRun,
  };
  savePending(pending);
  await sendWhatsAppText(
    number,
    `Ho capito: *${toRun}*.\n\nVa bene? Scrivi *sì* per procedere, o *no* per annullare.`
  );
}

