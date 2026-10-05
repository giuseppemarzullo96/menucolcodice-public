import fs from 'fs';
import path from 'path';
import { sendWhatsAppText } from './whatsapp';
import {
  saveBlogPost,
  loadBlogPost,
  deleteBlogPost,
  listDraftPosts,
  listUsedTopics,
  publishBlogPost,
  type BlogPost,
} from './blogStore';
import { generateBlogPost, reviseBlogPost } from './blogGenerator';
import { nextTopic } from './blogTopics';
import { MARKETING_ORIGIN } from '@/seo/site';

/** Unico numero autorizzato a gestire il blog via WhatsApp (staff piattaforma). */
export const BLOG_ADMIN_NUMBER = '393330000000';

const SESSION_FILE = path.join(process.cwd(), 'platform', 'blog', 'session.json');

type BlogSession = { slug: string; createdAt: number };
const SESSION_MS = 6 * 60 * 60 * 1000;

function loadSession(): BlogSession | null {
  if (!fs.existsSync(SESSION_FILE)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8')) as BlogSession;
    if (Date.now() - raw.createdAt > SESSION_MS) return null;
    return raw;
  } catch {
    return null;
  }
}

function saveSession(slug: string) {
  fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true });
  fs.writeFileSync(SESSION_FILE, JSON.stringify({ slug, createdAt: Date.now() }, null, 2), 'utf8');
}

function clearSession() {
  if (fs.existsSync(SESSION_FILE)) fs.unlinkSync(SESSION_FILE);
}

function draftSummary(post: BlogPost) {
  const preview = post.body.replace(/\n+/g, ' ').slice(0, 220);
  return (
    `📝 *Bozza articolo blog*\n\n` +
    `*Titolo:* ${post.title}\n` +
    `*H1:* ${post.h1}\n` +
    `*Descrizione:* ${post.description}\n\n` +
    `${preview}…\n\n` +
    `Anteprima: ${MARKETING_ORIGIN}/blog/${post.slug}?preview=1\n\n` +
    `Scrivi *pubblica* per metterlo online, *scarta* per buttarlo via, oppure dimmi cosa cambiare (es. "accorcia il secondo paragrafo", "cambia il titolo in...").`
  );
}

export async function notifyNewDraft(post: BlogPost) {
  saveSession(post.slug);
  await sendWhatsAppText(BLOG_ADMIN_NUMBER, draftSummary(post));
}

/**
 * Gestisce i messaggi del numero admin blog. Ritorna true se il messaggio è stato
 * gestito qui (il chiamante non deve passarlo al bot ristorante), false altrimenti.
 */
export async function handleBlogMessage(number: string, text: string): Promise<boolean> {
  if (number !== BLOG_ADMIN_NUMBER) return false;
  const lower = text.trim().toLowerCase();

  const session = loadSession();

  if (!session) {
    if (['nuovo articolo blog', 'nuovo articolo', 'genera articolo'].includes(lower)) {
      await sendWhatsAppText(number, 'Genero un nuovo articolo, un attimo…');
      const topic = nextTopic(listUsedTopics());
      if (!topic) {
        await sendWhatsAppText(number, 'Ho esaurito gli argomenti pianificati. Aggiungine di nuovi in blogTopics.ts.');
        return true;
      }
      try {
        const post = await generateBlogPost(topic);
        saveBlogPost(post);
        await notifyNewDraft(post);
      } catch (error) {
        await sendWhatsAppText(number, `Errore nella generazione: ${error instanceof Error ? error.message : String(error)}`);
      }
      return true;
    }
    if (['bozze', 'vedi bozze', 'lista bozze'].includes(lower)) {
      const drafts = listDraftPosts();
      if (!drafts.length) {
        await sendWhatsAppText(number, 'Nessuna bozza in attesa.');
        return true;
      }
      await sendWhatsAppText(
        number,
        `Bozze in attesa:\n\n${drafts.map((d) => `• ${d.title}`).join('\n')}\n\nScrivi *riprendi [titolo o parte]* per riaprirne una.`
      );
      return true;
    }
    if (lower.startsWith('riprendi ')) {
      const query = lower.replace(/^riprendi\s+/, '').trim();
      const match = listDraftPosts().find((d) => d.title.toLowerCase().includes(query) || d.slug.includes(query));
      if (!match) {
        await sendWhatsAppText(number, 'Non ho trovato quella bozza. Scrivi *bozze* per vedere l\'elenco.');
        return true;
      }
      saveSession(match.slug);
      await sendWhatsAppText(number, draftSummary(match));
      return true;
    }
    return false;
  }

  // Sessione attiva: c'è una bozza in revisione.
  const post = loadBlogPost(session.slug);
  if (!post) {
    clearSession();
    return false;
  }

  if (['pubblica', 'pubblica articolo', 'ok pubblica'].includes(lower)) {
    const published = publishBlogPost(post.slug);
    clearSession();
    await sendWhatsAppText(
      number,
      published
        ? `Pubblicato: ${MARKETING_ORIGIN}/blog/${published.slug}`
        : 'Errore nella pubblicazione, riprova.'
    );
    return true;
  }

  if (['scarta', 'annulla', 'elimina', 'cancella'].includes(lower)) {
    deleteBlogPost(post.slug);
    clearSession();
    await sendWhatsAppText(number, 'Bozza eliminata.');
    return true;
  }

  if (['nuovo articolo blog', 'nuovo articolo', 'genera articolo'].includes(lower)) {
    await sendWhatsAppText(number, 'C\'è già una bozza in revisione. Scrivi *pubblica* o *scarta* prima di generarne un\'altra.');
    return true;
  }

  // Qualsiasi altro testo: istruzione di modifica.
  await sendWhatsAppText(number, 'Aggiorno la bozza…');
  try {
    const revised = await reviseBlogPost(post, text);
    saveBlogPost(revised);
    await sendWhatsAppText(number, draftSummary(revised));
  } catch (error) {
    await sendWhatsAppText(number, `Errore nella modifica: ${error instanceof Error ? error.message : String(error)}`);
  }
  return true;
}
