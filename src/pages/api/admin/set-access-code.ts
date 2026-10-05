import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import crypto from 'crypto';
import { adminConfigPath, readAdminConfig, saveTenantAccessCode, tenantHasAccessCode } from '@/server/adminAccessCode';
import { tenantDataDir, withTenantApi } from '@/server/tenant';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { code } = req.body;

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return res.status(400).json({ message: 'Il codice è obbligatorio' });
    }

    const configDir = tenantDataDir();
    if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });

    if (tenantHasAccessCode()) {
      const sessionToken = req.cookies['admin_session'];
      if (!sessionToken) return res.status(401).json({ message: 'Non autorizzato' });
      const config = readAdminConfig();
      if (!config || config.sessionToken !== sessionToken) {
        return res.status(401).json({ message: 'Sessione non valida' });
      }
    }

    saveTenantAccessCode(code.trim());
    const configPath = adminConfigPath();
    const config = readAdminConfig() || {};

    if (!config.sessionToken) {
      const newSessionToken = req.cookies['admin_session'] || crypto.randomBytes(32).toString('hex');
      config.sessionToken = newSessionToken;
      if (!req.cookies['admin_session']) {
        res.setHeader('Set-Cookie', `admin_session=${newSessionToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`);
      }
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');

    return res.status(200).json({ message: 'Codice di accesso salvato con successo!' });
  } catch (error) {
    console.error('Errore nel salvare il codice di accesso:', error);
    return res.status(500).json({ message: 'Errore nel salvare il codice', error: String(error) });
  }
}

export default withTenantApi(handler);
