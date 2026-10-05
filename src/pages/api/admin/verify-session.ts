import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { tenantDataDir, withTenantApi } from '@/server/tenant';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const configPath = path.join(tenantDataDir(), 'admin-config.json');
    
    // Se non esiste il file di configurazione, non c'è un codice configurato
    // quindi permette l'accesso (primo accesso)
    if (!fs.existsSync(configPath)) {
      return res.status(200).json({ authenticated: true, firstAccess: true });
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Se non c'è un codice configurato, permette l'accesso
    if (!config.encryptedAccessCode) {
      return res.status(200).json({ authenticated: true, firstAccess: true });
    }

    // Se c'è un codice configurato, verifica la sessione
    const sessionToken = req.cookies['admin_session'];
    
    if (!sessionToken) {
      return res.status(200).json({ authenticated: false });
    }
    
    if (config.sessionToken === sessionToken) {
      return res.status(200).json({ authenticated: true });
    }

    return res.status(200).json({ authenticated: false });
  } catch (error) {
    console.error('Errore nella verifica della sessione:', error);
    res.status(500).json({ message: 'Errore nella verifica', error: String(error) });
  }
}

export default withTenantApi(handler);
