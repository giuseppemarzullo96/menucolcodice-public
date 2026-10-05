import type { NextApiRequest, NextApiResponse } from 'next';
import { isAdminAuthenticated } from '@/server/auth';
import { createStripePortalSession, stripeConfigured } from '@/server/stripeBilling';
import { currentTenant, withTenantApi } from '@/server/tenant';

function origin(req: NextApiRequest) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'menucolcodice.it').split(',')[0];
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  return `${proto}://${host}`;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  if (!isAdminAuthenticated(req)) return res.status(401).json({ message: 'Non autenticato' });
  if (!stripeConfigured()) return res.status(503).json({ message: 'Stripe non è collegato.' });

  const tenant = currentTenant();
  if (!tenant.stripeCustomerId) {
    return res.status(400).json({ message: 'Nessun cliente Stripe collegato a questo locale.' });
  }

  try {
    const url = await createStripePortalSession(tenant.stripeCustomerId, `${origin(req)}/admin?tab=subscription`);
    return res.status(200).json({ ok: true, url });
  } catch (error) {
    return res.status(400).json({
      message: error instanceof Error ? error.message : 'Portale Stripe non disponibile',
    });
  }
}

export default withTenantApi(handler);
