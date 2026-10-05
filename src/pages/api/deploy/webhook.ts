import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

const DEPLOY_SCRIPT = path.join(process.cwd(), 'scripts', 'deploy.sh');
const DEPLOY_LOG = '/var/www/vhosts/demo.menucolcodice.it/logs/deploy-webhook.log';

async function rawBody(req: NextApiRequest) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

function verifyGithubSignature(body: Buffer, signature: string, secret: string) {
  if (!signature.startsWith('sha256=')) return false;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  const received = signature.slice('sha256='.length);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
  } catch {
    return false;
  }
}

function startDeploy() {
  fs.mkdirSync(path.dirname(DEPLOY_LOG), { recursive: true });
  const logFd = fs.openSync(DEPLOY_LOG, 'a');
  const stamp = new Date().toISOString();
  fs.writeSync(logFd, `\n--- deploy avviato ${stamp} ---\n`);

  const child = spawn('bash', [DEPLOY_SCRIPT], {
    detached: true,
    stdio: ['ignore', logFd, logFd],
    env: process.env,
  });
  child.unref();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const secret = String(process.env.DEPLOY_WEBHOOK_SECRET || '').trim();
  if (!secret) {
    return res.status(503).json({ message: 'Deploy webhook non configurato' });
  }

  const signature = String(req.headers['x-hub-signature-256'] || '');
  const body = await rawBody(req);
  if (!verifyGithubSignature(body, signature, secret)) {
    return res.status(401).json({ message: 'Firma non valida' });
  }

  let payload: { zen?: string; ref?: string; repository?: { full_name?: string } } = {};
  try {
    payload = JSON.parse(body.toString('utf8'));
  } catch {
    return res.status(400).json({ message: 'Payload non valido' });
  }

  if (payload.zen) {
    return res.status(200).json({ ok: true, ping: true });
  }

  if (payload.ref !== 'refs/heads/main') {
    return res.status(200).json({ ok: true, skipped: true, ref: payload.ref || null });
  }

  if (!fs.existsSync(DEPLOY_SCRIPT)) {
    return res.status(500).json({ message: 'Script deploy mancante' });
  }

  startDeploy();
  return res.status(202).json({
    ok: true,
    accepted: true,
    repo: payload.repository?.full_name || null,
  });
}
