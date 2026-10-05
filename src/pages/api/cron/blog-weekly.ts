import type { NextApiRequest, NextApiResponse } from 'next';
import { loadIntegrations } from '@/server/integrations';
import { generateBlogPost } from '@/server/blogGenerator';
import { saveBlogPost, listUsedTopics } from '@/server/blogStore';
import { nextTopic } from '@/server/blogTopics';
import { notifyNewDraft } from '@/server/whatsappBlog';

/**
 * Genera un nuovo articolo di blog in bozza, una volta a settimana, e avvisa
 * via WhatsApp l'admin piattaforma per la revisione. Non pubblica mai da solo.
 * Cron (Europe/Rome, lun 8:00):
 *   0 8 * * 1 curl -fsS "https://demo.menucolcodice.it/api/cron/blog-weekly?token=..."
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const cfg = loadIntegrations();
  const token = String(req.query.token || req.headers['x-cron-token'] || '');
  if (!cfg.webhookToken || token !== cfg.webhookToken) {
    return res.status(401).json({ message: 'Token non valido' });
  }

  const topic = nextTopic(listUsedTopics());
  if (!topic) {
    return res.status(200).json({ ok: true, skipped: true, reason: 'no-topics-left' });
  }

  try {
    const post = await generateBlogPost(topic);
    saveBlogPost(post);
    await notifyNewDraft(post);
    return res.status(200).json({ ok: true, slug: post.slug, title: post.title });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
