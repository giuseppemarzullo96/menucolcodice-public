import type { NextApiRequest, NextApiResponse } from 'next';
import { isAdminAuthenticated } from '@/server/auth';
import { completeUpgradeForTenant } from '@/server/subscriptionBilling';
import { currentTenant, withTenantApi } from '@/server/tenant';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  if (!isAdminAuthenticated(req)) return res.status(401).json({ message: 'Non autenticato' });

  const tenant = currentTenant();
  const sessionId = String(req.body?.sessionId || req.query.session_id || '').trim();
  const subscriptionId = String(req.body?.subscriptionId || req.query.subscription_id || '').trim();

  try {
    const result = await completeUpgradeForTenant(tenant, { sessionId, subscriptionId });
    return res.status(200).json({ ok: true, ...result });
  } catch (error) {
    return res.status(400).json({
      message: error instanceof Error ? error.message : 'Attivazione upgrade non riuscita',
    });
  }
}

export default withTenantApi(handler);
