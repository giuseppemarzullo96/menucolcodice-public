import type { NextApiRequest, NextApiResponse } from 'next';
import { tenantHasAccessCode } from '@/server/adminAccessCode';
import { withTenantApi } from '@/server/tenant';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    return res.status(200).json({ hasCode: tenantHasAccessCode(), code: null });
  } catch (error) {
    console.error('Errore nel leggere il codice di accesso:', error);
    return res.status(500).json({ message: 'Errore nel leggere il codice', error: String(error) });
  }
}

export default withTenantApi(handler);
