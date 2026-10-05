import type { NextApiRequest, NextApiResponse } from 'next';
import { isAdminAuthenticated } from '@/server/auth';
import { summarizePlatformAiUsage, currentMonthKey } from '@/server/aiUsageStore';
import { withTenantApi, currentTenant } from '@/server/tenant';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });
  if (!isAdminAuthenticated(req)) return res.status(401).json({ message: 'Non autenticato' });

  const tenant = currentTenant();
  if (tenant.slug !== 'demo') {
    return res.status(403).json({ message: 'Solo dalla piattaforma' });
  }

  const month = String(req.query.month || currentMonthKey());
  return res.status(200).json(summarizePlatformAiUsage(month));
}

export default withTenantApi(handler);
