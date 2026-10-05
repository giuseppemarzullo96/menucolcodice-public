import type { NextApiRequest, NextApiResponse } from 'next';
import { isAdminAuthenticated } from '@/server/auth';
import { isPlatformHost, withTenantApi } from '@/server/tenant';
import {
  loadStripeConfig,
  saveStripeConfig,
  stripePublic,
  validateStripeSecretKey,
  validateStripeWebhookSecret,
} from '@/server/stripeBilling';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!isAdminAuthenticated(req) || !isPlatformHost()) {
    return res.status(401).json({ message: 'Non autenticato' });
  }
  if (req.method === 'GET') {
    return res.status(200).json(stripePublic());
  }
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  const current = loadStripeConfig();
  const body = req.body || {};
  const secretKey = String(body.secretKey || '').trim() || current.secretKey;
  const webhookSecret = String(body.webhookSecret || '').trim() || current.webhookSecret;

  if (String(body.secretKey || '').trim()) {
    const secretError = validateStripeSecretKey(secretKey);
    if (secretError) return res.status(400).json({ message: secretError });
  } else if (secretKey && validateStripeSecretKey(secretKey)) {
    return res.status(400).json({
      message:
        'La Secret key salvata non è valida. Incolla quella corretta (sk_test_… o sk_live_…), non mk_ né pk_.',
    });
  }

  if (String(body.webhookSecret || '').trim()) {
    const webhookError = validateStripeWebhookSecret(webhookSecret);
    if (webhookError) return res.status(400).json({ message: webhookError });
  }

  saveStripeConfig({
    ...current,
    secretKey,
    webhookSecret,
    enabled: typeof body.enabled === 'boolean' ? body.enabled : current.enabled,
  });
  return res.status(200).json({ message: 'Stripe salvato', ...stripePublic() });
}

export default withTenantApi(handler);
