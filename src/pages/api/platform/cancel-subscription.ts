import type { NextApiRequest, NextApiResponse } from 'next';
import { isAdminAuthenticated } from '@/server/auth';
import { cancelSubscriptionForTenant } from '@/server/subscriptionBilling';
import { getTenantBySlug, isPlatformHost, withTenantApi } from '@/server/tenant';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  if (!isAdminAuthenticated(req) || !isPlatformHost()) {
    return res.status(401).json({ message: 'Non autenticato' });
  }

  const slug = String(req.body?.slug || '').toLowerCase().trim();
  if (!slug) return res.status(400).json({ message: 'Manca il locale' });
  if (slug === 'demo') return res.status(400).json({ message: 'La demo non ha abbonamento' });

  const tenant = getTenantBySlug(slug);
  if (!tenant) return res.status(404).json({ message: 'Locale non trovato' });

  try {
    const result = await cancelSubscriptionForTenant(tenant);
    return res.status(200).json({ slug, ...result });
  } catch (error) {
    return res.status(400).json({
      message: error instanceof Error ? error.message : 'Disdetta non riuscita',
    });
  }
}

export default withTenantApi(handler);
