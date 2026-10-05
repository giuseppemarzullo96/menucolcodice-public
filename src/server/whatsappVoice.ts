import { loadIntegrations } from './integrations';
import { recordAiUsage } from './aiUsageStore';
import { currentTenant } from './tenant';
import { openaiJson, extractJson } from './aiClient';

/** Prompt Whisper: chiedi solo il comando, senza esitazioni. */
const WHISPER_PROMPT =
  'Trascrivi in italiano solo il comando per il menu del ristorante. Ignora esitazioni, intercalari (ehm, allora, cioè) e correzioni a metà frase: tieni l’intenzione finale. Esempi: finito carbonara; aggiungi tagliata ventiquattro euro; prezzo margherita nove cinquanta.';

const FILLERS = [
  'ehm',
  'ehmm',
  'mmm',
  'mh',
  'mhm',
  'hmm',
  'uhm',
  'uh',
  'ah',
  'oh',
  'eh',
  'boh',
  'mah',
  'beh',
  'cioè',
  'cioe',
  'tipo',
  'diciamo',
  'praticamente',
  'allora',
  'quindi',
  'comunque',
  'insomma',
  'vabbè',
  'vabbe',
  'vabbene',
  'guarda',
  'senti',
  'ascolta',
  'vedi',
  'ecco',
  'eccomi',
  'niente',
  'un attimo',
  'un momento',
  'aspetta un attimo',
  'aspetta',
];

export const COMMAND_STARTS = [
  'aggiungi',
  'nuovo piatto',
  'aggiungi piatto',
  'voglio aggiungere',
  'prezzo',
  'finito',
  'esaurito',
  'finita',
  'non c’è',
  "non c'è",
  'terminato',
  'manca',
  'torna',
  'disponibile',
  'di nuovo',
  'c’è',
  "c'è",
  'lista',
  'cerca',
  'modifica',
  'elimina',
  'cancella',
  'foto',
  'copia',
  'modello 3d',
  'modello3d',
  'sposta',
  'aumenta',
  'riduci',
  'consiglia',
  'non consigliato',
  'imposta',
  'categorie',
  'categoria',
  'aggiungi categoria',
  'modifica categoria',
  'rinomina categoria',
  'rinomina',
  'descrizione categoria',
  'ordine categoria',
  'icona categoria',
  'elimina categoria',
  'nascondi',
  'mostra',
  'configura',
  'setup',
  'locale',
  'dati',
  'logo',
  'sfondo',
  'colori',
  'colore',
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
  'elenco',
  'carosello',
  'vista',
  'statistiche',
  'link',
  'qr',
  'aiuto',
  'help',
  'comandi',
  'tutto',
  'messaggio fisso',
  'fissa messaggio',
  'nuovo codice accesso',
  'rigenera codice',
  'nuovo codice',
  'ciao',
  'buongiorno',
  'salve',
  'annulla',
  'sì',
  'si',
  'ok',
  'no',
];

const CORRECTION_SPLIT =
  /\b(?:anzi|volevo dire|volevo dirti|no aspetta|no[,:]|aspetta[,:]?)\s+/gi;

function hasCorrectionMarker(text: string) {
  return /\b(?:anzi|volevo dire|volevo dirti|no aspetta)\b/i.test(text);
}

export type VoiceTranscript = {
  raw: string;
  cleaned: string;
  needsConfirm: boolean;
};

