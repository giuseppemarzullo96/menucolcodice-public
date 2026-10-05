import type { NextApiRequest, NextApiResponse } from 'next';
import { loadIntegrations } from '@/server/integrations';
import {
  downloadIncomingAudio,
  downloadIncomingImage,
  isNumberAllowed,
  parseIncomingMessage,
  sendWhatsAppText,
} from '@/server/whatsapp';
import { handleWhatsAppCommand, runVoiceCommand } from '@/server/whatsappCommands';
import { enterTenant, findTenantByWhatsApp, getTenantBySlug } from '@/server/tenant';
import { transcribeWhatsAppAudio } from '@/server/whatsappVoice';
import { handleBlogMessage } from '@/server/whatsappBlog';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const cfg = loadIntegrations();
  const token = String(req.query.token || req.headers['x-webhook-token'] || '');
  if (cfg.webhookToken && token !== cfg.webhookToken) {
    return res.status(401).json({ message: 'Token webhook non valido' });
  }

  const event = String(req.body?.event || req.body?.eventType || '').toLowerCase();
  if (
    event &&
    !event.includes('messages.upsert') &&
    !event.includes('messages.update') &&
    event !== 'messages_upsert' &&
    event !== 'messages_update'
  ) {
    return res.status(200).json({ ignored: true });
  }

  const incoming = parseIncomingMessage(req.body);
  if (!incoming) {
    return res.status(200).json({ ignored: true });
  }

  if (!isNumberAllowed(incoming.number)) {
    return res.status(200).json({ ignored: true, reason: 'number-not-allowed' });
  }

  const tenant = findTenantByWhatsApp(incoming.number) || getTenantBySlug('demo');
  if (!tenant) {
    return res.status(200).json({ ignored: true, reason: 'tenant-not-found' });
  }
  enterTenant(tenant);

  res.status(200).json({ ok: true });

  try {
    let imageBase64: string | null = null;
    let text = incoming.text;

    // Comandi di gestione del blog (solo dal numero admin piattaforma): gestiti a
    // parte, mai instradati al bot del menu ristorante.
    if (text && (await handleBlogMessage(incoming.number, text))) {
      return;
    }

    if (incoming.hasImage) {
      imageBase64 = await downloadIncomingImage(incoming.raw);
    }
    if (incoming.hasAudio && !text) {
      try {
        await sendWhatsAppText(incoming.number, 'Sto ascoltando il vocale…');
        const audio = await downloadIncomingAudio(incoming.raw);
        if (!audio) throw new Error('Audio non scaricato');
        const transcript = await transcribeWhatsAppAudio(audio, incoming.audioMime || 'audio/ogg');
        await runVoiceCommand(incoming.number, transcript);
        return;
      } catch (error) {
        await sendWhatsAppText(
          incoming.number,
          error instanceof Error
            ? `Non sono riuscito a capire il vocale: ${error.message}`
            : 'Non sono riuscito a capire il vocale. Riprova o scrivi il comando.'
        );
        return;
      }
    }
    await handleWhatsAppCommand({
      number: incoming.number,
      text,
      imageBase64,
      pollOptions: incoming.pollOptions,
      pollMessageId: incoming.pollMessageId,
    });
  } catch (error) {
    console.error('WhatsApp webhook handler error:', error);
  }
}
