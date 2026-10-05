import type { NextApiRequest, NextApiResponse } from 'next';
import type Stripe from 'stripe';
import { constructStripeEvent } from '@/server/stripeBilling';
import { activateAccount, findPendingSignup, takePendingSignup } from '@/server/signup';
import { downgradeTenantToFree } from '@/server/subscriptionBilling';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function rawBody(req: NextApiRequest) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

function planFromMeta(meta: Stripe.Metadata | null | undefined): 'medium' | 'pro' {
  return meta?.plan === 'pro' ? 'pro' : 'medium';
}

async function activateFromSession(session: Stripe.Checkout.Session) {
  const slug = String(session.metadata?.slug || '').toLowerCase().trim();
  const pending =
    findPendingSignup(session.id) ||
    (slug ? findPendingSignup(slug) : null) ||
    (typeof session.subscription === 'string' ? findPendingSignup(session.subscription) : null);
  const finalSlug = slug || pending?.slug || '';
  if (!finalSlug) return { ignored: true, reason: 'no-slug' as const };

  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription && typeof session.subscription === 'object'
        ? session.subscription.id
        : '';

  takePendingSignup(finalSlug);
  await activateAccount({
    slug: finalSlug,
    name: pending?.name || session.metadata?.name || finalSlug,
    plan: planFromMeta(session.metadata) || (pending?.plan === 'pro' ? 'pro' : 'medium'),
    email: pending?.email || session.customer_details?.email || session.customer_email || undefined,
    billingProvider: 'stripe',
    stripeCustomerId: typeof session.customer === 'string' ? session.customer : undefined,
    stripeSubscriptionId: subscriptionId || undefined,
    stripeSessionId: session.id,
  });
  return { ok: true as const, slug: finalSlug };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const signature = String(req.headers['stripe-signature'] || '');
  if (!signature) return res.status(400).json({ message: 'Manca la firma Stripe' });

  try {
    const body = await rawBody(req);
    const event = constructStripeEvent(body, signature);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== 'subscription') {
        return res.status(200).json({ ignored: true });
      }
      const result = await activateFromSession(session);
      return res.status(200).json(result);
    }

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
      const sub = event.data.object as Stripe.Subscription;
      const slug = String(sub.metadata?.slug || '').toLowerCase().trim();
      if (!slug) return res.status(200).json({ ignored: true });
      if (['canceled', 'unpaid', 'incomplete_expired'].includes(sub.status)) {
        downgradeTenantToFree(slug);
        return res.status(200).json({ ok: true, slug, downgraded: true });
      }
      if (!['active', 'trialing'].includes(sub.status)) {
        return res.status(200).json({ ignored: true, status: sub.status });
      }
      const pending = findPendingSignup(slug) || findPendingSignup(sub.id);
      takePendingSignup(slug);
      await activateAccount({
        slug,
        name: pending?.name || sub.metadata?.name || slug,
        plan: planFromMeta(sub.metadata) || (pending?.plan === 'pro' ? 'pro' : 'medium'),
        email: pending?.email,
        billingProvider: 'stripe',
        stripeCustomerId: typeof sub.customer === 'string' ? sub.customer : undefined,
        stripeSubscriptionId: sub.id,
      });
      return res.status(200).json({ ok: true, slug });
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      const slug = String(sub.metadata?.slug || '').toLowerCase().trim();
      if (!slug) return res.status(200).json({ ignored: true });
      downgradeTenantToFree(slug);
      return res.status(200).json({ ok: true, slug, downgraded: true });
    }

    return res.status(200).json({ ignored: true, type: event.type });
  } catch (error) {
    console.error('Stripe webhook', error);
    return res.status(400).json({ message: error instanceof Error ? error.message : 'Webhook Stripe non gestito' });
  }
}
