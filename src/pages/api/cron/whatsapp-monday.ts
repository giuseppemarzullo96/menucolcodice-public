import type { NextApiRequest, NextApiResponse } from 'next';
import { loadIntegrations } from '@/server/integrations';
import { loadTenants, enterTenant, PLAN_LIMITS } from '@/server/tenant';
import { sendWhatsAppText } from '@/server/whatsapp';
import { statsText } from '@/server/whatsappStats';
import { currentRestaurant } from '@/server/restaurantStore';

/**
 * Report settimanale WhatsApp (lunedì).
 * Proteggi con ?token=webhookToken oppure header x-cron-token.
 * Esempio cron (Europe/Rome, lun 9:05):
 *   5 9 * * 1 curl -fsS "https://demo.menucolcodice.it/api/cron/whatsapp-monday?token=..."
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

  const force = String(req.query.force || '') === '1';
  const now = new Date();
  const romeWeekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Rome',
    weekday: 'short',
  }).format(now);
  if (!force && romeWeekday !== 'Mon') {
    return res.status(200).json({ ok: true, skipped: true, reason: 'not-monday' });
  }

  const tenants = loadTenants().filter(
    (t) => t.status === 'active' && PLAN_LIMITS[t.plan].whatsapp && (t.whatsappNumbers || []).length > 0
  );

  const results: Array<{ slug: string; sent: number; error?: string }> = [];

  for (const tenant of tenants) {
    try {
      enterTenant(tenant);
      const name = currentRestaurant().restaurantInfo?.name || tenant.name || tenant.slug;
      const body =
        `Buongiorno! Ecco come è andato il menu di *${name}* la scorsa settimana.\n\n` +
        `${statsText(7)}\n\n` +
        `Se ti serve qualcosa, scrivi *aiuto*. Buona settimana.`;
      let sent = 0;
      for (const number of tenant.whatsappNumbers.slice(0, 3)) {
        await sendWhatsAppText(number, body);
        sent += 1;
      }
      results.push({ slug: tenant.slug, sent });
    } catch (error) {
      results.push({
        slug: tenant.slug,
        sent: 0,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return res.status(200).json({ ok: true, tenants: results.length, results });
}
