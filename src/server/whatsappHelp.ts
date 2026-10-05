import { currentRestaurant } from './restaurantStore';
import { currentTenant } from './tenant';

/** Un'unica formulazione condivisa: whatsappCommands.ts e whatsappSetup.ts avevano
 * due testi diversi per lo stesso concetto ("sessione scaduta"). */
export const SESSION_EXPIRED_MSG =
  'Non ci sentiamo da un po’, ho chiuso quello che stavamo facendo. Scrivi il comando che stavi usando per riprendere (es. *aggiungi*, *modifica*, *elimina*, *categoria*, *configura*).';

export function welcomeText() {
  const name = currentRestaurant().restaurantInfo?.name || currentTenant().name || 'del locale';
  return (
    `Benvenuto! Sono il menu di *${name}*.\n\n` +
    `Da qui cambi piatti, prezzi e foto scrivendomi, anche durante il servizio — oppure mandami un vocale, capisco anche le frasi normali.\n\n` +
    `Proviamo subito? Scrivi:\n` +
    `*lista* — per vedere i piatti che hai adesso\n\n` +
    `Se ti serve altro, scrivi *aiuto*.`
  );
}

export function shortHelpText() {
  return (
    `Ciao! Da qui cambi il menu senza aprire niente — anche a voce: mandami un vocale invece di scrivere, capisco pure le frasi normali (es. "segna la carbonara come consigliata").\n\n` +
    `Le cose che servono tutti i giorni:\n\n` +
    `• *aggiungi* — metti un piatto nuovo\n` +
    `• *prezzo carbonara 9,50* — cambi un prezzo al volo\n` +
    `• *finito carbonara* — lo togli dal menu per oggi\n` +
    `• *lista* — vedi tutti i piatti\n\n` +
    `Hai il menu di carta? Mandami la foto e lo carico io.\n\n` +
    `Scrivi *tutto* per l’elenco completo dei comandi.\n` +
    `Scrivi *messaggio fisso* per un promemoria da tenere sempre in cima alla chat.\n` +
    `Scrivi *annulla* se ti sei perso.`
  );
}

export function everythingMenuText() {
  return (
    `Cinque gruppi di comandi. Scrivi quello che ti serve:\n\n` +
    `• *comandi piatti* — aggiungere, modificare, prezzi, foto\n` +
    `• *comandi categorie* — le sezioni del menu\n` +
    `• *comandi grafica* — logo, colori, sfondo, vista\n` +
    `• *comandi sicurezza* — codice di accesso al pannello admin\n` +
    `• *comandi statistiche* — visualizzazioni, annulla, promemoria\n\n` +
    `Puoi anche dare più comandi in un messaggio solo (es. *prezzo carbonara 9,50 e finito margherita*), o dirli a voce con un vocale.`
  );
}

export function dishesHelpText() {
  return (
    `*Comandi piatti* (i più usati)\n\n` +
    `• *aggiungi* — nome, categoria, prezzo, ingredienti, allergeni, consigliato, foto\n` +
    `  in una riga: *aggiungi Carbonara, primi, 12, uovo e guanciale*\n` +
    `• *prezzo carbonara 9,50*\n` +
    `• *finito carbonara* — non disponibile (anche: esaurito)\n` +
    `  *finito carbonara oggi* — torna da solo domani\n` +
    `• *torna carbonara* — di nuovo disponibile\n` +
    `• *consiglia carbonara* — lo segna come consigliato\n` +
    `  anche più piatti insieme: *consiglia carbonara, margherita*\n` +
    `  *non consigliato carbonara* — lo toglie\n` +
    `• *lista* oppure *lista pizze*\n` +
    `• *elimina* — ti mando una lista, poi *cancella*\n` +
    `  oppure *elimina carbonara* (chiede conferma)\n` +
    `• *foto carbonara* — cambia la foto`
  );
}

export function dishesHelpTextAdvanced() {
  return (
    `*Comandi piatti* (avanzati)\n\n` +
    `• *modifica* oppure *modifica carbonara*\n` +
    `• *cerca carbonara*\n` +
    `• *copia margherita* — duplica un piatto\n` +
    `• *sposta carbonara in categoria antipasti* — cambia categoria\n` +
    `• *modello 3d carbonara* — mandami 2-4 foto del piatto e ne genero un modello 3D (solo Pro)\n` +
    `• *aumenta prezzi 5%* oppure *aumenta prezzi primi 1 euro*\n` +
    `• *link* / *qr* — da mandare ai clienti`
  );
}

