import type { NextApiRequest, NextApiResponse } from 'next';
import { isAdminAuthenticated } from '@/server/auth';
import {
  currentTenant,
  normalizePhone,
  patchTenant,
  tenantPublic,
  WhatsAppNumberTakenError,
  withTenantApi,
} from '@/server/tenant';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return res.status(200).json(tenantPublic());
  }

  if (req.method === 'POST') {
    if (!isAdminAuthenticated(req)) {
      return res.status(401).json({ message: 'Non autenticato' });
    }
    const tenant = currentTenant();
    if (!tenantPublic(tenant).whatsapp) {
      return res.status(403).json({ message: 'WhatsApp è disponibile solo nel piano Pro.' });
    }
    const numbers = Array.isArray(req.body?.whatsappNumbers)
      ? req.body.whatsappNumbers
      : String(req.body?.whatsappNumber || '').split(/[\s,;]+/);
    try {
      const next = patchTenant(tenant.slug, {
        whatsappNumbers: numbers.map((n: string) => normalizePhone(n)).filter(Boolean),
      });
      return res.status(200).json(tenantPublic(next || tenant));
    } catch (error) {
      if (error instanceof WhatsAppNumberTakenError) {
        return res.status(409).json({ message: error.message });
      }
      throw error;
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

export default withTenantApi(handler);
