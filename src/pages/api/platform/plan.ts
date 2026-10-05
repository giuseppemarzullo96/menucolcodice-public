import type { NextApiRequest, NextApiResponse } from 'next';
import { isAdminAuthenticated } from '@/server/auth';
import { getTenantBySlug, isPlatformHost, patchTenant, type PlanId, withTenantApi } from '@/server/tenant';

const PLANS: PlanId[] = ['free', 'medium', 'pro'];

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  if (!isAdminAuthenticated(req) || !isPlatformHost()) {
    return res.status(401).json({ message: 'Non autenticato' });
  }

  const slug = String(req.body?.slug || '').toLowerCase().trim();
  const plan = String(req.body?.plan || '').toLowerCase().trim() as PlanId;
  if (!slug) return res.status(400).json({ message: 'Manca il locale' });
  if (slug === 'demo') return res.status(400).json({ message: 'La demo resta Pro' });
  if (!PLANS.includes(plan)) return res.status(400).json({ message: 'Piano non valido' });

  const tenant = getTenantBySlug(slug);
  if (!tenant) return res.status(404).json({ message: 'Locale non trovato' });

  const next = patchTenant(slug, { plan });
  return res.status(200).json({
    message: 'Piano aggiornato',
    slug: next?.slug,
    plan: next?.plan,
  });
}

export default withTenantApi(handler);
