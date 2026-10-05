import { spawn, execFileSync } from 'child_process';
import fs from 'fs';
import https from 'https';
import path from 'path';

function run(cmd: string, args: string[], timeoutMs = 60000) {
  return execFileSync(cmd, args, { timeout: timeoutMs, encoding: 'utf8' });
}

export function tenantFqdn(slug: string) {
  return `${String(slug || '').toLowerCase().trim()}.menucolcodice.it`;
}

function confDir(slug: string) {
  return `/var/www/vhosts/system/${tenantFqdn(slug)}/conf`;
}

export function tenantSslMarkerReady(slug: string) {
  const dir = confDir(slug);
  return fs.existsSync(path.join(dir, 'vhost_nginx.conf')) && fs.existsSync(path.join(dir, '.ssl-ready'));
}

/** Controlla che HTTPS risponda con certificato valido (niente self-signed / authority invalid). */
export function verifyTenantHttps(slug: string, timeoutMs = 10000): Promise<boolean> {
  const host = tenantFqdn(slug);
  return new Promise((resolve) => {
    const req = https.get(
      {
        hostname: host,
        port: 443,
        path: '/',
        servername: host,
        method: 'GET',
        timeout: timeoutMs,
        rejectUnauthorized: true,
        headers: { Host: host, 'User-Agent': 'MenuColCodice-ssl-check' },
      },
      (res) => {
        res.resume();
        const code = res.statusCode || 0;
        resolve(code > 0 && code < 500);
      }
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

export async function tenantHostReady(slug: string) {
  if (!tenantSslMarkerReady(slug)) return false;
  return verifyTenantHttps(slug);
}

export async function waitUntilTenantHttpsReady(slug: string, opts?: { timeoutMs?: number; intervalMs?: number }) {
  const timeoutMs = opts?.timeoutMs ?? 8 * 60 * 1000;
  const intervalMs = opts?.intervalMs ?? 4000;
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await verifyTenantHttps(slug)) return true;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}

export function provisionSubdomainLater(slug: string) {
  const clean = String(slug || '').toLowerCase().trim();
  if (!clean || clean === 'demo') return;
  const script = path.join(process.cwd(), 'scripts', 'provision-host.sh');
  const child = spawn('bash', [script, clean], {
    detached: true,
    stdio: 'ignore',
    cwd: process.cwd(),
  });
  child.unref();
}

export function removeSubdomain(slug: string) {
  const clean = String(slug || '').toLowerCase().trim();
  if (!clean || clean === 'demo') return;
  try {
    run('plesk', ['bin', 'subdomain', '--remove', clean, '-domain', 'menucolcodice.it'], 30000);
  } catch (error) {
    console.error('Rimozione sottodominio', clean, error);
  }
}

export function provisionSubdomain(slug: string) {
  provisionSubdomainLater(slug);
  return `https://${tenantFqdn(slug)}`;
}
