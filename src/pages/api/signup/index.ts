import type { NextApiRequest, NextApiResponse } from 'next';
import { getTenantBySlug, isValidSlug } from '@/server/tenant';
import { activateAccount } from '@/server/signup';
import { parseSignupPhone, resolveSignupPromo } from '@/server/signupFields';
import { paypalConfigured } from '@/server/billing';
import { stripeConfigured } from '@/server/stripeBilling';

function origin(req: NextApiRequest) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'menucolcodice.it').split(',')[0];
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  return `${proto}://${host}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const providers = {
      paypal: paypalConfigured(),
      stripe: stripeConfigured(),
    };
    const slug = String(req.query.slug || '').toLowerCase().trim();
    if (!slug || req.query.providers === '1') {
      return res.status(200).json(providers);
    }
    if (!isValidSlug(slug)) return res.status(200).json({ available: false, message: 'Sottodominio non valido', ...providers });
    return res.status(200).json({
      available: !getTenantBySlug(slug),
      ...providers,
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const name = String(req.body?.name || '').trim();
  const slug = String(req.body?.slug || '').toLowerCase().trim();
  const email = String(req.body?.email || '').trim();
  const plan = req.body?.plan === 'medium' || req.body?.plan === 'pro' ? req.body.plan : 'free';

  if (name.length < 2) return res.status(400).json({ message: 'Inserisci il nome del locale' });
  if (!isValidSlug(slug)) return res.status(400).json({ message: 'Scegli un sottodominio tipo nomelocale (lettere, numeri, trattino)' });
  if (getTenantBySlug(slug)) return res.status(409).json({ message: 'Questo indirizzo è già usato' });
  if (plan !== 'free') {
    return res.status(400).json({ message: 'Per Media e Pro usa il pagamento con carta o PayPal.' });
  }

  try {
    const phone = parseSignupPhone(req.body?.phone);
    if (req.body?.promoCode) resolveSignupPromo(req.body.promoCode, plan, 'stripe');
    const activated = await activateAccount({
      slug,
      name,
      plan: 'free',
      email,
      phone,
      promoCode: String(req.body?.promoCode || '').trim() || undefined,
      billingProvider: 'none',
    });
    return res.status(200).json({
      ok: true,
      url: activated.url,
      admin: `${activated.url}/admin/login`,
      origin: origin(req),
    });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : 'Iscrizione non riuscita' });
  }
}
