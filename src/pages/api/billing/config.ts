import type { NextApiRequest, NextApiResponse } from 'next';
import { isAdminAuthenticated } from '@/server/auth';
import { isPlatformHost, withTenantApi } from '@/server/tenant';
import { billingPublic, loadBilling, saveBilling } from '@/server/billing';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!isAdminAuthenticated(req) || !isPlatformHost()) {
    return res.status(401).json({ message: 'Non autenticato' });
  }
  if (req.method === 'GET') {
    return res.status(200).json(billingPublic());
  }
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  const current = loadBilling();
  const body = req.body || {};
  saveBilling({
    ...current,
    clientId: String(body.clientId || current.clientId).trim(),
    secret: String(body.secret || '').trim() || current.secret,
    mode: body.mode === 'sandbox' ? 'sandbox' : 'live',
    webhookId: String(body.webhookId || current.webhookId).trim(),
    enabled: typeof body.enabled === 'boolean' ? body.enabled : current.enabled,
  });
  return res.status(200).json({ message: 'PayPal salvato', ...billingPublic() });
}

export default withTenantApi(handler);
