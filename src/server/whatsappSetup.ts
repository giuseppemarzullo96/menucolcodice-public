import { findRestaurantOnline, formatSearchPick, parseNameLocation, shouldOfferSearchPick, type SearchCandidate } from './restaurantLookup';
import { filterCompleteRestaurantUrls } from '@/utils/restaurantUrlQuality';
import { formatOnlineMenuPreview, hydrateMenuImages, searchMenuOnline, verifyPublicUrl, type OnlineMenuDish } from './menuOnlineSearch';
import { importProducts, loadProducts } from './menuStore';
import { PlanLimitError, currentTenant } from './tenant';
import { processBrandImageFromBase64 } from './dishImage';
import { extractUrls, hasImportableUrls, importRestaurantFromUrls, parseItalianAddress, prepareCoverChoices, type ImportedProfile } from './restaurantImport';
import { formatOpeningHoursDisplay, normalizeOpeningHours, parsesAsStructuredOpeningHours } from '@/utils/openingHours';
import { openaiJson, extractJson } from './aiClient';
import { loadIntegrations } from './integrations';
import { recordAiUsage } from './aiUsageStore';
import {
  applyBrandColors,
  applyThemePalette,
  applyViewMode,
  currentRestaurant,
  fitLogoSize,
  parseColor,
  patchRestaurant,
  type ThemePalette,
} from './restaurantStore';
import { usableDeliveryUrl } from '@/utils/socialLinks';
import { SESSION_EXPIRED_MSG } from './whatsappHelp';
import { sendWhatsAppSticker, sendWhatsAppText } from './whatsapp';
import { stickerPublicUrl, type StickerId } from './whatsappStickers';

export type SetupFlow = 'menu' | 'full' | 'dati' | 'colori' | 'logo' | 'sfondo' | 'link' | 'vista';

export type SetupDraft = {
  flow: SetupFlow;
  step: string;
  name?: string;
  description?: string;
  street?: string;
  city?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  openingHours?: string;
  instagram?: string;
  facebook?: string;
  whatsapp?: string;
  glovo?: string;
  deliveroo?: string;
  justeat?: string;
  logoUrl?: string;
  textLogo?: boolean;
  homeBackgroundUrl?: string;
  primaryColor?: string;
  pageColor?: string;
  palette?: ThemePalette;
  logoWidth?: number;
  logoHeight?: number;
  coverChoices?: string[];
  viewMode?: 'list' | 'carousel';
  searchQuery?: string;
  searchCandidates?: SearchCandidate[];
  searchUrls?: string[];
  searchHits?: Array<{ title: string; url: string; snippet: string; source: string }>;
  searchPrefill?: Partial<ImportedProfile>;
  editQueue?: string[];
  editReturnStep?: string;
  menuCandidates?: OnlineMenuDish[];
  menuSource?: string;
  menuSourceLabel?: string;
};

export type SetupSession = {
  number: string;
  createdAt: number;
  kind: 'setup';
  setup: SetupDraft;
};

const SETUP_MS = 60 * 60 * 1000;

function isSkip(text: string) {
  return ['salta', 'skip', 'nessuno', 'niente', '-', 'no', 'lascia'].includes(text);
}

function isYes(text: string) {
  return ['si', 'sì', 'ok', 'okay', 'va bene', 'conferma', 'confermo', 'yes'].includes(text);
}

function isNo(text: string) {
  return ['no', 'nope'].includes(text);
}

function isAddMenu(text: string) {
  return ['aggiungi', 'add', 'unisci', 'integra', 'accoda', 'unire'].includes(text);
}

function isReplaceMenu(text: string) {
  return ['sostituisci', 'replace', 'sostituire', 'cancella', 'rimpiazza', 'sostituzione'].includes(text);
}

function menuImportChoicePrompt(existingCount: number) {
  return (
    `Hai già *${existingCount}* piatti nel menu.\n\n` +
    `Come vuoi procedere?\n` +
    `• *aggiungi* — unisce i nuovi ai piatti attuali\n` +
    `• *sostituisci* — cancella i vecchi e importa solo quelli trovati online\n` +
    `• *no* — salta l'import del menu`
  );
}

function onlineMenuPreviewMessage(draft: SetupDraft) {
  return formatOnlineMenuPreview(
    {
      found: true,
      sourceLabel: draft.menuSourceLabel || 'web',
      sourceUrl: draft.menuSource || '',
      dishes: draft.menuCandidates || [],
      notes: [],
    },
    loadProducts().length
  );
}

async function reply(number: string, text: string, sticker?: StickerId | null) {
  if (sticker) {
    try {
      await sendWhatsAppSticker({ number, stickerUrl: stickerPublicUrl(sticker) });
    } catch (error) {
      console.error('Invio sticker setup fallito', sticker, error);
    }
  }
  await sendWhatsAppText(number, text);
}

const SETUP_WAIT_MESSAGE =
  'Il processo è iniziato, aspetta il termine. Arriverà un messaggio di conferma.\n\n⏳ Può richiedere *fino a 3 minuti* (ricerca online, sito, menu e colori).';

async function replySetupWait(number: string) {
  await reply(number, SETUP_WAIT_MESSAGE, 'attesa');
}

async function startLinkImport(number: string, text: string) {
  await replySetupWait(number);
  const started = startSetupSession(number, 'link');
  started.session.setup.flow = 'full';
  const imported = await importLinksIntoDraft(started.session.setup, text);
  return { ...started, message: imported.message, sendCovers: imported.sendCovers };
}

export function setupHelpLine() {
  return `configura → configura il locale (dati, logo, sfondo, colori, vista)
logo / sfondo / colori / vista / dati`;
}

export function isSetupTrigger(lower: string) {
  const cmd = lower.split(/\s+/)[0];
  if (hasImportableUrls(lower) && (cmd.startsWith('http') || cmd.startsWith('www') || cmd === 'importa')) return true;
  return (
    [
      'setup',
      'onboarding',
      'configura',
      'configurazione',
      'locale',
      'grafica',
      'design',
      'dati',
      'colori',
      'colore',
      'logo',
      'sfondo',
      'link',
      'links',
      'sito',
      'website',
      'vista',
      'elenco',
      'carosello',
      'telefono',
      'tel',
      'email',
      'mail',
      'indirizzo',
      'via',
      'instagram',
      'ig',
      'facebook',
      'fb',
      'descrizione',
      'orari',
      'orario',
    ].includes(cmd) ||
    lower.startsWith('colore ') ||
    lower.startsWith('colori ') ||
    lower.startsWith('vista ')
  );
}

const HOURS_AI_PROMPT = `Riscrivi l'orario di apertura di un locale (frase libera in italiano) in un formato preciso.
Non inventare orari: usa solo quelli detti nella frase.
Ogni blocco: <Giorno o intervallo di giorni> <HH:MM-HH:MM>[, <HH:MM-HH:MM> per un'altra fascia dello stesso giorno].
Più blocchi separati da "; ". Giorno chiuso: "<Giorno> chiuso".
Giorni ammessi: Lun Mar Mer Gio Ven Sab Dom (anche intervalli tipo Lun-Ven).
Rispondi SOLO con JSON: {"hours": "<risultato>"} oppure {"hours": null} se la frase non è chiara.

Esempi:
Frase: "apriamo tutti i giorni tranne il lunedì dalle nove del mattino a mezzanotte"
{"hours": "Mar-Dom 09:00-00:00; Lun chiuso"}

Frase: "dal lunedì al giovedì dalle 9 a mezzanotte, venerdì e sabato dalle 9 alle 2 di notte, la domenica chiuso"
{"hours": "Lun-Gio 09:00-00:00; Ven-Sab 09:00-02:00; Dom chiuso"}

Frase: "sempre aperti, orario continuato dalle 8 di mattina a mezzanotte"
{"hours": "Lun-Dom 08:00-00:00"}

Frase: "a pranzo dalle 12 alle 15 e la sera dalle 19 alle 23, il mercoledì siamo chiusi"
{"hours": "Lun-Mar 12:00-15:00, 19:00-23:00; Gio-Dom 12:00-15:00, 19:00-23:00; Mer chiuso"}`;

