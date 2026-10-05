import type { NextApiRequest, NextApiResponse } from 'next';
import { isAdminAuthenticated } from '@/server/auth';
import { getPlatformOverview } from '@/server/platformStats';
import { isPlatformHost, withTenantApi } from '@/server/tenant';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });
  if (!isAdminAuthenticated(req) || !isPlatformHost()) {
    return res.status(401).json({ message: 'Non autenticato' });
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json(await getPlatformOverview());
}

export default withTenantApi(handler);
