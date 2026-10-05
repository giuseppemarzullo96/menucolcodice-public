import type { NextApiRequest, NextApiResponse } from 'next';
import { isAdminAuthenticated } from '@/server/auth';
import { cancelSubscriptionForTenant } from '@/server/subscriptionBilling';
import { currentTenant, withTenantApi } from '@/server/tenant';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  if (!isAdminAuthenticated(req)) return res.status(401).json({ message: 'Non autenticato' });

  const tenant = currentTenant();
  try {
    const result = await cancelSubscriptionForTenant(tenant);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      message: error instanceof Error ? error.message : 'Disdetta non riuscita',
    });
  }
}

export default withTenantApi(handler);
