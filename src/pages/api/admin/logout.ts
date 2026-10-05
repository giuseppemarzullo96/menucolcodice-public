import type { NextApiRequest, NextApiResponse } from 'next';
import { withTenantApi } from '@/server/tenant';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Elimina il cookie di sessione
    res.setHeader('Set-Cookie', 'admin_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    
    res.status(200).json({ message: 'Logout effettuato con successo' });
  } catch (error) {
    console.error('Errore nel logout:', error);
    res.status(500).json({ message: 'Errore nel logout', error: String(error) });
  }
}

export default withTenantApi(handler);