function collapseSpaces(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

/** Se a metà frase corregge, tieni la parte dopo l’ultimo «anzi / volevo dire / no aspetta». */
export function preferLastCorrection(text: string): string {
  const raw = collapseSpaces(text);
  if (!raw) return '';
  const parts = raw.split(CORRECTION_SPLIT).map((p) => collapseSpaces(p)).filter(Boolean);
  if (parts.length <= 1) return raw;
  const last = parts[parts.length - 1];
  return last.length >= 3 ? last : raw;
}

export function stripVoiceFillers(text: string): string {
  let out = collapseSpaces(text)
    .replace(/[…]+/g, ' ')
    .replace(/\s*[.,;:!?]+$/g, '');

  const patterns = FILLERS.map((f) => f.replace(/\s+/g, '\\s+')).sort((a, b) => b.length - a.length);
  for (let pass = 0; pass < 2; pass += 1) {
    for (const pat of patterns) {
      out = out.replace(new RegExp(`(?:^|\\s)${pat}(?=\\s|$)`, 'gi'), ' ');
    }
    out = collapseSpaces(out);
  }

  return out.replace(/^[,.;:\-–—]+\s*/, '').replace(/\s+[,.;:\-–—]+$/, '');
}

export function cleanVoiceTranscript(raw: string): string {
  return stripVoiceFillers(preferLastCorrection(String(raw || '')));
}

export function startsWithCommand(text: string): boolean {
  const lower = text.toLowerCase();
  return COMMAND_STARTS.some((cmd) => lower === cmd || lower.startsWith(`${cmd} `) || lower.startsWith(`${cmd},`));
}

function wordCount(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Conferma solo se lungo/ambiguo: tanti pezzi, correzioni, o senza verbo comando chiaro.
 */
export function voiceNeedsConfirm(cleaned: string, raw: string): boolean {
  const c = collapseSpaces(cleaned);
  if (!c) return false;
  // Correzione a metà frase: meglio chiedere, anche se il risultato finale è corto
  if (hasCorrectionMarker(raw)) return true;
  if (wordCount(c) <= 4 && startsWithCommand(c)) return false;
  if (wordCount(c) >= 12 || c.length >= 90) return true;
  if (!startsWithCommand(c) && wordCount(c) >= 5) return true;
  if (wordCount(c) >= 8) return true;
  return false;
}

/** Grammatica di riferimento condivisa fra normalizeVoiceCommand e
 * splitMultiCommandMessage: tenerla in sync con i comandi veri gestiti in
 * handleSingleWhatsAppCommand (whatsappCommands.ts) e con l'help (whatsappHelp.ts) —
 * un comando mancante qui vuol dire che l'AI non lo riconosce mai, anche se il
 * parser a regex lo capirebbe benissimo. */
const CANONICAL_COMMANDS_GRAMMAR = `- prezzo <piatto> <numero con la virgola, es 9,50>
- finito <piatto>
- finito <piatto> oggi
- torna <piatto>
- consiglia <piatto>[, <piatto2>, <piatto3>...] (accetta più piatti separati da virgola)
- non consigliato <piatto>[, <piatto2>, <piatto3>...] (accetta più piatti separati da virgola)
- elimina <piatto>
- foto <piatto>
- copia <piatto>
- modello 3d <piatto> (avvia la raccolta foto per generare un modello 3D del piatto, solo piano Pro)
- sposta <piatto> in categoria <nuova categoria> (cambia la categoria di un piatto)
- cerca <termine>
- lista
- lista <categoria>
- modifica <piatto>
- aumenta prezzi <numero>%
- riduci prezzi <numero>%
- categorie (elenco categorie)
- aggiungi categoria <nome>
- modifica categoria <nome>
- rinomina categoria <nome attuale> | <nuovo nome>
- descrizione categoria <nome> | <descrizione>
- ordine categoria <nome> <numero posizione>
- icona categoria <nome> <icona: pizza, pesce, torta, bevande, pasta, hamburger>
- elimina categoria <nome>
- nascondi <categoria> (nasconde quella categoria dal menu, es. stagionale)
- mostra <categoria> (rimostra quella categoria)
- annulla ultima
- statistiche
- vista elenco (come si vedono i piatti sul menu online: elenco sobrio)
- vista carosello (come si vedono i piatti sul menu online: carosello)
- colore <nome colore o #esadecimale>
- telefono <numero>
- email <indirizzo email>
- indirizzo <via e numero civico>
- orari <descrizione orari del locale, non i piatti>
- sito <url del sito web>
- instagram <handle o url>
- facebook <handle o url>
- descrizione <descrizione del locale>
- dati (avvia la modifica dei dati del locale: nome, indirizzo, orari, contatti)
- logo (avvia il caricamento del logo)
- sfondo (avvia la scelta dello sfondo della home)
- configura (avvia la configurazione guidata del locale, anche: setup)
- link (manda il link del menu online)
- qr (manda il link e il QR code del menu)
- aiuto (elenco comandi, anche: help, comandi)
- comandi piatti (elenco comandi per gestire i piatti)
- comandi categorie (elenco comandi per gestire le categorie)
- comandi grafica (elenco comandi per logo, colori, sfondo, vista)
- comandi sicurezza (elenco comandi per il codice di accesso al pannello admin)
- comandi statistiche (elenco comandi per statistiche, annulla ultima, messaggio fisso)
- messaggio fisso (manda il messaggio con l'elenco comandi da fissare in cima alla chat)
- nuovo codice accesso (rigenera il codice di accesso al pannello admin, chiede conferma)`;

const NORMALIZER_SYSTEM_PROMPT = `Sei un traduttore di comandi vocali per un gestionale menu ristorante via WhatsApp, in italiano.
Ricevi una frase pronunciata a voce (già trascritta e ripulita) e la traduci in UNO dei comandi canonici sotto, nella sintassi esatta.
Non inventare né correggere nomi di piatti, categorie o termini di ricerca: usa esattamente le parole della frase.
Se la frase parla di una categoria (sezione del menu, es. antipasti/primi/pizze), preferisci i comandi "... categoria" a quelli per un piatto.
Se la frase non corrisponde con sicurezza a nessun comando, rispondi con command null.

Comandi canonici (sostituisci <...> con i valori della frase):
${CANONICAL_COMMANDS_GRAMMAR}

Rispondi SOLO con JSON: {"command": "<comando canonico esatto>"} oppure {"command": null}.

Esempi:
Frase: "volevo cambiare il prezzo della carbonara portandolo a nove euro e cinquanta"
{"command": "prezzo carbonara 9,50"}

Frase: "segna la margherita come consigliata"
{"command": "consiglia margherita"}

Frase: "togli la margherita dai consigliati"
{"command": "non consigliato margherita"}

Frase: "la tagliata oggi è finita ma da domani c'è di nuovo"
{"command": "finito tagliata oggi"}

Frase: "voglio aggiungere una categoria nuova per gli antipasti"
{"command": "aggiungi categoria antipasti"}

Frase: "metti lampu, caffoncello e pineta come piatti consigliati"
{"command": "consiglia lampu, caffoncello, pineta"}

Frase: "sposta l'insalatina nella categoria cocktails"
{"command": "sposta insalatina in categoria cocktails"}

Frase: "cambia la vista in elenco"
{"command": "vista elenco"}

Frase: "nascondi la categoria dei gelati, è finita la stagione"
{"command": "nascondi gelati"}

Frase: "cambia il numero di telefono in 0891234567"
{"command": "telefono 0891234567"}

Frase: "aggiorna l'indirizzo, ora siamo in via Roma 15"
{"command": "indirizzo via Roma 15"}

Frase: "come sono andate le visite al menu ultimamente"
{"command": "statistiche"}

Frase: "come va oggi il locale"
{"command": null}`;

/**
 * Traduce una frase vocale lunga/naturale in un comando canonico preciso, usando un LLM.
 * Chiamata solo per frasi che il parser a regex non riconoscerebbe as-is (vedi voiceNeedsConfirm).
 * Ritorna null se non c'è una chiave OpenAI, se il modello non è sicuro, o se la chiamata fallisce:
 * in quel caso chi chiama ricade sul testo grezzo (comportamento precedente, nessuna regressione).
 */
export async function normalizeVoiceCommand(cleaned: string): Promise<string | null> {
  const cfg = loadIntegrations();
  if (!cfg.openai.apiKey) return null;
  try {
    const raw = await openaiJson(
      [
        { role: 'system', content: NORMALIZER_SYSTEM_PROMPT },
        { role: 'user', content: cleaned },
      ],
      { timeoutMs: 12000, temperature: 0 }
    );
    const parsed = extractJson(raw);
    const command = typeof parsed?.command === 'string' ? parsed.command.trim() : null;
    if (!command) return null;
    try {
      recordAiUsage({ slug: currentTenant().slug, kind: 'openai', provider: 'openai', model: cfg.openai.model || 'gpt-4o-mini' });
    } catch {
      /* ignore */
    }
    return command;
  } catch {
    return null;
  }
}

const MULTI_COMMAND_SYSTEM_PROMPT = `Sei un traduttore di comandi per un gestionale menu ristorante via WhatsApp, in italiano.
Il messaggio dell'utente può contenere PIÙ comandi in una frase sola (es. "prezzo carbonara 9,50 e finito margherita").
Dividilo in una lista di comandi canonici separati, uno per ogni azione richiesta, nell'ordine in cui compaiono nel messaggio.
Non inventare né correggere nomi di piatti, categorie o termini di ricerca: usa esattamente le parole del messaggio.
Se la frase parla di una categoria (sezione del menu, es. antipasti/primi/pizze), preferisci i comandi "... categoria" a quelli per un piatto.
Se il messaggio contiene UN SOLO comando (non multiplo), o non è chiaro, rispondi con commands: [].

Comandi canonici (sostituisci <...> con i valori del messaggio):
${CANONICAL_COMMANDS_GRAMMAR}

Rispondi SOLO con JSON: {"commands": ["<comando1>", "<comando2>", ...]}.

Esempi:
Messaggio: "prezzo carbonara 9,50 e finito margherita"
{"commands": ["prezzo carbonara 9,50", "finito margherita"]}

Messaggio: "segna la margherita come consigliata e cambia la foto della carbonara"
{"commands": ["consiglia margherita", "foto carbonara"]}

Messaggio: "prezzo carbonara nove cinquanta"
{"commands": []}

Messaggio: "come va oggi"
{"commands": []}`;

/**
 * Euristica economica (nessuna chiamata AI) per decidere se vale la pena provare
 * splitMultiCommandMessage: il messaggio, spezzato sui separatori comuni, deve
 * contenere almeno due pezzi che iniziano ciascuno con una parola-comando nota.
 * Evita di chiamare l'LLM su ogni messaggio normale a comando singolo.
 */
export function looksLikeMultipleCommands(text: string): boolean {
  const pieces = String(text || '')
    .split(/[;\n]|(?:,|\se\s)(?=\s*[a-zà-ÿ])/i)
    .map((p) => p.trim())
    .filter(Boolean);
  if (pieces.length < 2) return false;
  const matches = pieces.filter((p) => startsWithCommand(p)).length;
  return matches >= 2;
}

/**
 * Se un messaggio contiene più comandi in una frase sola (es. "prezzo carbonara
 * 9,50 e finito margherita"), li divide in una lista di comandi canonici da
 * eseguire in sequenza. Il parser a regex in whatsappCommands.ts gestisce solo
 * un comando per messaggio, quindi senza questo passaggio il secondo comando
 * verrebbe silenziosamente ignorato (o l'intero messaggio fallirebbe).
 * Ritorna null se manca la chiave OpenAI, la chiamata fallisce, o il modello
 * non trova comandi multipli chiari (un solo elemento non basta: in quel caso
 * chi chiama deve ricadere sul parser normale con il testo originale).
 */
export async function splitMultiCommandMessage(raw: string): Promise<string[] | null> {
  const cfg = loadIntegrations();
  if (!cfg.openai.apiKey) return null;
  try {
    const res = await openaiJson(
      [
        { role: 'system', content: MULTI_COMMAND_SYSTEM_PROMPT },
        { role: 'user', content: raw },
      ],
      { timeoutMs: 12000, temperature: 0 }
    );
    const parsed = extractJson(res);
    const commands = Array.isArray(parsed?.commands)
      ? parsed.commands.filter((c: unknown): c is string => typeof c === 'string' && c.trim().length > 0).map((c: string) => c.trim())
      : [];
    if (commands.length < 2) return null;
    try {
      recordAiUsage({ slug: currentTenant().slug, kind: 'openai', provider: 'openai', model: cfg.openai.model || 'gpt-4o-mini' });
    } catch {
      /* ignore */
    }
    return commands;
  } catch {
    return null;
  }
}

export async function transcribeWhatsAppAudio(
  audioBase64: string,
  mime = 'audio/ogg'
): Promise<VoiceTranscript> {
  const cfg = loadIntegrations();
  if (!cfg.openai.apiKey) {
    throw new Error('Per i messaggi vocali serve la chiave OpenAI (tab Scansiona menu / AI).');
  }
  const bytes = Buffer.from(String(audioBase64).replace(/^data:[^;]+;base64,/, ''), 'base64');
  const form = new FormData();
  const ext = mime.includes('mpeg') || mime.includes('mp3') ? 'mp3' : mime.includes('mp4') || mime.includes('m4a') ? 'm4a' : 'ogg';
  form.append('file', new Blob([bytes], { type: mime }), `voice.${ext}`);
  form.append('model', 'whisper-1');
  form.append('language', 'it');
  form.append('prompt', WHISPER_PROMPT);

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.openai.apiKey}`,
    },
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error?.message || `Whisper ${res.status}`);
  }
  const raw = String(json.text || '').trim();
  if (!raw) throw new Error('Non ho capito il vocale. Riprova parlando più vicino al telefono.');
  try {
    recordAiUsage({
      slug: currentTenant().slug,
      kind: 'whisper',
      provider: 'openai',
      model: 'whisper-1',
    });
  } catch {
    /* ignore */
  }
  const cleaned = cleanVoiceTranscript(raw) || raw;
  return {
    raw,
    cleaned,
    needsConfirm: voiceNeedsConfirm(cleaned, raw),
  };
}
