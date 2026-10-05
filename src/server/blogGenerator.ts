import { openaiJson, extractJson } from './aiClient';
import { loadIntegrations } from './integrations';
import { slugify, type BlogPost } from './blogStore';
import { generateBlogCoverImage } from './blogImage';

/**
 * Contesto prodotto reale passato all'AI per evitare che inventi feature che
 * Menu col codice non ha (es. multilingua, che i competitor hanno ma noi no).
 * Tenere in sync con src/utils/plans.ts.
 */
const PRODUCT_CONTEXT = `Menu col codice è un servizio italiano per creare il menu digitale di un locale con QR code.
Piano Free (gratis, senza carta): fino a 30 piatti, fino a 5 categorie, allergeni a norma, QR in PDF, grafica personalizzata, il proprio indirizzo web.
Piano Media (13,99 €/mese + IVA): piatti e categorie illimitati, più statistiche (scansioni QR, tempo sul menu, piatti più aperti).
Piano Pro (23,99 €/mese + IVA): tutto quanto sopra, più gestione del menu scrivendo su WhatsApp (anche durante il servizio), scansione del menu di carta per importarlo (fino a 100 scansioni/mese), modelli 3D dei piatti.
Si entra nel pannello con un codice di accesso, non una password.
NON esiste: multilingua/traduzione automatica, gestione ordini/POS, prenotazioni tavoli, gestione sala. Non menzionare mai queste funzioni.`;

const BLOG_SYSTEM_PROMPT = `Scrivi un articolo per il blog di Menu col codice, in italiano, rivolto a gestori di ristoranti/bar/pizzerie/gelaterie che considerano un menu digitale.
Tono: diretto, pratico, colloquiale ma professionale — come chi parla a un ristoratore, non come un ufficio marketing. Frasi brevi. Niente superlativi vuoti ("il migliore", "rivoluzionario").
Basati SOLO sui fatti reali del prodotto forniti sotto: non inventare funzioni che non esistono.
Puoi citare Menu col codice come esempio quando è naturale, ma l'articolo deve essere utile anche a chi non lo comprerà mai — non deve sembrare solo pubblicità.

${PRODUCT_CONTEXT}

Rispondi SOLO con JSON in questo formato esatto:
{
  "title": "<max 60 caratteri, per il tag <title>, include una parola chiave naturale>",
  "description": "<max 155 caratteri, meta description che invoglia il click>",
  "h1": "<titolo H1 dell'articolo, può essere più lungo e discorsivo del title>",
  "body": "<corpo dell'articolo in markdown semplice: paragrafi separati da riga vuota, ## per i sottotitoli. Almeno 500 parole, struttura con 3-4 sottotitoli>",
  "faqs": [{"question": "...", "answer": "..."}, {"question": "...", "answer": "..."}]
}`;

export async function generateBlogPost(topic: string): Promise<BlogPost> {
  const cfg = loadIntegrations();
  if (!cfg.openai.apiKey) throw new Error('Manca la chiave OpenAI per generare il blog');

  const raw = await openaiJson(
    [
      { role: 'system', content: BLOG_SYSTEM_PROMPT },
      { role: 'user', content: `Argomento dell'articolo: ${topic}` },
    ],
    { timeoutMs: 60000, temperature: 0.4 }
  );
  const parsed = extractJson(raw);

  const title = String(parsed?.title || topic).trim();
  const description = String(parsed?.description || '').trim();
  const h1 = String(parsed?.h1 || title).trim();
  const body = String(parsed?.body || '').trim();
  const faqs = Array.isArray(parsed?.faqs)
    ? parsed.faqs
        .filter((f: unknown): f is { question: unknown; answer: unknown } => Boolean(f) && typeof f === 'object')
        .map((f: { question: unknown; answer: unknown }) => ({
          question: String(f.question || '').trim(),
          answer: String(f.answer || '').trim(),
        }))
        .filter((f: { question: string; answer: string }) => f.question && f.answer)
    : [];

  if (!title || !body) throw new Error('Generazione blog fallita: risposta AI incompleta');

  const slug = slugify(title) || slugify(topic) || `articolo-${Date.now()}`;
  const coverImage = await generateBlogCoverImage(slug, h1).catch(() => undefined);

  return {
    slug,
    topic,
    title,
    description,
    h1,
    body,
    faqs,
    coverImage,
    status: 'draft',
    createdAt: new Date().toISOString(),
  };
}

/** Riscrive una bozza esistente in base a un'istruzione libera (dalla revisione via WhatsApp). */
export async function reviseBlogPost(post: BlogPost, instruction: string): Promise<BlogPost> {
  const cfg = loadIntegrations();
  if (!cfg.openai.apiKey) throw new Error('Manca la chiave OpenAI per modificare il blog');

  const raw = await openaiJson(
    [
      { role: 'system', content: BLOG_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Argomento originale: ${post.topic}\n\nArticolo attuale (JSON):\n${JSON.stringify(
          { title: post.title, description: post.description, h1: post.h1, body: post.body, faqs: post.faqs }
        )}\n\nIstruzione di modifica da applicare: ${instruction}\n\nRestituisci l'intero articolo aggiornato nello stesso formato JSON, applicando solo la modifica richiesta e lasciando il resto invariato dove possibile.`,
      },
    ],
    { timeoutMs: 60000, temperature: 0.3 }
  );
  const parsed = extractJson(raw);
  const newH1 = String(parsed?.h1 || post.h1).trim();
  const coverImage = newH1 !== post.h1
    ? await generateBlogCoverImage(post.slug, newH1).catch(() => post.coverImage)
    : post.coverImage;

  return {
    ...post,
    title: String(parsed?.title || post.title).trim(),
    description: String(parsed?.description || post.description).trim(),
    h1: newH1,
    body: String(parsed?.body || post.body).trim(),
    faqs: Array.isArray(parsed?.faqs) && parsed.faqs.length ? parsed.faqs : post.faqs,
    coverImage,
  };
}