/**
 * Traduce una frase libera sugli orari (che il parser deterministico in
 * openingHours.ts non riesce a strutturare) in un formato che quel parser
 * capisce, usando un LLM. Chiamata solo quando parsesAsStructuredOpeningHours()
 * fallisce sul testo originale — per input già ben formati non scatta,
 * zero costo/latenza extra. Ritorna null se manca la chiave OpenAI, se il
 * modello non è sicuro, o se la chiamata fallisce: chi chiama ricade sul
 * testo grezzo (comportamento precedente, nessuna regressione).
 */
async function normalizeOpeningHoursWithAI(raw: string): Promise<string | null> {
  const cfg = loadIntegrations();
  if (!cfg.openai.apiKey) return null;
  try {
    const res = await openaiJson(
      [
        { role: 'system', content: HOURS_AI_PROMPT },
        { role: 'user', content: raw },
      ],
      { timeoutMs: 12000, temperature: 0 }
    );
    const parsed = extractJson(res);
    const hours = typeof parsed?.hours === 'string' ? parsed.hours.trim() : '';
    if (!hours) return null;
    try {
      recordAiUsage({ slug: currentTenant().slug, kind: 'openai', provider: 'openai', model: cfg.openai.model || 'gpt-4o-mini' });
    } catch {
      /* ignore */
    }
    return hours;
  } catch {
    return null;
  }
}

function hoursSummary(raw?: string) {
  const text = String(raw || '').trim();
  if (!text) return '—';
  const formatted = formatOpeningHoursDisplay(text);
  return formatted.includes('\n') ? `\n${formatted}` : formatted;
}

function currentSummary() {
  const { restaurantInfo, restaurantContacts, restaurantSocial, themeLayout, themeColors } = currentRestaurant();
  return [
    `• Nome: ${restaurantInfo.name || '—'}`,
    `• Descrizione: ${restaurantInfo.description || '—'}`,
    `• Indirizzo: ${restaurantInfo.address?.street || '—'}, ${restaurantInfo.address?.city || '—'}`,
    `• Telefono: ${restaurantContacts.phone || '—'}`,
    `• Email: ${restaurantContacts.email || '—'}`,
    `• Orari: ${hoursSummary(restaurantInfo.openingHours)}`,
    `• Instagram: ${restaurantSocial.instagram || '—'}`,
    `• Logo: ${themeLayout.logoUrl ? 'sì' : 'no'}`,
    `• Sfondo home: ${themeLayout.homeBackgroundUrl ? 'sì' : 'no'}`,
    `• Vista menu: ${themeColors?.card?.viewMode === 'list' ? 'elenco' : 'carosello'}`,
  ].join('\n');
}

export function setupMenuText() {
  return `Cosa vuoi impostare?

1. *Tutto* (cerca per nome e città, oppure da link)
2. *Dati* del locale
3. *Logo*
4. *Sfondo* della home
5. *Colori*
6. *Vista menu* (elenco o carosello)
7. *Da link* (sito, Google, TripAdvisor, TheFork)

Rispondi col numero, oppure scrivi *link*, *logo*, *sfondo*, *colori*, *vista*, *dati*.
*annulla* per uscire.

Ora il locale è:
${currentSummary()}`;
}

function recapBody(draft: SetupDraft) {
  return `Controlla prima di salvare:

• Nome: ${draft.name || '—'}
• Descrizione: ${draft.description || '—'}
• Indirizzo: ${draft.street || '—'}, ${draft.city || '—'} ${draft.postalCode || ''}
• Telefono: ${draft.phone || '—'}
• Email: ${draft.email || '—'}
• Sito: ${draft.website || '—'}
• Orari: ${hoursSummary(draft.openingHours)}
• Instagram: ${draft.instagram || '—'}
• Facebook: ${draft.facebook || '—'}
• WhatsApp clienti: ${draft.whatsapp || '—'}
• Glovo / Deliveroo / Just Eat: ${[draft.glovo, draft.deliveroo, draft.justeat].filter(Boolean).join(' · ') || '—'}
• Logo: ${draft.logoUrl ? 'sì' : draft.textLogo ? 'nome testo' : 'invariato'}
• Sfondo home: ${draft.homeBackgroundUrl ? 'sì' : 'invariato'}
• Colori: ${draft.palette ? 'palette AI su navbar, sidebar, card, testi e footer' : draft.primaryColor ? `${draft.primaryColor}${draft.pageColor ? ` / ${draft.pageColor}` : ' (tema armonizzato in automatico)'}` : 'invariati'}
• Vista menu: ${draft.viewMode === 'list' ? 'elenco sobrio' : draft.viewMode === 'carousel' ? 'carosello' : 'invariata'}`;
}

function recap(draft: SetupDraft) {
  return `${recapBody(draft)}

Lo applico? Scrivi *sì* o *no*.`;
}

const REVIEW_EDIT_OPTIONS: Array<{ n: number; step: string; keywords: string[] }> = [
  { n: 1, step: 'name', keywords: ['nome'] },
  { n: 2, step: 'description', keywords: ['descrizione', 'desc'] },
  { n: 3, step: 'street', keywords: ['indirizzo', 'via', 'address'] },
  { n: 4, step: 'city', keywords: ['città', 'citta', 'cap', 'city'] },
  { n: 5, step: 'phone', keywords: ['telefono', 'tel'] },
  { n: 6, step: 'email', keywords: ['email', 'mail'] },
  { n: 7, step: 'website', keywords: ['sito', 'website', 'web'] },
  { n: 8, step: 'hours', keywords: ['orari', 'orario'] },
  { n: 9, step: 'instagram', keywords: ['instagram', 'ig'] },
  { n: 10, step: 'facebook', keywords: ['facebook', 'fb'] },
  { n: 11, step: 'whatsapp', keywords: ['whatsapp', 'wa'] },
  { n: 12, step: 'glovo', keywords: ['glovo'] },
  { n: 13, step: 'deliveroo', keywords: ['deliveroo'] },
  { n: 14, step: 'justeat', keywords: ['just eat', 'justeat'] },
];

function reviewEditMenu() {
  return `Cosa vuoi modificare?

1. *Nome*
2. *Descrizione*
3. *Indirizzo* (via e numero)
4. *Città* e CAP
5. *Telefono*
6. *Email*
7. *Sito web*
8. *Orari*
9. *Instagram*
10. *Facebook*
11. *WhatsApp* clienti
12. *Glovo*
13. *Deliveroo*
14. *Just Eat*

Scrivi i *numeri* da cambiare (es. *1, 5, 9*) o il nome del campo.
*Sì* se va tutto bene · *no* per cercare di nuovo · *manuale* per inserire tutto a mano.`;
}

function searchVerifyPrompt(draft: SetupDraft) {
  return `${recapBody(draft)}\n\n${reviewEditMenu()}`;
}

function parseEditPicks(text: string) {
  const lower = text.toLowerCase().trim();
  const picked = new Set<string>();
  const nums = lower.match(/\d+/g) || [];
  for (const num of nums) {
    const opt = REVIEW_EDIT_OPTIONS.find((item) => item.n === Number(num));
    if (opt) picked.add(opt.step);
  }
  for (const opt of REVIEW_EDIT_OPTIONS) {
    if (opt.keywords.some((word) => lower.includes(word))) picked.add(opt.step);
  }
  return REVIEW_EDIT_OPTIONS.filter((opt) => picked.has(opt.step)).map((opt) => opt.step);
}

