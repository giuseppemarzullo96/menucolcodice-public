import type { NextApiRequest, NextApiResponse } from 'next';
import { isAdminAuthenticated } from '@/server/auth';
import { loadIntegrations, saveIntegrations, maskKey } from '@/server/integrations';
import { ensureEvolutionInstance, normalizePhone, setEvolutionWebhook } from '@/server/whatsapp';
import { isPlatformHost, withTenantApi } from '@/server/tenant';

function firstHeader(value?: string | string[]) {
  const raw = Array.isArray(value) ? value.join(',') : value || '';
  return raw.split(',')[0].trim();
}

function publicAppOrigin(req: NextApiRequest) {
  const host =
    firstHeader(req.headers['x-forwarded-host']) ||
    firstHeader(req.headers.host) ||
    'demo.menucolcodice.it';
  return `https://${host}`;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!isAdminAuthenticated(req) || !isPlatformHost()) {
    return res.status(401).json({ message: 'Non autenticato' });
  }

  if (req.method === 'GET') {
    const cfg = loadIntegrations();
    const origin = publicAppOrigin(req);
    return res.status(200).json({
      evolution: {
        baseUrl: cfg.evolution.baseUrl,
        instance: cfg.evolution.instance,
        allowedNumbers: cfg.evolution.allowedNumbers,
        apiKeyMasked: maskKey(cfg.evolution.apiKey),
        hasApiKey: Boolean(cfg.evolution.apiKey),
      },
      webhookUrl: `${origin}/api/whatsapp/webhook?token=${cfg.webhookToken}`,
    });
  }

  if (req.method === 'POST') {
    const current = loadIntegrations();
    const body = req.body || {};
    const next = {
      ...current,
      evolution: {
        ...current.evolution,
        ...(body.evolution || {}),
        apiKey: String(body.evolution?.apiKey || '').trim() || current.evolution.apiKey,
        allowedNumbers: Array.isArray(body.evolution?.allowedNumbers)
          ? body.evolution.allowedNumbers.map((n: string) => normalizePhone(n)).filter(Boolean)
          : current.evolution.allowedNumbers,
      },
    };
    saveIntegrations(next);

    let webhookSet = false;
    let warning = '';
    try {
      if (next.evolution.apiKey) {
        await ensureEvolutionInstance();
        await setEvolutionWebhook(`${publicAppOrigin(req)}/api/whatsapp/webhook?token=${next.webhookToken}`);
        webhookSet = true;
      }
    } catch (error) {
      warning = error instanceof Error ? error.message : String(error);
    }

    return res.status(200).json({
      message: 'Configurazione salvata',
      webhookSet,
      warning,
    });
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

export default withTenantApi(handler);
