import type { NextApiRequest, NextApiResponse } from 'next';
import { getTenantBySlug, isValidSlug } from '@/server/tenant';
import { createPaypalSubscription, paypalConfigured } from '@/server/billing';
import { savePendingSignup } from '@/server/signup';
import { parseSignupPhone, resolveSignupPromo } from '@/server/signupFields';

function origin(req: NextApiRequest) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'menucolcodice.it').split(',')[0];
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  return `${proto}://${host}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  if (!paypalConfigured()) {
    return res.status(503).json({
      message: 'PayPal non è ancora collegato. Inserisci Client ID e Secret nel tab Piattaforma della demo.',
    });
  }

  const name = String(req.body?.name || '').trim();
  const slug = String(req.body?.slug || '').toLowerCase().trim();
  const email = String(req.body?.email || '').trim();
  const plan = req.body?.plan === 'pro' ? 'pro' : 'medium';

  if (name.length < 2) return res.status(400).json({ message: 'Inserisci il nome del locale' });
  if (!isValidSlug(slug)) return res.status(400).json({ message: 'Sottodominio non valido' });
  if (getTenantBySlug(slug)) return res.status(409).json({ message: 'Questo indirizzo è già usato' });

  try {
    const phone = parseSignupPhone(req.body?.phone);
    const promo = resolveSignupPromo(req.body?.promoCode, plan, 'paypal');
    const base = origin(req);
    const sub = await createPaypalSubscription({
      plan,
      slug,
      email,
      returnUrl: `${base}/iscriviti/ok`,
      cancelUrl: `${base}/iscriviti?cancelled=1`,
      startDelayDays: promo?.paypalStartDelayDays || 0,
      promoCode: promo?.code,
      discountedEuro: promo?.type === 'percent' ? promo.discountedChargeEuro : undefined,
    });
    savePendingSignup({
      slug,
      name,
      email,
      phone,
      plan,
      promoCode: promo?.code,
      paypalSubscriptionId: sub.id,
      createdAt: Date.now(),
    });
    return res.status(200).json({ ok: true, approveUrl: sub.approveUrl, subscriptionId: sub.id });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : 'PayPal non disponibile' });
  }
}
