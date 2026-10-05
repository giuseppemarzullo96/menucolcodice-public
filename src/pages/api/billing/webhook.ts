import type { NextApiRequest, NextApiResponse } from 'next';
import { getPaypalSubscription } from '@/server/billing';
import { activateAccount, findPendingSignup, takePendingSignup } from '@/server/signup';
import { downgradeTenantToFree } from '@/server/subscriptionBilling';

export const config = { api: { bodyParser: { sizeLimit: '2mb' } } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  const event = String(req.body?.event_type || '');
  const resource = req.body?.resource || {};
  if (!event.toLowerCase().includes('subscription')) {
    return res.status(200).json({ ignored: true });
  }
  const id = String(resource.id || '');
  if (!id) return res.status(200).json({ ignored: true });

  try {
    const sub = await getPaypalSubscription(id);
    const status = String(sub.status || resource.status || '').toUpperCase();
    const slug = String(sub.custom_id || findPendingSignup(id)?.slug || '').toLowerCase();

    if (['CANCELLED', 'EXPIRED'].includes(status)) {
      if (slug) downgradeTenantToFree(slug);
      return res.status(200).json({ ok: true, slug, downgraded: true, status });
    }

    if (!['ACTIVE', 'APPROVED'].includes(status)) {
      return res.status(200).json({ ignored: true, status });
    }
    const pending = findPendingSignup(id) || (slug ? findPendingSignup(slug) : null);
    const finalSlug = slug || pending?.slug || '';
    if (!finalSlug) return res.status(200).json({ ignored: true, reason: 'no-slug' });
    takePendingSignup(finalSlug);
    await activateAccount({
      slug: finalSlug,
      name: pending?.name || finalSlug,
      plan: pending?.plan === 'pro' ? 'pro' : 'medium',
      email: pending?.email || resource.subscriber?.email_address,
      billingProvider: 'paypal',
      paypalSubscriptionId: id,
    });
    return res.status(200).json({ ok: true, slug: finalSlug });
  } catch (error) {
    console.error('PayPal webhook', error);
    return res.status(500).json({ message: 'Webhook PayPal non gestito' });
  }
}