async function finishFieldStep(draft: SetupDraft, current: string) {
  const queue = draft.editQueue;
  const returnStep = draft.editReturnStep;
  if (queue?.length && returnStep) {
    const idx = queue.indexOf(current);
    if (idx >= 0 && idx < queue.length - 1) {
      draft.step = queue[idx + 1];
      return { message: promptFor(draft), sendCovers: false };
    }
    delete draft.editQueue;
    delete draft.editReturnStep;
    draft.step = returnStep;
    return { message: `Aggiornato.\n\n${searchVerifyPrompt(draft)}`, sendCovers: false };
  }
  return promptAfter(draft, current);
}

function parseViewMode(text: string): 'list' | 'carousel' | null {
  const lower = text.toLowerCase().trim();
  if (['1', 'elenco', 'lista', 'list', 'sobrio'].includes(lower)) return 'list';
  if (['2', 'carosello', 'carousel', 'card', 'slider'].includes(lower)) return 'carousel';
  return null;
}

function parseCityLine(text: string) {
  const cap = text.match(/(\d{5})/);
  const city = text.replace(/\d{5}/g, '').replace(/[,-]/g, ' ').replace(/\s+/g, ' ').trim();
  return { city, postalCode: cap ? cap[1] : '' };
}

function normalizePhone(text: string) {
  let phone = text.replace(/[^\d+]/g, '');
  if (/^3\d{9}$/.test(phone)) phone = `+39${phone}`;
  else if (/^39\d{10}$/.test(phone)) phone = `+${phone}`;
  return phone;
}

function startDraft(flow: SetupFlow, step: string): SetupDraft {
  return { flow, step };
}

export function startSetupSession(number: string, flow: SetupFlow = 'menu'): { session: SetupSession; message: string } {
  const setup = startDraft(flow, flow === 'menu' ? 'menu' : firstStep(flow));
  return {
    session: { number, createdAt: Date.now(), kind: 'setup', setup },
    message: promptFor(setup),
  };
}

function formatSignupPhone(phone: string) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('39') && digits.length >= 10) {
    return `+${digits.slice(0, 2)} ${digits.slice(2)}`;
  }
  return digits ? `+${digits}` : phone;
}

/** Avvia onboarding Pro dopo iscrizione, con numero e nome già noti. */
export function createSignupOnboardingSession(opts: { number: string; name: string; phone: string }) {
  const phone = String(opts.phone || opts.number || '').replace(/\D/g, '');
  const setup: SetupDraft = {
    flow: 'full',
    step: 'search',
    name: String(opts.name || '').trim(),
    phone,
  };
  const label = setup.name || 'il tuo locale';
  const message = [
    `Ciao! Benvenuto su Menu col codice.`,
    `Il menu di *${label}* è online — configuriamolo insieme da qui.`,
    `Userò il numero *${formatSignupPhone(phone)}* che hai indicato in iscrizione.`,
    '',
    promptFor(setup),
  ].join('\n');
  return {
    session: { number: phone, createdAt: Date.now(), kind: 'setup' as const, setup },
    message,
  };
}

function firstStep(flow: SetupFlow) {
  if (flow === 'logo') return 'logo';
  if (flow === 'sfondo') return 'backgroundPick';
  if (flow === 'colori') return 'viewMode';
  if (flow === 'vista') return 'viewMode';
  if (flow === 'dati') return 'name';
  if (flow === 'link' || flow === 'full') return 'search';
  return 'name';
}

function promptFor(draft: SetupDraft): string {
  switch (draft.step) {
    case 'menu':
      return setupMenuText();
    case 'search':
      return 'Come si chiama il locale e dove si trova?\nEs: *Trattoria da Mario, Salerno*\n\nCerco online (AI + Google, TripAdvisor, Pagine Gialle, social…).\nOppure incolla i *link*, o scrivi *manuale*.';
    case 'searchPick':
      return draft.searchCandidates?.length ? formatSearchPick(draft.searchCandidates) : promptFor({ ...draft, step: 'search' });
    case 'searchVerify':
      return searchVerifyPrompt(draft);
    case 'menuPreview':
      return draft.menuCandidates?.length ? onlineMenuPreviewMessage(draft) : promptFor({ ...draft, step: 'backgroundPick' });
    case 'links':
      return 'Incolla uno o più *link* del locale: sito, Google Maps, TripAdvisor, TheFork, Instagram, Facebook…\nLi uso per nome, indirizzo, telefono, social, logo e colori.\n\nOppure scrivi *nome, città* per la ricerca automatica, o *manuale*.';
    case 'name':
      return draft.flow === 'full'
        ? 'Iniziamo a configurare il locale.\n\nCome si chiama il locale?'
        : 'Come si chiama il locale?';
    case 'description':
      return 'Una breve descrizione (es. *Pizzeria e cucina napoletana*).\nScrivi *salta* se non serve.';
    case 'street':
      return 'Qual è l’indirizzo? (via e numero)\nEs: Via Roma 100';
    case 'city':
      return 'Città e CAP, se ce l’hai.\nEs: Salerno 84121\nOppure solo *Salerno*.';
    case 'phone':
      return 'Numero di telefono del locale?';
    case 'email':
      return 'Email? Se non c’è, scrivi *salta*.';
    case 'website':
      return 'Sito web del locale? Es: https://www.iltuolocale.it\n*salta* se non c’è.';
    case 'hours':
      return 'Orari di apertura?\nEs: Lun-Sab 12:00-15:00 / 19:00-23:00 — Dom chiuso';
    case 'instagram':
      return 'Instagram? Incolla il link o lo username.\n*salta* se non lo vuoi ora.';
    case 'facebook':
      return 'Facebook? Incolla il link della pagina.\n*salta* se non c\'è.';
    case 'whatsapp':
      return 'WhatsApp per i clienti (con prefisso).\n*salta* per usare lo stesso telefono del locale.';
    case 'glovo':
      return 'Link Glovo del locale? Es: https://glovoapp.com/it/...\n*salta* se non c\'è.';
    case 'deliveroo':
      return 'Link Deliveroo del locale?\n*salta* se non c\'è.';
    case 'justeat':
      return 'Link Just Eat del locale?\n*salta* se non c\'è.';
    case 'logo':
      return 'Invia ora la *foto del logo*.\n*salta* per usare il *nome* del locale come logo testo.';
    case 'background':
      return 'Invia la *foto di sfondo* della pagina principale.\n*salta* per lasciare quella attuale.';
    case 'backgroundPick':
      return 'Ti mando *5 foto* per lo sfondo della home.\nRispondi con *1*, *2*, *3*, *4* o *5*.\nPuoi anche inviarmi una tua foto, oppure *salta*.';
    case 'viewMode':
      return 'Come vuoi mostrare i piatti nel menu?\n\n1. *Elenco* — sobrio, nome e prezzo in riga (consigliato)\n2. *Carosello* — card con foto, da scorrere\n\nRispondi *1* o *2*.';
    case 'primary':
      return 'Colore principale del design?\nPuoi scrivere un esadecimale (*#0c5648*) oppure un nome: verde, rosso, blu, nero, oro, beige…';
    case 'page':
      return 'Colore di sfondo delle pagine interne?\nEs: *menta*, *panna*, *#a1cec6*.\n*salta* lo scelgo io in base al colore principale.';
    case 'confirm':
      return recap(draft);
    default:
      return setupMenuText();
  }
}

