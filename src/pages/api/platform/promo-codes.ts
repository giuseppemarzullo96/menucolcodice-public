import type { NextApiRequest, NextApiResponse } from 'next';
import { isAdminAuthenticated } from '@/server/auth';
import {
  createPromoCode,
  deletePromoCode,
  listPromoCodes,
  promoPublicSummary,
  updatePromoCode,
  type PromoCodeType,
} from '@/server/promoCodes';
import { isPlatformHost, withTenantApi, type PlanId } from '@/server/tenant';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!isAdminAuthenticated(req) || !isPlatformHost()) {
    return res.status(401).json({ message: 'Non autenticato' });
  }

  if (req.method === 'GET') {
    return res.status(200).json({ codes: listPromoCodes().map(promoPublicSummary) });
  }

  if (req.method === 'POST') {
    try {
      const type = String(req.body?.type || 'percent') as PromoCodeType;
      const row = await createPromoCode({
        code: String(req.body?.code || ''),
        type: type === 'free_months' || type === 'free_year' ? type : 'percent',
        value: Number(req.body?.value || 0),
        label: String(req.body?.label || ''),
        active: req.body?.active !== false,
        expiresAt: req.body?.expiresAt ? Number(req.body.expiresAt) : null,
        maxUses: req.body?.maxUses != null && req.body.maxUses !== '' ? Number(req.body.maxUses) : null,
        plans: Array.isArray(req.body?.plans) ? (req.body.plans as PlanId[]) : [],
      });
      return res.status(200).json({ ok: true, code: promoPublicSummary(row) });
    } catch (error) {
      return res.status(400).json({ message: error instanceof Error ? error.message : 'Errore' });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const id = String(req.body?.id || '');
      const row = await updatePromoCode(id, {
        label: req.body?.label != null ? String(req.body.label) : undefined,
        active: typeof req.body?.active === 'boolean' ? req.body.active : undefined,
        expiresAt: req.body?.expiresAt === null ? null : req.body?.expiresAt ? Number(req.body.expiresAt) : undefined,
        maxUses: req.body?.maxUses === null ? null : req.body?.maxUses != null && req.body.maxUses !== '' ? Number(req.body.maxUses) : undefined,
      });
      return res.status(200).json({ ok: true, code: promoPublicSummary(row) });
    } catch (error) {
      return res.status(400).json({ message: error instanceof Error ? error.message : 'Errore' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      deletePromoCode(String(req.body?.id || req.query.id || ''));
      return res.status(200).json({ ok: true });
    } catch (error) {
      return res.status(400).json({ message: error instanceof Error ? error.message : 'Errore' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

export default withTenantApi(handler);
