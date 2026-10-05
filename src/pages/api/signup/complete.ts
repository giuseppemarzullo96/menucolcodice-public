import type { NextApiRequest, NextApiResponse } from 'next';
import { getPaypalSubscription } from '@/server/billing';
import { getStripeCheckoutSession } from '@/server/stripeBilling';
import { activateAccount, findPendingSignup, takePendingSignup } from '@/server/signup';
import { getTenantBySlug } from '@/server/tenant';

function slugFromPaypalCustomId(customId: string) {
  return String(customId || '').split('|')[0].toLowerCase().trim();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const sessionId = String(req.body?.sessionId || req.query.session_id || '').trim();
  const subscriptionId = String(req.body?.subscriptionId || req.query.subscription_id || '').trim();

  try {
    if (sessionId) {
      const session = await getStripeCheckoutSession(sessionId);
      const paid =
        session.status === 'complete' &&
        (session.payment_status === 'paid' || session.payment_status === 'no_payment_required');
      if (!paid) {
        return res.status(409).json({
          message: `Pagamento non ancora attivo (${session.payment_status || session.status || 'sconosciuto'})`,
        });
      }
      const pending =
        findPendingSignup(sessionId) ||
        findPendingSignup(String(session.metadata?.slug || '')) ||
        takePendingSignup(sessionId);
      const slug = String(session.metadata?.slug || pending?.slug || '').toLowerCase();
      if (!slug) return res.status(400).json({ message: 'Sessione senza locale collegato' });

      const existing = getTenantBySlug(slug);
      const subscription =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription && typeof session.subscription === 'object'
            ? session.subscription.id
            : '';
      takePendingSignup(slug);
      const activated = await activateAccount({
        slug,
        name: pending?.name || existing?.name || session.metadata?.name || slug,
        plan: pending?.plan === 'pro' || session.metadata?.plan === 'pro' || existing?.plan === 'pro' ? 'pro' : 'medium',
        email: pending?.email || session.customer_details?.email || session.customer_email || undefined,
        phone: pending?.phone || existing?.phone,
        promoCode: pending?.promoCode || String(session.metadata?.promoCode || '') || undefined,
        billingProvider: 'stripe',
        stripeCustomerId: typeof session.customer === 'string' ? session.customer : undefined,
        stripeSubscriptionId: subscription || undefined,
        stripeSessionId: sessionId,
      });
      return res.status(200).json({
        ok: true,
        url: activated.url,
        admin: `${activated.url}/admin/login`,
      });
    }

    if (!subscriptionId) {
      return res.status(400).json({ message: 'Manca la conferma del pagamento' });
    }

    const sub = await getPaypalSubscription(subscriptionId);
    const status = String(sub.status || '').toUpperCase();
    if (!['ACTIVE', 'APPROVED'].includes(status)) {
      return res.status(409).json({ message: `Pagamento non ancora attivo (${status || 'sconosciuto'})` });
    }
    const pending =
      findPendingSignup(subscriptionId) ||
      findPendingSignup(slugFromPaypalCustomId(String(sub.custom_id || ''))) ||
      takePendingSignup(subscriptionId);
    const slug = slugFromPaypalCustomId(String(sub.custom_id || pending?.slug || ''));
    if (!slug) return res.status(400).json({ message: 'Sottoscrizione senza locale collegato' });

    const existing = getTenantBySlug(slug);
    const name = pending?.name || existing?.name || slug;
    const plan = pending?.plan === 'pro' || existing?.plan === 'pro' ? 'pro' : 'medium';
    takePendingSignup(slug);
    const activated = await activateAccount({
      slug,
      name,
      plan,
      email: pending?.email || sub.subscriber?.email_address,
      phone: pending?.phone || existing?.phone,
      promoCode: pending?.promoCode,
      billingProvider: 'paypal',
      paypalSubscriptionId: subscriptionId,
    });
    return res.status(200).json({
      ok: true,
      url: activated.url,
      admin: `${activated.url}/admin/login`,
    });
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'Attivazione non riuscita' });
  }
}
