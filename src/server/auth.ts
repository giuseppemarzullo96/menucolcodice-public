import type { NextApiRequest } from 'next';
import fs from 'fs';
import path from 'path';
import { tenantDataDir } from '@/server/tenant';

export function isAdminAuthenticated(req: NextApiRequest): boolean {
  const configPath = path.join(tenantDataDir(), 'admin-config.json');
  if (!fs.existsSync(configPath)) return true;

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (!config.encryptedAccessCode) return true;

  const sessionToken = req.cookies['admin_session'];
  return Boolean(sessionToken && config.sessionToken === sessionToken);
}
