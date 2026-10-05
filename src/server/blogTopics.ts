/**
 * Argomenti pianificati per il blog, scelti sulle ricerche reali che fanno i
 * ristoratori italiani (validate osservando quali contenuti dominano le SERP
 * dei competitor). Ruotano in ordine: generateNextTopic() prende il primo non
 * ancora usato. Aggiungerne di nuovi in fondo quando la lista si esaurisce.
 */
export const BLOG_TOPICS: string[] = [
  'Menu digitale gratis per ristoranti: cosa aspettarsi davvero da un piano free',
  'Come si stampa un QR code per il menu del ristorante: guida pratica',
  'Allergeni nel menu del ristorante: cosa dice la normativa e come indicarli',
  'Quanto costa un menu digitale per un ristorante nel 2026',
  'Menu digitale vs menu di carta: vantaggi e svantaggi reali',
  'Come aggiornare il menu del ristorante senza ristampare tutto',
  'QR code sul tavolo: i clienti lo usano davvero? Cosa dicono i dati',
  'Menu digitale per il periodo estivo: come gestire i piatti stagionali',
  'Errori comuni quando si passa dal menu di carta a quello digitale',
  'Come fotografare i piatti per il menu digitale senza un fotografo professionista',
  'Menu digitale multilingua: serve davvero al tuo locale?',
  'Statistiche del menu digitale: quali numeri guardare per capire cosa funziona',
  'Come gestire il menu durante un evento o una serata speciale',
  'Menu digitale e WhatsApp: aggiornare il menu senza aprire il computer',
  'Quanto tempo si risparmia davvero con un menu digitale',
  'Come organizzare le categorie del menu per farlo leggere meglio ai clienti',
  'Menu digitale per il servizio delivery e asporto: cosa cambia',
  'Codice di accesso invece di password: perché è più semplice per chi gestisce il locale',
];

export function nextTopic(usedTopics: string[]): string | null {
  const used = new Set(usedTopics);
  return BLOG_TOPICS.find((topic) => !used.has(topic)) || null;
}
