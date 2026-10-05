import type { NextApiRequest, NextApiResponse } from 'next';
import { isAdminAuthenticated } from '@/server/auth';
import { summarizeTenant } from '@/server/analyticsStore';
import { assertAnalyticsAllowed, currentTenant, PlanLimitError, withTenantApi } from '@/server/tenant';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });
  if (!isAdminAuthenticated(req)) return res.status(401).json({ message: 'Non autenticato' });
  const tenant = currentTenant();
  if (!tenant) return res.status(404).json({ message: 'Locale non trovato' });
  try {
    assertAnalyticsAllowed();
  } catch (error) {
    if (error instanceof PlanLimitError) {
      return res.status(403).json({ message: error.message, code: error.code });
    }
    throw error;
  }
  const days = Number(req.query.days) || 30;
  return res.status(200).json(summarizeTenant(tenant.slug, days));
}

export default withTenantApi(handler);
