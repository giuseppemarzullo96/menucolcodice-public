import type { NextApiRequest, NextApiResponse } from 'next';
import { isAdminAuthenticated } from '@/server/auth';
import { loadIntegrations, saveIntegrations, maskKey } from '@/server/integrations';
import { isPlatformHost, withTenantApi } from '@/server/tenant';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!isAdminAuthenticated(req) || !isPlatformHost()) {
    return res.status(401).json({ message: 'Non autenticato' });
  }

  if (req.method === 'GET') {
    const tripo3d = loadIntegrations().tripo3d;
    return res.status(200).json({
      hasApiKey: Boolean(tripo3d.apiKey),
      apiKeyMasked: maskKey(tripo3d.apiKey),
    });
  }

  if (req.method === 'POST') {
    const current = loadIntegrations();
    const apiKey = String(req.body?.apiKey || '').trim() || current.tripo3d.apiKey;
    saveIntegrations({
      ...current,
      tripo3d: { apiKey },
    });
    return res.status(200).json({ message: 'Tripo3D salvato' });
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

export default withTenantApi(handler);
