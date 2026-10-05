import type { NextApiRequest, NextApiResponse } from 'next';
import { getTenantBySlug, isValidSlug } from '@/server/tenant';
import { createStripeCheckout, stripeConfigured } from '@/server/stripeBilling';
import { savePendingSignup } from '@/server/signup';
import { parseSignupPhone, resolveSignupPromo } from '@/server/signupFields';

function origin(req: NextApiRequest) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'menucolcodice.it').split(',')[0];
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  return `${proto}://${host}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  if (!stripeConfigured()) {
    return res.status(503).json({
      message: 'Stripe non è ancora collegato. Inserisci la Secret key nel tab Piattaforma della demo.',
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
    const promo = resolveSignupPromo(req.body?.promoCode, plan, 'stripe');
    const base = origin(req);
    const checkout = await createStripeCheckout({
      plan,
      slug,
      name,
      email,
      successUrl: `${base}/iscriviti/ok?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${base}/iscriviti?cancelled=1`,
      promo: promo
        ? {
            code: promo.code,
            trialDays: promo.trialDays || undefined,
            discountedCents:
              promo.type === 'percent'
                ? Math.round(promo.discountedChargeEuro * 100)
                : undefined,
          }
        : undefined,
    });
    savePendingSignup({
      slug,
      name,
      email,
      phone,
      plan,
      promoCode: promo?.code,
      stripeSessionId: checkout.sessionId,
      createdAt: Date.now(),
    });
    return res.status(200).json({
      ok: true,
      checkoutUrl: checkout.checkoutUrl,
      sessionId: checkout.sessionId,
    });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : 'Stripe non disponibile' });
  }
}
