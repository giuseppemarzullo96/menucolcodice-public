import type { NextApiRequest, NextApiResponse } from 'next';
import { isAdminAuthenticated } from '@/server/auth';
import { startUpgradeForTenant } from '@/server/subscriptionBilling';
import { currentTenant, withTenantApi } from '@/server/tenant';

function origin(req: NextApiRequest) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'menucolcodice.it').split(',')[0];
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  return `${proto}://${host}`;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  if (!isAdminAuthenticated(req)) return res.status(401).json({ message: 'Non autenticato' });

  const tenant = currentTenant();
  const plan = req.body?.plan === 'pro' ? 'pro' : req.body?.plan === 'medium' ? 'medium' : null;
  const method = req.body?.method === 'paypal' ? 'paypal' : req.body?.method === 'stripe' ? 'stripe' : null;

  if (!plan) return res.status(400).json({ message: 'Scegli un piano (Media o Pro).' });
  if (!method) return res.status(400).json({ message: 'Scegli un metodo di pagamento.' });

  try {
    const result = await startUpgradeForTenant(tenant, plan, method, origin(req));
    return res.status(200).json({ ok: true, ...result });
  } catch (error) {
    return res.status(400).json({
      message: error instanceof Error ? error.message : 'Upgrade non riuscito',
    });
  }
}

export default withTenantApi(handler);
