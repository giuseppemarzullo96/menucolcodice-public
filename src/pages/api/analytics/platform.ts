import type { NextApiRequest, NextApiResponse } from 'next';
import { isAdminAuthenticated } from '@/server/auth';
import { summarizePlatform } from '@/server/analyticsStore';
import { isPlatformHost, withTenantApi } from '@/server/tenant';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });
  if (!isAdminAuthenticated(req) || !isPlatformHost()) {
    return res.status(401).json({ message: 'Non autenticato' });
  }
  const days = Number(req.query.days) || 30;
  return res.status(200).json(summarizePlatform(days));
}

export default withTenantApi(handler);
