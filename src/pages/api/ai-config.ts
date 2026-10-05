import type { NextApiRequest, NextApiResponse } from 'next';
import { isAdminAuthenticated } from '@/server/auth';
import { loadIntegrations, saveIntegrations, maskKey } from '@/server/integrations';
import { isPlatformHost, withTenantApi } from '@/server/tenant';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!isAdminAuthenticated(req) || !isPlatformHost()) {
    return res.status(401).json({ message: 'Non autenticato' });
  }

  if (req.method === 'GET') {
    const cfg = loadIntegrations();
    return res.status(200).json({
      openai: {
        model: cfg.openai.model,
        hasApiKey: Boolean(cfg.openai.apiKey),
        apiKeyMasked: maskKey(cfg.openai.apiKey),
      },
      deepseek: {
        model: cfg.deepseek.model,
        hasApiKey: Boolean(cfg.deepseek.apiKey),
        apiKeyMasked: maskKey(cfg.deepseek.apiKey),
      },
    });
  }

  if (req.method === 'POST') {
    const current = loadIntegrations();
    const body = req.body || {};
    const next = {
      ...current,
      openai: {
        ...current.openai,
        model: body.openai?.model || current.openai.model,
        apiKey: String(body.openai?.apiKey || '').trim() || current.openai.apiKey,
      },
      deepseek: {
        ...current.deepseek,
        model: body.deepseek?.model || current.deepseek.model,
        apiKey: String(body.deepseek?.apiKey || '').trim() || current.deepseek.apiKey,
      },
    };
    saveIntegrations(next);
    return res.status(200).json({ message: 'Chiavi AI salvate' });
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

export default withTenantApi(handler);
