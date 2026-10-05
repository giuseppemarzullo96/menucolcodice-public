import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import { adminConfigPath, readAdminConfig, tenantHasAccessCode, regenerateTenantAccessCode } from '@/server/adminAccessCode';
import { currentTenant, withTenantApi } from '@/server/tenant';
import { sendAccessCodeRecoveryEmail } from '@/server/transactionalMail';

const COOLDOWN_MS = 15 * 60 * 1000;

// Risposta identica in ogni caso (email mancante, nessun codice da recuperare, cooldown
// attivo, invio riuscito): non riveliamo a chi non è già loggato se un'email è
// configurata per questo locale, per non dare a un estraneo un modo per scoprirlo.
const GENERIC_MESSAGE = 'Se per questo locale è configurata un\'email di recupero, a breve arriverà un nuovo codice di accesso.';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const tenant = currentTenant();
    const email = String(tenant.email || '').trim();

    if (!email || !tenantHasAccessCode()) {
      return res.status(200).json({ message: GENERIC_MESSAGE });
    }

    const config = readAdminConfig() || {};
    const lastRecoveryAt = config.lastRecoveryAt ? new Date(config.lastRecoveryAt).getTime() : 0;
    if (Date.now() - lastRecoveryAt < COOLDOWN_MS) {
      return res.status(200).json({ message: GENERIC_MESSAGE });
    }

    const newCode = regenerateTenantAccessCode();
    const updated = readAdminConfig() || {};
    updated.lastRecoveryAt = new Date().toISOString();
    fs.writeFileSync(adminConfigPath(), JSON.stringify(updated, null, 2), 'utf8');

    const proto = req.headers['x-forwarded-proto'] || 'https';
    const url = `${proto}://${req.headers.host}`;
    await sendAccessCodeRecoveryEmail({ email, name: tenant.name, url, accessCode: newCode });

    return res.status(200).json({ message: GENERIC_MESSAGE });
  } catch (error) {
    console.error('Errore nel recupero del codice di accesso:', error);
    // Anche in errore: stesso messaggio generico, il dettaglio resta solo nei log server.
    return res.status(200).json({ message: GENERIC_MESSAGE });
  }
}

export default withTenantApi(handler);
