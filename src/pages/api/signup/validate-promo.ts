import type { NextApiRequest, NextApiResponse } from 'next';
import type { PlanId } from '@/server/tenant';
import { validatePromoCode } from '@/server/promoCodes';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const code = String(req.body?.code || '').trim();
  const plan = (req.body?.plan === 'pro' ? 'pro' : req.body?.plan === 'medium' ? 'medium' : 'free') as PlanId;

  try {
    const resolved = validatePromoCode(code, plan);
    return res.status(200).json({
      ok: true,
      code: resolved.code,
      label: resolved.label,
      type: resolved.type,
      value: resolved.value,
      discountedChargeEuro: resolved.discountedChargeEuro,
    });
  } catch (error) {
    return res.status(400).json({
      message: error instanceof Error ? error.message : 'Codice non valido',
    });
  }
}
