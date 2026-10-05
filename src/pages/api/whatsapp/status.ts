import type { NextApiRequest, NextApiResponse } from 'next';
import { isAdminAuthenticated } from '@/server/auth';
import { evolutionQr, evolutionStatus, extractWhatsAppQr } from '@/server/whatsapp';
import { isPlatformHost, withTenantApi } from '@/server/tenant';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!isAdminAuthenticated(req) || !isPlatformHost()) {
    return res.status(401).json({ message: 'Non autenticato' });
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const status = await evolutionStatus();
    let qr = { code: '', pairingCode: '', image: '', count: null as number | null };
    if (status.configured && !status.connected) {
      try {
        qr = extractWhatsAppQr(await evolutionQr());
      } catch {
        qr = { code: '', pairingCode: '', image: '', count: null };
      }
    }
    return res.status(200).json({ ...status, qr });
  } catch (error) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'Errore Evolution API',
    });
  }
}

export default withTenantApi(handler);