function nextAfter(draft: SetupDraft, current: string) {
  const dati = ['name', 'description', 'street', 'city', 'phone', 'email', 'website', 'hours', 'instagram', 'whatsapp', 'confirm'];
  const colori = ['viewMode', 'primary', 'confirm'];
  const vista = ['viewMode', 'confirm'];
  let chain =
    draft.flow === 'dati' ? dati
    : draft.flow === 'colori' ? colori
    : draft.flow === 'vista' ? vista
    : draft.flow === 'logo' ? ['logo', 'confirm']
    : draft.flow === 'sfondo' ? ['backgroundPick', 'confirm']
    : draft.flow === 'link' ? ['search', 'searchVerify', 'backgroundPick', 'viewMode', 'confirm']
    : ['search', 'searchVerify', 'name', 'description', 'street', 'city', 'phone', 'email', 'website', 'hours', 'instagram', 'whatsapp', 'logo', 'backgroundPick', 'viewMode', 'primary', 'page', 'confirm'];
  if (draft.palette) chain = chain.filter((step) => step !== 'primary' && step !== 'page');
  const idx = chain.indexOf(current);
  if (idx < 0) return chain[chain.length - 1];
  let next = chain[Math.min(idx + 1, chain.length - 1)];
  while (next === 'phone' && draft.phone) {
    const skipIdx = chain.indexOf(next);
    next = chain[Math.min(skipIdx + 1, chain.length - 1)];
    if (skipIdx >= chain.length - 1) break;
  }
  return next;
}

function shouldReplaceProfile(draft: SetupDraft) {
  return draft.flow === 'full' || draft.flow === 'link';
}

const DEFAULT_HOME_BACKGROUND =
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1600&q=80';

function applyDraft(draft: SetupDraft) {
  const year = new Date().getFullYear();
  const name = draft.name?.trim();
  const parsedFromStreet = draft.street ? parseItalianAddress(draft.street) : null;
  const street = parsedFromStreet?.street || draft.street || '';
  const cityLine = draft.city || parsedFromStreet?.city || '';
  const cityInfo = cityLine ? parseCityLine(cityLine) : { city: '', postalCode: '' };
  const postalCode = draft.postalCode || parsedFromStreet?.postalCode || cityInfo.postalCode || '';
  const city = cityInfo.city || parsedFromStreet?.city || '';
  const replace = shouldReplaceProfile(draft);
  const patch: Parameters<typeof patchRestaurant>[0] = {};
  if (draft.flow === 'full' || draft.flow === 'dati' || draft.flow === 'link') {
    if (replace) {
      patch.replaceProfile = true;
      patch.info = {
        name: name || '',
        menuPageTitle: name || '',
        footerText: name ? ` ${name} © ${year} ` : '',
        description: draft.description || '',
        pageDescription: draft.description || '',
        openingHours: draft.openingHours || '',
        menuShareImageUrl: '',
        address: {
          street: street || '',
          city: city || '',
          state: city || '',
          postalCode: postalCode || '',
          country: 'Italia',
        },
      };
      patch.contacts = {
        phone: draft.phone || '',
        email: draft.email || '',
        website: draft.website || '',
      };
      patch.social = {
        instagram: draft.instagram || '',
        facebook: draft.facebook || '',
        whatsapp: draft.whatsapp || '',
        glovo: usableDeliveryUrl(draft.glovo, 'glovo') || '',
        deliveroo: usableDeliveryUrl(draft.deliveroo, 'deliveroo') || '',
        justeat: usableDeliveryUrl(draft.justeat, 'justeat') || '',
      };
    } else {
      patch.info = {
        ...(name ? { name, menuPageTitle: name, footerText: ` ${name} © ${year} ` } : {}),
        ...(draft.description ? { description: draft.description, pageDescription: draft.description } : {}),
        ...(draft.openingHours ? { openingHours: draft.openingHours } : {}),
        address: {
          ...(street ? { street } : {}),
          ...(city ? { city, state: city } : {}),
          ...(postalCode ? { postalCode } : {}),
          country: 'Italia',
        },
      };
      patch.contacts = {
        ...(draft.phone ? { phone: draft.phone } : {}),
        ...(draft.email ? { email: draft.email } : {}),
        ...(draft.website ? { website: draft.website } : {}),
      };
      patch.social = {
        ...(draft.instagram ? { instagram: draft.instagram } : {}),
        ...(draft.facebook ? { facebook: draft.facebook } : {}),
        whatsapp: draft.whatsapp || '',
      };
    }
  }
  if (draft.logoUrl) {
    patch.layout = {
      ...(patch.layout || {}),
      logoType: 'image',
      logoUrl: draft.logoUrl,
      faviconUrl: draft.logoUrl,
      ...(draft.logoWidth ? { logoWidth: draft.logoWidth } : {}),
      ...(draft.logoHeight ? { logoHeight: draft.logoHeight } : {}),
    };
  } else if (draft.textLogo || replace) {
    patch.layout = {
      ...(patch.layout || {}),
      logoType: 'text',
      logoUrl: '',
      faviconUrl: '',
    };
  }
  if (draft.homeBackgroundUrl) {
    patch.layout = {
      ...(patch.layout || {}),
      homeBackgroundType: 'image',
      homeBackgroundUrl: draft.homeBackgroundUrl,
    };
  } else if (replace) {
    patch.layout = {
      ...(patch.layout || {}),
      homeBackgroundType: 'image',
      homeBackgroundUrl: DEFAULT_HOME_BACKGROUND,
    };
  }
  if (Object.keys(patch).length) patchRestaurant(patch);
  if (draft.palette) {
    applyThemePalette(draft.palette);
  } else if (draft.primaryColor) {
    applyBrandColors(draft.primaryColor, draft.pageColor);
  }
  if (draft.viewMode) applyViewMode(draft.viewMode);
}

function resolveMenuChoice(text: string): SetupFlow | null {
  const lower = text.toLowerCase().trim();
  if (['1', 'tutto', 'onboarding', 'setup', 'completo'].includes(lower)) return 'full';
  if (['2', 'dati', 'anagrafica', 'info'].includes(lower)) return 'dati';
  if (['3', 'logo'].includes(lower)) return 'logo';
  if (['4', 'sfondo', 'background'].includes(lower)) return 'sfondo';
  if (['5', 'colori', 'colore'].includes(lower)) return 'colori';
  if (['6', 'vista', 'elenco', 'carosello', 'layout'].includes(lower)) return 'vista';
  if (['7', 'link', 'links', 'sito', 'google', 'tripadvisor', 'thefork'].includes(lower)) return 'link';
  return null;
}

function instagramValue(text: string) {
  if (text.startsWith('http')) return text;
  const user = text.replace(/^@/, '').trim();
  return `https://www.instagram.com/${user}`;
}

/** Azzera i dati importati del locale (non flow/step né metadati di ricerca). */
function resetProfileFields(draft: SetupDraft) {
  delete draft.name;
  delete draft.description;
  delete draft.street;
  delete draft.city;
  delete draft.postalCode;
  delete draft.phone;
  delete draft.email;
  delete draft.website;
  delete draft.openingHours;
  delete draft.instagram;
  delete draft.facebook;
  delete draft.whatsapp;
  delete draft.glovo;
  delete draft.deliveroo;
  delete draft.justeat;
  delete draft.logoUrl;
  delete draft.textLogo;
  delete draft.logoWidth;
  delete draft.logoHeight;
  delete draft.homeBackgroundUrl;
  delete draft.primaryColor;
  delete draft.pageColor;
  delete draft.palette;
  delete draft.coverChoices;
  delete draft.viewMode;
}

/** Azzera profilo e stato di una ricerca precedente (es. cambio locale). */
function resetSearchSession(draft: SetupDraft) {
  const flow = draft.flow;
  resetProfileFields(draft);
  delete draft.searchQuery;
  delete draft.searchCandidates;
  delete draft.searchUrls;
  delete draft.searchHits;
  delete draft.searchPrefill;
  delete draft.menuCandidates;
  delete draft.menuSource;
  delete draft.menuSourceLabel;
  draft.flow = flow;
}

function normalizeDeliveryInput(text: string, kind: 'glovo' | 'deliveroo' | 'justeat') {
  const raw = text.startsWith('http') ? text.trim() : `https://${text.trim()}`;
  return usableDeliveryUrl(raw, kind);
}

