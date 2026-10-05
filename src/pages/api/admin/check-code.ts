import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import crypto from 'crypto';
import {
  adminConfigPath,
  readAdminConfig,
  verifyTenantAccessCode,
  tenantHasAccessCode,
} from '@/server/adminAccessCode';
import { tenantDataDir, withTenantApi } from '@/server/tenant';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ message: 'Il codice è obbligatorio', valid: false });
    }

    const configPath = adminConfigPath();

    if (!fs.existsSync(configPath)) {
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const config = {
        encryptedAccessCode: null,
        sessionToken,
        createdAt: new Date().toISOString(),
      };
      const configDir = tenantDataDir();
      if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
      res.setHeader('Set-Cookie', `admin_session=${sessionToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`);
      return res.status(200).json({
        valid: true,
        message: 'Accesso consentito (primo accesso)',
        firstAccess: true,
      });
    }

    const config = readAdminConfig();
    if (!config) {
      return res.status(500).json({ valid: false, message: 'Errore nella verifica del codice' });
    }

    if (!tenantHasAccessCode()) {
      const sessionToken = crypto.randomBytes(32).toString('hex');
      config.sessionToken = sessionToken;
      config.updatedAt = new Date().toISOString();
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
      res.setHeader('Set-Cookie', `admin_session=${sessionToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`);
      return res.status(200).json({
        valid: true,
        message: 'Accesso consentito (primo accesso)',
        firstAccess: true,
      });
    }

    if (verifyTenantAccessCode(code)) {
      const sessionToken = crypto.randomBytes(32).toString('hex');
      config.sessionToken = sessionToken;
      config.lastLogin = new Date().toISOString();
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
      res.setHeader('Set-Cookie', `admin_session=${sessionToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`);
      return res.status(200).json({
        valid: true,
        message: 'Accesso consentito',
      });
    }

    return res.status(401).json({
      valid: false,
      message: 'Codice di accesso non valido',
    });
  } catch (error) {
    console.error('Errore nel verificare il codice:', error);
    return res.status(500).json({ message: 'Errore nel verificare il codice', error: String(error) });
  }
}

export default withTenantApi(handler);