export function categoriesHelpText() {
  return (
    `*Comandi categorie*\n\n` +
    `• *categorie* — elenco\n` +
    `• *aggiungi categoria*\n` +
    `  in una riga: *aggiungi categoria Antipasti | gli antipasti della casa*\n` +
    `• *modifica categoria*\n` +
    `• *rinomina categoria primi | Primi della casa*\n` +
    `• *nascondi gelati* / *mostra gelati* — menu stagionali\n` +
    `• *ordine categoria antipasti 1*\n` +
    `• *icona categoria primi* — ti mando le icone disponibili con un numero, rispondi con il numero\n` +
    `• *elimina categoria* — poi *cancella*\n` +
    `  (non si può se ci sono ancora piatti)`
  );
}

export function graphicsHelpText() {
  return (
    `*Comandi grafica e locale*\n\n` +
    `• *configura* — configura il locale passo passo (anche: *setup*)\n` +
    `  durante i passaggi: *salta* uno step, *sì* per salvare, *no* per non applicare\n` +
    `• Scrivi *nome, città* — cerca online e chiede conferma\n` +
    `• *colori* — scegli i colori\n` +
    `• *colore verde* oppure *colore #0c5648*\n` +
    `• *logo* — invia la foto del logo\n` +
    `• *sfondo* — scegli 1–5 oppure invia una tua foto\n` +
    `• *elenco* / *carosello* — come si vedono i piatti`
  );
}

export function graphicsHelpTextAdvanced() {
  return (
    `*Comandi grafica* (avanzati)\n\n` +
    `• *locale* — menu: dati, logo, sfondo, colori, vista, da link\n` +
    `• *dati* — nome, indirizzo, orari, contatti, un campo alla volta\n` +
    `• oppure diretti, un campo solo: *telefono 0891234567*, *email info@locale.it*,\n` +
    `  *indirizzo via Roma 15*, *orari Lun-Sab 12-15 e 19-23*, *sito*, *instagram*, *facebook*, *descrizione*\n` +
    `• *link* + URL sito / Google / TripAdvisor / TheFork`
  );
}

export function securityHelpText() {
  return (
    `*Comandi sicurezza*\n\n` +
    `• *nuovo codice accesso* (anche *rigenera codice*, *cambia codice accesso*) — genera un nuovo codice per entrare nel pannello admin\n` +
    `  chiede conferma prima di procedere e disconnette subito chi era già collegato con il codice vecchio\n` +
    `• Se te lo dimentichi, dalla pagina di login del pannello trovi anche "Hai dimenticato il codice? Te lo mandiamo via email"`
  );
}

export function statsAndOtherHelpText() {
  return (
    `*Comandi statistiche e altro*\n\n` +
    `• *statistiche* — visualizzazioni del menu online negli ultimi 7 giorni\n` +
    `• *annulla ultima* — disfa l'ultima modifica fatta (prezzo, disponibilità, aggiunta, eliminazione...)\n` +
    `• *messaggio fisso* — un promemoria dei comandi da fissare manualmente in cima alla chat\n` +
    `• *annulla* — interrompe l'operazione in corso, in qualsiasi momento`
  );
}

/**
 * Messaggio pensato per essere fissato a mano in cima alla chat (tieni premuto sul
 * messaggio > Fissa). WhatsApp non offre un modo per farlo via API — Evolution API
 * (verificato sul suo chat-controller open source) non espone il pin di un messaggio
 * dentro una chat, solo il pin/unpin dell'intera chat nell'elenco conversazioni.
 */
export function pinnedMessageText() {
  return (
    `📌 *Comandi rapidi — Menu col Codice*\n\n` +
    `*Piatti*\n` +
    `• *prezzo carbonara 9,50*\n` +
    `• *finito carbonara* / *torna carbonara*\n` +
    `• *consiglia carbonara* (anche più piatti: *consiglia carbonara, margherita*)\n` +
    `• *sposta carbonara in categoria antipasti*\n` +
    `• *aggiungi* — per un piatto nuovo\n` +
    `• *elimina carbonara* / *foto carbonara* / *copia carbonara*\n` +
    `• *lista* oppure *lista pizze*\n\n` +
    `*Categorie*\n` +
    `• *categorie* — elenco\n` +
    `• *aggiungi categoria antipasti*\n` +
    `• *nascondi gelati* / *mostra gelati*\n\n` +
    `*Locale e grafica*\n` +
    `• *vista elenco* / *vista carosello*\n` +
    `• *colore verde*\n` +
    `• *configura* — per rifare tutto da capo\n\n` +
    `*Altro*\n` +
    `• *annulla ultima* — disfa l'ultima modifica\n` +
    `• *aiuto* — elenco comandi completo\n\n` +
    `🎙️ *Vocali*: puoi anche mandare un vocale invece di scrivere. Capisco anche frasi normali, non serve dire il comando esatto — es. "segna la carbonara come consigliata" o "sposta l'insalatina nella categoria cocktails". Su frasi lunghe/ambigue chiedo conferma prima di applicare.\n\n` +
    `Scrivi *aiuto* in qualsiasi momento per il resto dei comandi.`
  );
}