function fillDraftFromProfile(draft: SetupDraft, profile: ImportedProfile) {
  if (profile.name) draft.name = profile.name;
  if (profile.description) draft.description = profile.description;
  if (profile.street) draft.street = profile.street;
  if (profile.city) draft.city = profile.city;
  if (profile.postalCode) draft.postalCode = profile.postalCode;
  if (profile.phone) draft.phone = profile.phone;
  if (profile.email) draft.email = profile.email;
  if (profile.website) draft.website = profile.website;
  if (profile.openingHours) draft.openingHours = normalizeOpeningHours(profile.openingHours);
  if (profile.instagram) draft.instagram = profile.instagram;
  if (profile.facebook) draft.facebook = profile.facebook;
  if (profile.whatsapp) draft.whatsapp = profile.whatsapp;
  if (profile.glovo) {
    const link = usableDeliveryUrl(profile.glovo, 'glovo');
    if (link) draft.glovo = link;
  }
  if (profile.deliveroo) {
    const link = usableDeliveryUrl(profile.deliveroo, 'deliveroo');
    if (link) draft.deliveroo = link;
  }
  if (profile.justeat) {
    const link = usableDeliveryUrl(profile.justeat, 'justeat');
    if (link) draft.justeat = link;
  }
  if (profile.logoUrl) draft.logoUrl = profile.logoUrl;
  if (profile.logoWidth) draft.logoWidth = profile.logoWidth;
  if (profile.logoHeight) draft.logoHeight = profile.logoHeight;
  if (profile.coverChoices && profile.coverChoices.length) draft.coverChoices = profile.coverChoices;
  if (profile.homeBackgroundUrl) draft.homeBackgroundUrl = profile.homeBackgroundUrl;
  if (profile.primaryColor) draft.primaryColor = profile.primaryColor;
  if (profile.pageColor) draft.pageColor = profile.pageColor;
  if (profile.palette) draft.palette = profile.palette;
  if (draft.flow !== 'dati' && draft.flow !== 'colori' && draft.flow !== 'logo' && draft.flow !== 'sfondo') {
    draft.flow = 'full';
  }
}

async function verifyDraftDeliveryLinks(draft: SetupDraft, notes: string[]) {
  for (const kind of ['glovo', 'deliveroo', 'justeat'] as const) {
    const url = draft[kind];
    if (!url) continue;
    if (await verifyPublicUrl(url)) continue;
    delete draft[kind];
    notes.push(`${kind}: link non raggiungibile, rimosso`);
  }
}

function profileHasData(profile: ImportedProfile, draft?: SetupDraft) {
  return Boolean(
    profile.name ||
      profile.phone ||
      profile.street ||
      profile.city ||
      profile.description ||
      profile.instagram ||
      profile.facebook ||
      profile.logoUrl ||
      profile.website ||
      profile.openingHours ||
      (draft?.name && (profile.instagram || profile.facebook || profile.website || draft.city))
  );
}

function searchSnippetLines(hits: Array<{ title: string; url: string; snippet: string; source: string }>) {
  return hits.map((hit) => `[${hit.source}] ${hit.title}\n${hit.url}\n${hit.snippet || ''}`.trim());
}

