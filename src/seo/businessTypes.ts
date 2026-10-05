export type BusinessTypePage = {
  slug: string;
  /** Nome breve usato nei testi (es. "la tua pizzeria") */
  label: string;
  title: string;
  description: string;
  h1: string;
  lead: string;
  /** Paragrafo "perché per te" con dettagli specifici del settore */
  why: string;
  bullets: string[];
  faqs: { question: string; answer: string }[];
};

export const BUSINESS_TYPES: BusinessTypePage[] = [
  {
    slug: 'ristoranti',
    label: 'il tuo ristorante',
    title: 'Menu digitale QR per ristoranti, con allergeni a norma | Menu col codice',
    description:
      'Menu digitale per ristoranti: QR sul tavolo, allergeni a norma, prezzi sempre aggiornati. Lo scrivi tu in 5 minuti, senza sviluppatori. Piano gratis.',
    h1: 'Il menu digitale per ristoranti che aggiorni tu, in dieci secondi.',
    lead: 'Niente più menu ristampati per un prezzo cambiato o un piatto finito. Il cliente inquadra il QR sul tavolo e vede sempre la versione vera.',
    why: 'In un ristorante il menu cambia più spesso di quanto si pensi: il pesce del giorno, un piatto stagionale che entra ed esce, un prezzo che si aggiusta per il costo delle materie prime. Con un PDF o una lavagna, ogni cambio è un problema. Con Menu col codice apri la chat o il pannello, scrivi il cambiamento, ed è online. Gli allergeni sono gestiti a norma su ogni piatto, obbligatori per legge e spesso la prima cosa che chiede un cliente prima di ordinare.',
    bullets: [
      'Allergeni indicati su ogni piatto, a norma di legge',
      'Cambi un prezzo o segni un piatto finito in dieci secondi',
      'QR da stampare e mettere sul tavolo, nessuna app per il cliente',
      'Statistiche su quali piatti vengono aperti di più',
    ],
    faqs: [
      {
        question: 'Il menu digitale per ristoranti sostituisce quello di carta?',
        answer:
          'Può farlo del tutto o affiancarlo: molti ristoranti tengono il QR sul tavolo insieme a una copia cartacea ridotta, altri passano al 100% digitale. La scelta è tua, il menu online resta sempre aggiornato in entrambi i casi.',
      },
      {
        question: 'Come gestisco gli allergeni nel menu del ristorante?',
        answer:
          'Ogni piatto ha i suoi allergeni assegnati dal pannello o scrivendoli su WhatsApp (piano Pro): compaiono come icone accanto al piatto, a norma delle indicazioni UE 1169/2011.',
      },
      {
        question: 'Serve un tecnico per aggiornare il menu?',
        answer:
          'No. Aggiorni prezzi, piatti e categorie da un pannello semplice o, con il piano Pro, scrivendo direttamente su WhatsApp anche durante il servizio.',
      },
    ],
  },
  {
    slug: 'pizzerie',
    label: 'la tua pizzeria',
    title: 'Menu digitale QR per pizzerie: impasti, farciture e allergeni | Menu col codice',
    description:
      'Menu digitale per pizzerie con QR code: gestisci impasti, ingredienti e allergeni, aggiorni i prezzi in tempo reale. Parti gratis, online in 5 minuti.',
    h1: 'Il menu digitale per pizzerie: tante pizze, zero fatica ad aggiornarle.',
    lead: 'Un impasto nuovo, un ingrediente che finisce, una pizza stagionale: in una pizzeria il menu si muove spesso. Il QR sul tavolo mostra sempre la lista vera.',
    why: 'Le pizzerie hanno spesso il menu più lungo del settore: decine di pizze, impasti diversi (classico, integrale, senza glutine), farciture che cambiano con la stagione. Tenerlo aggiornato su carta significa ristampare tutto per una sola variazione. Con Menu col codice organizzi le pizze per categoria (rosse, bianche, speciali), segni gli allergeni su ogni ricetta e aggiorni un prezzo o togli una pizza dal menu in pochi secondi, anche a forno acceso.',
    bullets: [
      'Categorie per organizzare pizze classiche, speciali, senza glutine',
      'Allergeni su ogni pizza, a norma di legge',
      'Togli una pizza "finita per oggi" e torna disponibile da sola il giorno dopo',
      'QR sul tavolo o sul bancone da asporto',
    ],
    faqs: [
      {
        question: 'Posso separare le pizze per impasto (classico, integrale, senza glutine)?',
        answer:
          'Sì, con le categorie: crei una sezione per ogni tipo di impasto o le raggruppi per gusto (rosse, bianche, speciali), come preferisci.',
      },
      {
        question: 'Come segno che una pizza è finita solo per stasera?',
        answer:
          'Scrivi "finito [nome pizza] oggi" (anche su WhatsApp col piano Pro): scompare dal menu e torna visibile da sola dal giorno dopo, senza doverla riattivare a mano.',
      },
      {
        question: 'Il menu digitale funziona anche per l\'asporto e la consegna?',
        answer:
          'Sì: il link e il QR funzionano ovunque, anche stampati su un volantino o mostrati al bancone asporto, non solo sul tavolo.',
      },
    ],
  },
  {
    slug: 'bar-caffetterie',
    label: 'il tuo bar',
    title: 'Menu digitale QR per bar e caffetterie | Menu col codice',
    description:
      'Menu digitale per bar e caffetterie: drink, colazioni, aperitivo. QR sul bancone, aggiorni la lista in pochi secondi quando cambia la stagione. Gratis per iniziare.',
    h1: 'Il menu digitale per bar: colazione, pranzo e aperitivo, sempre aggiornati.',
    lead: 'Un bar cambia la carta più volte al giorno tra colazione, pranzo veloce e aperitivo. Il QR sul bancone mostra sempre quello che c\'è davvero.',
    why: 'In un bar il menu non è uno solo: c\'è la colazione al mattino, i piatti veloci a pranzo, i cocktail e gli stuzzichini all\'aperitivo, magari una lista di birre alla spina che cambia con le forniture. Un menu di carta unico invecchia subito. Con Menu col codice organizzi tutto in categorie (colazione, pranzo, aperitivo, drink) e aggiorni al volo un prezzo o un drink che non c\'è più, senza ristampare nulla.',
    bullets: [
      'Categorie separate per colazione, pranzo e aperitivo',
      'Aggiorni la carta dei drink in pochi secondi',
      'QR sul bancone o sui tavolini, il cliente lo apre dal telefono',
      'Statistiche su cosa guardano di più i clienti',
    ],
    faqs: [
      {
        question: 'Posso avere menu diversi per colazione e aperitivo nello stesso QR?',
        answer:
          'Sì, con le categorie: crei una sezione "Colazione" e una "Aperitivo" nello stesso menu, il cliente scorre e trova quello che cerca a seconda dell\'orario.',
      },
      {
        question: 'Come aggiorno la lista delle birre alla spina?',
        answer:
          'Dal pannello, oppure scrivendo su WhatsApp col piano Pro: aggiungi, togli o segni "finita" una birra in pochi secondi, anche dietro al bancone durante il servizio.',
      },
    ],
  },
  {
    slug: 'gelaterie',
    label: 'la tua gelateria',
    title: 'Menu digitale QR per gelaterie: gusti sempre aggiornati | Menu col codice',
    description:
      'Menu digitale per gelaterie con QR code: gusti, allergeni e prezzi sempre aggiornati, anche quando cambiano ogni giorno. Piano gratis, online in 5 minuti.',
    h1: 'Il menu digitale per gelaterie: i gusti di oggi, non quelli di due mesi fa.',
    lead: 'I gusti in vetrina cambiano spesso, la lista scritta a mano no. Il QR mostra sempre i gusti veri del giorno, con gli allergeni segnati.',
    why: 'In una gelateria i gusti ruotano con la stagione e le materie prime, e molti clienti — soprattutto chi ha intolleranze — vogliono sapere cosa contiene un gusto prima di provarlo. Con Menu col codice tieni la lista sempre aggiornata: aggiungi un gusto nuovo, togli quello finito, segni gli allergeni su ognuno. Il cliente inquadra il QR in vetrina e vede la lista vera, con le foto se vuoi mostrarle.',
    bullets: [
      'Gusti aggiunti o tolti in pochi secondi quando cambiano',
      'Allergeni su ogni gusto, utile per chi ha intolleranze',
      'Foto dei gusti per invogliare dalla vetrina',
      'QR da stampare e mettere in vetrina o alla cassa',
    ],
    faqs: [
      {
        question: 'Posso aggiornare i gusti più volte al giorno?',
        answer:
          'Sì, non ci sono limiti: aggiungi, modifichi o togli un gusto tutte le volte che serve, anche più volte nella stessa giornata.',
      },
      {
        question: 'Come mostro quali gusti sono senza lattosio o vegani?',
        answer:
          'Con gli allergeni e le note su ogni gusto: le indichi una volta e restano visibili finché non le cambi.',
      },
    ],
  },
  {
    slug: 'hotel-b-and-b',
    label: 'la tua struttura',
    title: 'Menu digitale QR per hotel, B&B e room service | Menu col codice',
    description:
      'Menu digitale per hotel e B&B: colazione, bar e room service con un QR in ogni camera. Niente app da scaricare per gli ospiti, anche stranieri. Gratis per iniziare.',
    h1: 'Il menu digitale per hotel e B&B: un QR in camera, niente da scaricare.',
    lead: 'Colazione, bar, room service: con un QR in ogni camera l\'ospite vede il menu sul suo telefono, senza installare app né chiedere alla reception.',
    why: 'In una struttura ricettiva il menu non riguarda solo il ristorante: c\'è la colazione, magari il bar a bordo piscina, il servizio in camera. Un ospite straniero che arriva senza sapere l\'italiano spesso rinuncia a chiedere invece di scaricare un\'app che userà una sola volta. Con un QR in ogni camera o alla reception, il menu si apre direttamente dal browser del telefono: niente download, niente registrazione, e tu aggiorni prezzi e piatti da un pannello unico.',
    bullets: [
      'QR in ogni camera, alla reception o a bordo piscina',
      'Niente app da scaricare, l\'ospite apre solo il browser',
      'Un pannello unico per colazione, bar e room service',
      'Aggiorni orari e piatti stagionali senza ristampare nulla',
    ],
    faqs: [
      {
        question: 'Posso avere un menu diverso per colazione e room service?',
        answer:
          'Sì, con le categorie separi colazione, bar e servizio in camera nello stesso menu, o creai QR diversi se preferisci tenerli del tutto separati.',
      },
      {
        question: 'Un ospite straniero riesce a usarlo senza app?',
        answer:
          'Sì: il QR apre una pagina web normale nel browser del telefono, non serve installare o registrare nulla, funziona su qualsiasi smartphone.',
      },
    ],
  },
  {
    slug: 'pub-birrerie',
    label: 'il tuo pub',
    title: 'Menu digitale QR per pub e birrerie: spine sempre aggiornate | Menu col codice',
    description:
      'Menu digitale per pub e birrerie con QR code: birre alla spina, panini e allergeni sempre aggiornati. Segni una spina finita in pochi secondi. Piano gratis.',
    h1: 'Il menu digitale per pub: le spine di oggi, non quelle di ieri sera.',
    lead: 'Le birre alla spina finiscono, cambiano, ruotano con le fornitura. Il QR sul tavolo mostra sempre quelle davvero disponibili stasera.',
    why: 'In un pub la lista delle spine è la parte del menu che cambia più spesso: una birra finisce a metà serata, un\'altra arriva nuova con la fornitura della settimana. Scriverlo su una lavagna funziona finché non finisce anche il gessetto. Con Menu col codice segni una spina come "finita" in pochi secondi dal telefono, e torna visibile appena la riattivi. Gli allergeni restano segnati su ogni piatto del food, dai panini agli stuzzichini.',
    bullets: [
      'Segni una spina finita in pochi secondi, anche dietro al bancone',
      'Categorie separate per birre, panini, stuzzichini',
      'Allergeni su ogni piatto del food',
      'QR sul tavolo, il cliente ordina sapendo cosa c\'è davvero',
    ],
    faqs: [
      {
        question: 'Come tolgo una birra che è appena finita alla spina?',
        answer:
          'Scrivi "finito [nome birra]" (anche su WhatsApp col piano Pro): sparisce dal menu subito, senza dover riscrivere tutta la lista.',
      },
      {
        question: 'Posso aggiungere una birra nuova arrivata con la fornitura?',
        answer:
          'Sì, in pochi secondi dal pannello o da WhatsApp: nome, prezzo e categoria, ed è subito visibile nel menu online.',
      },
    ],
  },
  {
    slug: 'paninoteche-street-food',
    label: 'la tua attività street food',
    title: 'Menu digitale QR per paninoteche, piadinerie e street food | Menu col codice',
    description:
      'Menu digitale per paninoteche, piadinerie e street food: QR al banco, ordini più veloci, allergeni sempre visibili. Menu semplice da consultare anche in fila. Gratis.',
    h1: 'Il menu digitale per street food: si legge in fila, si aggiorna in un attimo.',
    lead: 'Chi ordina un panino o una piadina spesso è di fretta o in coda: il QR al banco fa vedere subito la lista, senza aspettare il menu scritto a mano.',
    why: 'Paninoteche, piadinerie e furgoni di street food lavorano spesso con codici veloci: il cliente arriva, deve decidere in fretta cosa ordinare, magari con un\'intolleranza da controllare. Un menu scritto su una lavagna piccola o su un foglio plastificato è difficile da leggere in fila e complicato da aggiornare quando cambia un ingrediente. Con Menu col codice il cliente inquadra il QR al banco e vede subito la lista completa sul telefono, con gli allergeni segnati, mentre tu aggiorni un prezzo o un ingrediente finito in pochi secondi.',
    bullets: [
      'Il cliente legge il menu comodamente sul suo telefono, anche in fila',
      'Allergeni visibili su ogni panino o piadina',
      'Aggiorni un ingrediente finito senza rifare il cartello',
      'QR piccolo, basta un adesivo sul banco o sul furgone',
    ],
    faqs: [
      {
        question: 'Funziona anche per un furgone o un chiosco senza corrente per uno schermo?',
        answer:
          'Sì: basta un QR stampato o un adesivo, non serve nessuno schermo. Il cliente inquadra col suo telefono e il menu si apre da solo.',
      },
      {
        question: 'Posso aggiornare il menu più volte durante il servizio?',
        answer:
          'Sì, non ci sono limiti: se un ingrediente finisce a metà turno lo togli subito, anche dal telefono dietro al banco.',
      },
    ],
  },
];

export function getBusinessType(slug: string): BusinessTypePage | undefined {
  return BUSINESS_TYPES.find((item) => item.slug === slug);
}