async function importUrlsIntoDraft(
  draft: SetupDraft,
  urls: string[],
  searchNotes: string[] = [],
  searchHits: Array<{ title: string; url: string; snippet: string; source: string }> = [],
  _prefill?: Partial<ImportedProfile>
) {
  resetProfileFields(draft);
  const extraUrls = searchHits.map((hit) => hit.url).filter((u) => /^https?:\/\//i.test(u));
  const profile = await importRestaurantFromUrls(urls, {
    searchSnippets: searchSnippetLines(searchHits),
    extraUrls,
    hintCity: draft.city,
  });
  fillDraftFromProfile(draft, profile);
  const notes = [...searchNotes, ...profile.notes];
  await verifyDraftDeliveryLinks(draft, notes);
  if (!draft.logoUrl) draft.textLogo = true;
  else draft.textLogo = false;
  if (!profileHasData(profile, draft)) {
    return {
      message: 'Non ho trovato abbastanza dati online. Prova altri link o scrivi *manuale*.',
      sendCovers: false,
    };
  }
  draft.step = 'searchVerify';
  return {
    message: `Ecco cosa ho trovato online.\n\n${promptFor(draft)}`,
    sendCovers: false,
  };
}

async function importLinksIntoDraft(draft: SetupDraft, text: string) {
  resetSearchSession(draft);
  const urls = extractUrls(text);
  return importUrlsIntoDraft(draft, urls);
}

async function searchRestaurantIntoDraft(draft: SetupDraft, text: string) {
  const parsed = parseNameLocation(text);
  if (!parsed.name || parsed.name.length < 2) {
    return {
      message: 'Dimmi *nome e città*, es. *Bar Centrale, Napoli*.\nOppure incolla i link, o scrivi *manuale*.',
      sendCovers: false,
    };
  }
  resetSearchSession(draft);
  draft.searchQuery = parsed.location ? `${parsed.name}, ${parsed.location}` : parsed.name;
  draft.name = parsed.name;
  if (parsed.location) draft.city = parsed.location;

  const found = await findRestaurantOnline(parsed.name, parsed.location);
  draft.searchUrls = found.urls;
  draft.searchHits = found.hits;
  if (found.prefill) draft.searchPrefill = found.prefill;

  if (!found.urls.length) {
    return {
      message: `Non ho trovato profili online verificati per *${draft.searchQuery}*.\nProva a incollare i link del locale, o scrivi *manuale*.`,
      sendCovers: false,
    };
  }

  if (shouldOfferSearchPick(found)) {
    draft.searchCandidates = found.candidates;
    draft.step = 'searchPick';
    return { message: formatSearchPick(found.candidates), sendCovers: false };
  }

  return importUrlsIntoDraft(draft, found.urls.slice(0, 6), found.notes, found.hits, found.prefill);
}

async function proceedAfterProfileVerify(draft: SetupDraft) {
  draft.step = 'backgroundPick';
  if (!draft.coverChoices || draft.coverChoices.length < 2) {
    try {
      draft.coverChoices = await Promise.race([
        prepareCoverChoices(draft.coverChoices || []),
        new Promise<string[]>((_, reject) => setTimeout(() => reject(new Error('timeout')), 25000)),
      ]);
    } catch (error) {
      console.error('prepareCoverChoices:', error);
      draft.coverChoices = draft.coverChoices || [];
    }
  }
  return { message: promptFor(draft), sendCovers: (draft.coverChoices?.length || 0) >= 2 };
}

async function tryDiscoverOnlineMenu(draft: SetupDraft) {
  try {
    const menuResult = await searchMenuOnline({
      name: draft.name || '',
      city: draft.city,
      website: draft.website,
      urls: draft.searchUrls,
      glovo: draft.glovo,
      deliveroo: draft.deliveroo,
      justeat: draft.justeat,
    });
    if (menuResult.found && menuResult.dishes.length >= 2) {
      draft.menuCandidates = menuResult.dishes;
      draft.menuSource = menuResult.sourceUrl;
      draft.menuSourceLabel = menuResult.sourceLabel;
      draft.step = 'menuPreview';
      return { message: formatOnlineMenuPreview(menuResult), sendCovers: false };
    }
    const next = await proceedAfterProfileVerify(draft);
    return {
      message: `Non ho trovato un menu completo online.\n\n${next.message}`,
      sendCovers: next.sendCovers,
    };
  } catch (error) {
    console.error('tryDiscoverOnlineMenu:', error);
    const next = await proceedAfterProfileVerify(draft);
    return {
      message: `Ricerca menu non riuscita (${error instanceof Error ? error.message : 'errore'}). Continuiamo lo stesso.\n\n${next.message}`,
      sendCovers: next.sendCovers,
    };
  }
}

async function ensureCoverChoices(draft: SetupDraft) {
  if (draft.coverChoices && draft.coverChoices.length >= 2) return;
  draft.coverChoices = await prepareCoverChoices(draft.coverChoices || []);
}

async function promptAfter(draft: SetupDraft, current: string) {
  draft.step = nextAfter(draft, current);
  let sendCovers = false;
  if (draft.step === 'backgroundPick') {
    await ensureCoverChoices(draft);
    sendCovers = true;
  }
  return { message: promptFor(draft), sendCovers };
}

export async function continueSetup(
  session: SetupSession,
  text: string,
  imageBase64?: string | null
): Promise<{ done?: boolean; message: string; session?: SetupSession; sendCovers?: boolean }> {
  if (Date.now() - session.createdAt > SETUP_MS) {
    return { done: true, message: SESSION_EXPIRED_MSG };
  }
  const draft = session.setup;
  const lower = text.toLowerCase().trim();
  session.createdAt = Date.now();

  if (!imageBase64 && ['annulla', 'anulla', 'esci', 'stop', 'basta'].includes(lower)) {
    return { done: true, message: 'Ok, lasciamo stare. Non ho cambiato niente.' };
  }

  if (!imageBase64 && hasImportableUrls(text) && !['website', 'searchVerify', 'searchPick', 'menuPreview', 'confirm', 'instagram', 'facebook', 'glovo', 'deliveroo', 'justeat'].includes(draft.step) && !draft.editReturnStep) {
    await replySetupWait(session.number);
    const imported = await importLinksIntoDraft(draft, text);
    return { session, message: imported.message, sendCovers: imported.sendCovers };
  }

  if (imageBase64 && draft.step !== 'logo' && draft.step !== 'background' && draft.step !== 'backgroundPick' && draft.step !== 'confirm') {
    return { session, message: 'Adesso mi serve un testo, non una foto. Quando ti chiedo logo o sfondo, allora inviala.' };
  }

  if (draft.step === 'menu') {
    const choice = resolveMenuChoice(text);
    if (!choice) {
      return { session, message: 'Rispondi 1-7, oppure *link*, *logo*, *sfondo*, *colori*, *vista*, *dati*.' };
    }
    draft.flow = choice;
    draft.step = firstStep(choice);
    let sendCovers = false;
    if (draft.step === 'backgroundPick') {
      await ensureCoverChoices(draft);
      sendCovers = true;
    }
    return { session, message: promptFor(draft), sendCovers };
  }

  if (draft.step === 'search') {
    if (['manuale', 'a mano', 'mano'].includes(lower) || isSkip(lower)) {
      draft.flow = 'dati';
      draft.step = 'name';
      return { session, message: promptFor(draft) };
    }
    await replySetupWait(session.number);
    const imported = hasImportableUrls(text)
      ? await importLinksIntoDraft(draft, text)
      : await searchRestaurantIntoDraft(draft, text);
    return { session, message: imported.message, sendCovers: imported.sendCovers };
  }

  if (draft.step === 'searchPick') {
    const n = Number(lower.replace(/[^\d]/g, ''));
    if (n >= 1 && n <= (draft.searchCandidates || []).length) {
      const picked = draft.searchCandidates![n - 1];
      const extra = filterCompleteRestaurantUrls(draft.searchUrls || [], draft.name || '', draft.city || '');
      const urls = Array.from(new Set([picked.url, ...extra])).slice(0, 8);
      await replySetupWait(session.number);
      const imported = await importUrlsIntoDraft(
        draft,
        urls,
        [],
        draft.searchHits ||
          draft.searchCandidates?.map((c) => ({
            title: c.label,
            url: c.url,
            snippet: c.snippet || '',
            source: c.source,
          })) ||
          [],
        draft.searchPrefill
      );
      return { session, message: imported.message, sendCovers: imported.sendCovers };
    }
    return { session, message: 'Rispondi con il *numero* del profilo giusto, oppure *annulla*.' };
  }

  if (draft.step === 'searchVerify') {
    if (isNo(lower)) {
      resetSearchSession(draft);
      draft.step = 'search';
      return { session, message: promptFor(draft) };
    }
    if (['manuale', 'a mano', 'mano'].includes(lower)) {
      draft.flow = 'dati';
      draft.step = 'name';
      delete draft.editQueue;
      delete draft.editReturnStep;
      return { session, message: promptFor(draft) };
    }
    if (isYes(lower)) {
      try {
        await reply(
          session.number,
          'Cerco un menu online (sito, delivery, Google)…\n\n⏳ Può richiedere *fino a 3 minuti*.',
          'attesa'
        );
        const next = await tryDiscoverOnlineMenu(draft);
        return { session, message: next.message, sendCovers: next.sendCovers };
      } catch (error) {
        console.error('searchVerify menu search:', error);
        const next = await proceedAfterProfileVerify(draft);
        return {
          session,
          message: `Errore nella ricerca menu. Continuiamo lo stesso.\n\n${next.message}`,
          sendCovers: next.sendCovers,
        };
      }
    }
    const picks = parseEditPicks(text);
    if (picks.length) {
      draft.editQueue = picks;
      draft.editReturnStep = 'searchVerify';
      draft.step = picks[0];
      const labels = REVIEW_EDIT_OPTIONS.filter((opt) => picks.includes(opt.step)).map((opt) => opt.n).join(', ');
      return {
        session,
        message: `Ok, modifichiamo: *${labels}*.\n\n${promptFor(draft)}`,
      };
    }
    return {
      session,
      message: 'Scrivi i numeri da modificare (es. *1, 5, 9*), *sì* se va bene, *no* per cercare di nuovo, *manuale* per inserire a mano.',
    };
  }

  if (draft.step === 'menuPreview') {
    const existingCount = loadProducts().length;
    if (isNo(lower) || isSkip(lower)) {
      delete draft.menuCandidates;
      delete draft.menuSource;
      delete draft.menuSourceLabel;
      const next = await proceedAfterProfileVerify(draft);
      return { session, message: next.message, sendCovers: next.sendCovers };
    }

    let mode: 'add' | 'replace' | null = null;
    if (isReplaceMenu(lower)) mode = 'replace';
    else if (isAddMenu(lower)) mode = 'add';
    else if (isYes(lower)) mode = existingCount > 0 ? null : 'add';

    if (!mode) {
      return {
        session,
        message: existingCount > 0 ? menuImportChoicePrompt(existingCount) : 'Scrivi *sì* per importare il menu online, *no* per saltare.',
      };
    }

    const products = draft.menuCandidates || [];
    const replacedCount = mode === 'replace' ? existingCount : 0;
    delete draft.menuCandidates;
    const sourceLabel = draft.menuSourceLabel || 'web';
    delete draft.menuSource;
    delete draft.menuSourceLabel;
    try {
      await reply(session.number, 'Scarico le foto dei piatti trovate online…');
      await hydrateMenuImages(products);
      const added = importProducts(
        products.map((item) => ({
          name: item.name,
          category: item.category,
          price: item.price,
          ingredients: item.ingredients,
          description: item.description,
          allergens: item.allergens,
          imageUrl: item.imageUrl || '',
        })),
        mode
      );
      const withPhoto = added.filter((p) => p.imageUrl).length;
      const next = await proceedAfterProfileVerify(draft);
      const modeLine =
        mode === 'replace'
          ? `Ho *sostituito* i ${replacedCount} piatti precedenti con *${added.length}* nuovi da ${sourceLabel}`
          : `Ho *aggiunto* *${added.length}* piatti da ${sourceLabel}${existingCount ? ` (restano anche i ${existingCount} precedenti)` : ''}`;
      return {
        session,
        message: `${modeLine}${withPhoto ? ` (${withPhoto} con foto)` : ''}.\n\n${next.message}`,
        sendCovers: next.sendCovers,
      };
    } catch (error) {
      const next = await proceedAfterProfileVerify(draft);
      const err =
        error instanceof PlanLimitError
          ? error.message
          : 'Non sono riuscito a importare il menu. Continuiamo la configurazione del locale.';
      return { session, message: `${err}\n\n${next.message}`, sendCovers: next.sendCovers };
    }
  }

  if (draft.step === 'links') {
    if (['manuale', 'a mano', 'mano'].includes(lower) || isSkip(lower)) {
      draft.flow = 'dati';
      draft.step = 'name';
      return { session, message: promptFor(draft) };
    }
    await replySetupWait(session.number);
    const imported = await importLinksIntoDraft(draft, text);
    return { session, message: imported.message, sendCovers: imported.sendCovers };
  }

  if (imageBase64 && (draft.step === 'logo' || draft.step === 'background' || draft.step === 'backgroundPick' || draft.step === 'confirm')) {
    try {
      const kind = draft.step === 'logo' ? 'logo' : 'background';
      const saved = await processBrandImageFromBase64(imageBase64, kind);
      if (kind === 'logo') {
        draft.logoUrl = saved.url;
        delete draft.textLogo;
        const fit = fitLogoSize(saved.width, saved.height);
        draft.logoWidth = fit.logoWidth;
        draft.logoHeight = fit.logoHeight;
      } else draft.homeBackgroundUrl = saved.url;
      if (draft.flow === 'logo' || draft.flow === 'sfondo' || kind === 'background') {
        draft.step = 'confirm';
        return { session, message: `Foto ricevuta.\n\n${recap(draft)}` };
      }
      const next = await promptAfter(draft, 'logo');
      return { session, message: `Foto ricevuta.\n\n${next.message}`, sendCovers: next.sendCovers };
    } catch {
      return { session, message: 'Non sono riuscito a salvare l’immagine. Inviarla di nuovo, oppure *salta*.' };
    }
  }

  if (draft.step === 'backgroundPick') {
    if (isSkip(lower)) {
      draft.step = nextAfter(draft, 'backgroundPick');
      return { session, message: promptFor(draft) };
    }
    const n = Number(lower.replace(/[^\d]/g, ''));
    if (n >= 1 && n <= (draft.coverChoices || []).length) {
      draft.homeBackgroundUrl = draft.coverChoices![n - 1];
      draft.step = nextAfter(draft, 'backgroundPick');
      return { session, message: `Ho scelto lo sfondo *${n}*.\n\n${promptFor(draft)}` };
    }
    return { session, message: 'Rispondi *1*, *2*, *3*, *4* o *5*, invia una tua foto, oppure *salta*.' };
  }

  if (draft.step === 'logo' || draft.step === 'background') {
    if (!isSkip(lower)) {
      return { session, message: 'Invia la foto, oppure scrivi *salta*.' };
    }
    if (draft.step === 'logo') {
      draft.textLogo = true;
      delete draft.logoUrl;
      delete draft.logoWidth;
      delete draft.logoHeight;
    }
    const next = await promptAfter(draft, draft.step);
    return { session, message: next.message, sendCovers: next.sendCovers };
  }

  if (draft.step === 'name') {
    if (text.length < 2) return { session, message: 'Dimmi il nome del locale, es. *Trattoria da Mario*.' };
    draft.name = text;
    const next = await finishFieldStep(draft, 'name');
    return { session, message: next.message, sendCovers: next.sendCovers };
  }

  if (draft.step === 'description') {
    if (!isSkip(lower)) draft.description = text;
    const next = await finishFieldStep(draft, 'description');
    return { session, message: next.message, sendCovers: next.sendCovers };
  }

  if (draft.step === 'street') {
    if (text.length < 3) return { session, message: 'Scrivi via e numero, es. Via Roma 100' };
    draft.street = text;
    const next = await finishFieldStep(draft, 'street');
    return { session, message: next.message, sendCovers: next.sendCovers };
  }

  if (draft.step === 'city') {
    const parsed = parseCityLine(text);
    if (!parsed.city) return { session, message: 'Scrivi la città, es. Salerno oppure Salerno 84121' };
    draft.city = parsed.city;
    draft.postalCode = parsed.postalCode;
    const next = await finishFieldStep(draft, 'city');
    return { session, message: next.message, sendCovers: next.sendCovers };
  }

  if (draft.step === 'phone') {
    draft.phone = normalizePhone(text);
    if (draft.phone.replace(/\D/g, '').length < 8) {
      return { session, message: 'Non mi sembra un numero. Es: 089 1234567 oppure +39 089 1234567' };
    }
    const next = await finishFieldStep(draft, 'phone');
    return { session, message: next.message, sendCovers: next.sendCovers };
  }

  if (draft.step === 'email') {
    if (!isSkip(lower)) {
      if (!text.includes('@')) return { session, message: 'Inserisci un’email valida, o *salta*.' };
      draft.email = text.trim();
    }
    const next = await finishFieldStep(draft, 'email');
    return { session, message: next.message, sendCovers: next.sendCovers };
  }

  if (draft.step === 'website') {
    if (!isSkip(lower)) {
      draft.website = text.startsWith('http') ? text.trim() : `https://${text.trim()}`;
    }
    const next = await finishFieldStep(draft, 'website');
    return { session, message: next.message, sendCovers: next.sendCovers };
  }

  if (draft.step === 'hours') {
    if (text.length < 3) return { session, message: 'Scrivi gli orari, oppure *sempre aperti 12-15 e 19-23*.' };
    let source = text;
    if (!parsesAsStructuredOpeningHours(text)) {
      const ai = await normalizeOpeningHoursWithAI(text);
      if (ai && parsesAsStructuredOpeningHours(ai)) source = ai;
    }
    draft.openingHours = normalizeOpeningHours(source);
    const next = await finishFieldStep(draft, 'hours');
    return { session, message: next.message, sendCovers: next.sendCovers };
  }

  if (draft.step === 'instagram') {
    if (!isSkip(lower)) draft.instagram = instagramValue(text);
    const next = await finishFieldStep(draft, 'instagram');
    return { session, message: next.message, sendCovers: next.sendCovers };
  }

  if (draft.step === 'facebook') {
    if (!isSkip(lower)) {
      draft.facebook = text.startsWith('http') ? text.trim() : `https://www.facebook.com/${text.trim()}`;
    }
    const next = await finishFieldStep(draft, 'facebook');
    return { session, message: next.message, sendCovers: next.sendCovers };
  }

  if (draft.step === 'whatsapp') {
    if (!isSkip(lower)) draft.whatsapp = normalizePhone(text);
    const next = await finishFieldStep(draft, 'whatsapp');
    return { session, message: next.message, sendCovers: next.sendCovers };
  }

  if (draft.step === 'glovo') {
    if (!isSkip(lower)) {
      const link = normalizeDeliveryInput(text, 'glovo');
      if (!link) return { session, message: 'Link Glovo non valido. Incolla la pagina del locale su glovoapp.com, es. https://glovoapp.com/it/it/salerno/nome-locale' };
      draft.glovo = link;
    }
    const next = await finishFieldStep(draft, 'glovo');
    return { session, message: next.message, sendCovers: next.sendCovers };
  }

  if (draft.step === 'deliveroo') {
    if (!isSkip(lower)) {
      const link = normalizeDeliveryInput(text, 'deliveroo');
      if (!link) return { session, message: 'Link Deliveroo non valido. Incolla la pagina menu del locale, es. https://deliveroo.it/menu/citta/nome-locale' };
      draft.deliveroo = link;
    }
    const next = await finishFieldStep(draft, 'deliveroo');
    return { session, message: next.message, sendCovers: next.sendCovers };
  }

  if (draft.step === 'justeat') {
    if (!isSkip(lower)) {
      const link = normalizeDeliveryInput(text, 'justeat');
      if (!link) return { session, message: 'Link Just Eat non valido. Incolla la pagina del locale, es. https://www.justeat.it/restaurants-nome-locale' };
      draft.justeat = link;
    }
    const next = await finishFieldStep(draft, 'justeat');
    return { session, message: next.message, sendCovers: next.sendCovers };
  }

  if (draft.step === 'viewMode') {
    const mode = parseViewMode(text);
    if (!mode) {
      return { session, message: 'Rispondi *1* (elenco sobrio) oppure *2* (carosello).' };
    }
    draft.viewMode = mode;
    draft.step = nextAfter(draft, 'viewMode');
    return {
      session,
      message: `Vista: *${mode === 'list' ? 'elenco sobrio' : 'carosello'}*.\n\n${promptFor(draft)}`,
    };
  }

  if (draft.step === 'primary') {
    const color = parseColor(text);
    if (!color) {
      return { session, message: 'Non ho capito il colore. Prova *#0c5648* oppure *verde*, *rosso*, *blu*, *oro*, *beige*.' };
    }
    draft.primaryColor = color;
    draft.step = nextAfter(draft, 'primary');
    return { session, message: `Colore principale: *${color}*.\n\n${promptFor(draft)}` };
  }

  if (draft.step === 'page') {
    if (!isSkip(lower)) {
      const color = parseColor(text);
      if (!color) return { session, message: 'Colore non valido. Es: *panna*, *menta*, *#f4efe6*, oppure *salta*.' };
      draft.pageColor = color;
    }
    draft.step = nextAfter(draft, 'page');
    return { session, message: promptFor(draft) };
  }

  if (draft.step === 'confirm') {
    if (isNo(lower)) {
      return { done: true, message: 'Ok, non ho cambiato nulla. Scrivi *setup* quando vuoi riprovare.' };
    }
    if (!isYes(lower)) {
      return { session, message: 'Scrivi *sì* per applicare, o *no* per annullare.' };
    }
    applyDraft(draft);
    return {
      done: true,
      message: 'Fatto! Dati, grafica e logo sono aggiornati sul menu.\nRicarica la pagina del locale per vederli.\n\nVuoi ritoccare qualcosa? *logo*, *sfondo*, *colori*, *dati*.',
    };
  }

  return { session, message: promptFor(draft) };
}

export async function handleSetupShortcut(number: string, text: string): Promise<{ session: SetupSession; message: string; sendCovers?: boolean } | null> {
  const lower = text.toLowerCase().trim();
  const vistaDirect = lower.match(
    /^(?:(?:cambia|imposta|metti)\s+(?:il|la|i|gli)?\s*)?(vista|layout)\s+(?:in|a|su)?\s*(elenco|lista|list|carosello|carousel)$/
  );
  if (vistaDirect) {
    const mode = parseViewMode(vistaDirect[2]);
    if (!mode) {
      await reply(number, 'Scrivi *vista elenco* oppure *vista carosello*.');
      return null;
    }
    applyViewMode(mode);
    await reply(number, `Ho impostato la vista *${mode === 'list' ? 'elenco sobrio' : 'carosello'}*. Ricarica il menu per vederla.`);
    return null;
  }
  if (lower === 'elenco') {
    applyViewMode('list');
    await reply(number, 'Ho impostato la vista *elenco sobrio*. Ricarica il menu per vederla.');
    return null;
  }
  if (lower === 'carosello') {
    applyViewMode('carousel');
    await reply(number, 'Ho impostato la vista *carosello*. Ricarica il menu per vederla.');
    return null;
  }
  const colorDirect = lower.match(
    /^(?:(?:cambia|imposta|metti)\s+(?:il|la|i|gli)?\s*)?(colore|colori)\s+(?:in|a|su)?\s*(.+)$/
  );
  if (colorDirect) {
    const color = parseColor(colorDirect[2]);
    if (!color) {
      await reply(number, 'Colore non valido. Es: *colore verde* oppure *colore #0c5648*.');
      return null;
    }
    applyBrandColors(color);
    await reply(number, `Ho armonizzato tutto il tema sul colore *${color}* (navbar, sidebar, card, testi e footer).`);
    return null;
  }

  const INFO_FIELD_MAP: Record<string, { field: 'phone' | 'email' | 'street' | 'website' | 'instagram' | 'facebook' | 'description' | 'hours'; label: string }> = {
    telefono: { field: 'phone', label: 'Telefono' },
    tel: { field: 'phone', label: 'Telefono' },
    email: { field: 'email', label: 'Email' },
    mail: { field: 'email', label: 'Email' },
    indirizzo: { field: 'street', label: 'Indirizzo' },
    via: { field: 'street', label: 'Indirizzo' },
    sito: { field: 'website', label: 'Sito' },
    website: { field: 'website', label: 'Sito' },
    instagram: { field: 'instagram', label: 'Instagram' },
    ig: { field: 'instagram', label: 'Instagram' },
    facebook: { field: 'facebook', label: 'Facebook' },
    fb: { field: 'facebook', label: 'Facebook' },
    descrizione: { field: 'description', label: 'Descrizione' },
    orari: { field: 'hours', label: 'Orari' },
    orario: { field: 'hours', label: 'Orari' },
  };
  const infoDirect = text.match(
    /^(?:(?:cambia|imposta|metti)\s+(?:il|la|i|gli)?\s*)?(telefono|tel|email|mail|indirizzo|via|sito|website|instagram|ig|facebook|fb|descrizione|orari|orario)\s*(?::\s*|\s+(?:in|a|su)\s+|\s+)(.+)$/i
  );
  if (infoDirect) {
    const entry = INFO_FIELD_MAP[infoDirect[1].toLowerCase()];
    const value = infoDirect[2].trim();
    if (entry && value) {
      if (entry.field === 'hours') {
        let source = value;
        if (!parsesAsStructuredOpeningHours(value)) {
          const ai = await normalizeOpeningHoursWithAI(value);
          if (ai && parsesAsStructuredOpeningHours(ai)) source = ai;
        }
        const hours = normalizeOpeningHours(source);
        patchRestaurant({ info: { openingHours: hours } });
        await reply(number, `Orari aggiornati:\n${formatOpeningHoursDisplay(hours)}`);
        return null;
      }
      if (entry.field === 'street') {
        patchRestaurant({ info: { address: { street: value } } });
      } else if (entry.field === 'description') {
        patchRestaurant({ info: { description: value, pageDescription: value } });
      } else if (entry.field === 'phone' || entry.field === 'email' || entry.field === 'website') {
        patchRestaurant({ contacts: { [entry.field]: value } });
      } else {
        patchRestaurant({ social: { [entry.field]: value } });
      }
      await reply(number, `${entry.label} aggiornato: *${value}*.`);
      return null;
    }
  }
  const cmd = lower.split(/\s+/)[0];
  if (
    ['setup', 'onboarding', 'configura', 'configurazione'].includes(cmd) &&
    hasImportableUrls(text)
  ) {
    return startLinkImport(number, text);
  }
  if (['setup', 'onboarding', 'configura', 'configurazione'].includes(lower)) {
    return startSetupSession(number, 'full');
  }
  if (cmd.startsWith('http') || cmd.startsWith('www')) {
    return startLinkImport(number, text);
  }
  if (['link', 'links', 'sito'].includes(cmd) || (cmd === 'importa' && hasImportableUrls(text))) {
    if (hasImportableUrls(text)) {
      return startLinkImport(number, text);
    }
    return startSetupSession(number, 'link');
  }
  if (cmd === 'importa' && !hasImportableUrls(text)) {
    return startSetupSession(number, 'link');
  }
  if (['locale', 'grafica', 'design'].includes(lower)) {
    return startSetupSession(number, 'menu');
  }
  if (lower === 'dati') return startSetupSession(number, 'dati');
  if (lower === 'logo') return startSetupSession(number, 'logo');
  if (lower === 'sfondo') {
    const started = startSetupSession(number, 'sfondo');
    await ensureCoverChoices(started.session.setup);
    started.message = promptFor(started.session.setup);
    return { ...started, sendCovers: true };
  }
  if (lower === 'colori' || lower === 'colore') return startSetupSession(number, 'colori');
  if (lower === 'vista' || lower === 'layout') return startSetupSession(number, 'vista');
  return startSetupSession(number, 'menu');
}
