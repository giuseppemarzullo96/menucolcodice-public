import fs from 'fs';
import path from 'path';
import { maskKey } from './integrations';
import { PLAN_CATALOG, type CatalogPlanId } from '@/utils/plans';

export type BillingConfig = {
  clientId: string;
  secret: string;
  mode: 'sandbox' | 'live';
  webhookId: string;
  productId: string;
  planIds: {
    medium: string;
    pro: string;
  };
  /** Interruttore manuale, indipendente dalla presenza delle chiavi: permette di
   * disattivare PayPal temporaneamente (es. manutenzione) senza toccare le chiavi. */
  enabled: boolean;
};

const FILE = path.join(process.cwd(), 'platform', 'billing.json');

const DEFAULTS: BillingConfig = {
  clientId: '',
  secret: '',
  mode: 'live',
  webhookId: '',
  productId: '',
  planIds: { medium: '', pro: '' },
  enabled: true,
};

export function loadBilling(): BillingConfig {
  if (!fs.existsSync(FILE)) return { ...DEFAULTS, planIds: { ...DEFAULTS.planIds } };
  const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  return {
    clientId: raw.clientId || '',
    secret: raw.secret || '',
    mode: raw.mode === 'sandbox' ? 'sandbox' : 'live',
    webhookId: raw.webhookId || '',
    productId: raw.productId || '',
    planIds: {
      medium: raw.planIds?.medium || '',
      pro: raw.planIds?.pro || '',
    },
    // File esistenti creati prima di questo campo non hanno "enabled": trattarli come attivi.
    enabled: raw.enabled !== false,
  };
}

export function saveBilling(next: BillingConfig) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(next, null, 2), 'utf8');
}

export function billingPublic(cfg = loadBilling()) {
  return {
    configured: Boolean(cfg.clientId && cfg.secret),
    mode: cfg.mode,
    clientId: cfg.clientId,
    hasSecret: Boolean(cfg.secret),
    secretMasked: maskKey(cfg.secret),
    webhookId: cfg.webhookId,
    productId: cfg.productId,
    planIds: cfg.planIds,
    enabled: cfg.enabled,
  };
}

function apiBase(cfg: BillingConfig) {
  return cfg.mode === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
}

async function paypalToken(cfg: BillingConfig) {
  if (!cfg.clientId || !cfg.secret) throw new Error('PayPal non è configurato. Inserisci Client ID e Secret nel tab Piattaforma.');
  const res = await fetch(`${apiBase(cfg)}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${cfg.clientId}:${cfg.secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error_description || json.message || 'Autenticazione PayPal fallita');
  return String(json.access_token);
}

async function paypalFetch(cfg: BillingConfig, pathname: string, init?: RequestInit) {
  const token = await paypalToken(cfg);
  const res = await fetch(`${apiBase(cfg)}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  let json: any = {};
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { message: text };
    }
  }
  if (!res.ok) {
    const detail = json.message || json.details?.[0]?.description || text || `PayPal ${res.status}`;
    throw new Error(detail);
  }
  return json;
}

function chargeFor(plan: CatalogPlanId) {
  const row = PLAN_CATALOG.find((item) => item.id === plan);
  return row?.chargeEuro || 0;
}

async function paypalResourceExists(cfg: BillingConfig, pathname: string) {
  try {
    await paypalFetch(cfg, pathname);
    return true;
  } catch {
    return false;
  }
}

async function ensureCatalog(cfg: BillingConfig) {
  let next = { ...cfg, planIds: { ...cfg.planIds } };
  let dirty = false;

  if (next.productId) {
    const ok = await paypalResourceExists(next, `/v1/catalogs/products/${next.productId}`);
    if (!ok) {
      next.productId = '';
      next.planIds = { medium: '', pro: '' };
      dirty = true;
    }
  }

  if (!next.productId) {
    const product = await paypalFetch(next, '/v1/catalogs/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Menu Col Codice',
        type: 'SERVICE',
        description: 'Menu digitale per ristoranti',
      }),
    });
    next.productId = product.id;
    dirty = true;
  }

  for (const plan of ['medium', 'pro'] as const) {
    if (next.planIds[plan]) {
      const ok = await paypalResourceExists(next, `/v1/billing/plans/${next.planIds[plan]}`);
      if (!ok) {
        next.planIds[plan] = '';
        dirty = true;
      }
    }
    if (next.planIds[plan]) continue;
    const created = await paypalFetch(next, '/v1/billing/plans', {
      method: 'POST',
      body: JSON.stringify({
        product_id: next.productId,
        name: plan === 'pro' ? 'Menu Col Codice Pro' : 'Menu Col Codice Media',
        billing_cycles: [
          {
            frequency: { interval_unit: 'MONTH', interval_count: 1 },
            tenure_type: 'REGULAR',
            sequence: 1,
            total_cycles: 0,
            pricing_scheme: {
              fixed_price: { value: chargeFor(plan).toFixed(2), currency_code: 'EUR' },
            },
          },
        ],
        payment_preferences: {
          auto_bill_outstanding: true,
          payment_failure_threshold: 3,
        },
      }),
    });
    next.planIds[plan] = created.id;
    dirty = true;
  }

  if (dirty) saveBilling(next);
  return next;
}

export async function createPaypalSubscription(opts: {
  plan: 'medium' | 'pro';
  slug: string;
  email: string;
  returnUrl: string;
  cancelUrl: string;
  startDelayDays?: number;
  promoCode?: string;
  discountedEuro?: number;
}) {
  const cfg = await ensureCatalog(loadBilling());
  const planId = cfg.planIds[opts.plan];
  if (!planId) throw new Error('Piano PayPal non creato');
  const baseEuro = chargeFor(opts.plan);
  const discountedEuro = opts.discountedEuro;
  const useDiscount =
    discountedEuro != null && discountedEuro > 0 && discountedEuro < baseEuro;
  const body: Record<string, unknown> = {
    plan_id: planId,
    custom_id: opts.slug,
    subscriber: opts.email ? { email_address: opts.email } : undefined,
    application_context: {
      brand_name: 'Menu Col Codice',
      locale: 'it-IT',
      shipping_preference: 'NO_SHIPPING',
      user_action: 'SUBSCRIBE_NOW',
      return_url: opts.returnUrl,
      cancel_url: opts.cancelUrl,
    },
  };
  if (useDiscount) {
    body.plan = {
      billing_cycles: [
        {
          frequency: { interval_unit: 'MONTH', interval_count: 1 },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: { value: discountedEuro.toFixed(2), currency_code: 'EUR' },
          },
        },
      ],
    };
  }
  if (opts.startDelayDays && opts.startDelayDays > 0) {
    const start = new Date();
    start.setUTCDate(start.getUTCDate() + opts.startDelayDays);
    body.start_time = start.toISOString();
  }
  if (opts.promoCode) {
    body.custom_id = `${opts.slug}|${opts.promoCode}`;
  }
  const created = await paypalFetch(cfg, '/v1/billing/subscriptions', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const approve = (created.links || []).find((link: any) => link.rel === 'approve')?.href;
  if (!approve) throw new Error('PayPal non ha restituito il link di pagamento');
  return { id: String(created.id), approveUrl: String(approve) };
}

export async function getPaypalSubscription(id: string) {
  const cfg = loadBilling();
  return paypalFetch(cfg, `/v1/billing/subscriptions/${encodeURIComponent(id)}`);
}

export type PaypalTransactionRow = {
  id: string;
  date: number | null;
  amount: number;
  currency: string;
  status: string;
};

export async function listPaypalSubscriptionTransactions(subscriptionId: string): Promise<PaypalTransactionRow[]> {
  const cfg = loadBilling();
  const end = new Date();
  const start = new Date();
  start.setFullYear(start.getFullYear() - 2);
  const qs = new URLSearchParams({
    start_time: start.toISOString(),
    end_time: end.toISOString(),
  });
  const data = await paypalFetch(
    cfg,
    `/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}/transactions?${qs}`
  );
  const rows = Array.isArray(data.transactions) ? data.transactions : [];
  return rows.map((tx: Record<string, unknown>): PaypalTransactionRow => {
    const gross = (tx.amount_with_breakdown as { gross_amount?: { value?: string; currency_code?: string } })?.gross_amount;
    return {
      id: String(tx.id || ''),
      date: tx.time ? new Date(String(tx.time)).getTime() : null,
      amount: parseFloat(String(gross?.value || '0')) || 0,
      currency: String(gross?.currency_code || 'EUR').toUpperCase(),
      status: String(tx.status || ''),
    };
  });
}

export async function cancelPaypalSubscription(id: string, reason = 'Disdetta dal pannello Menu col codice') {
  const cfg = loadBilling();
  return paypalFetch(cfg, `/v1/billing/subscriptions/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

/** Cambio piano su abbonamento PayPal già attivo (es. Media → Pro). Può richiedere nuova approvazione. */
export async function revisePaypalSubscription(opts: {
  subscriptionId: string;
  plan: 'medium' | 'pro';
  returnUrl: string;
  cancelUrl: string;
}) {
  const cfg = await ensureCatalog(loadBilling());
  const planId = cfg.planIds[opts.plan];
  if (!planId) throw new Error('Piano PayPal non configurato');
  const revised = await paypalFetch(cfg, `/v1/billing/subscriptions/${encodeURIComponent(opts.subscriptionId)}/revise`, {
    method: 'POST',
    body: JSON.stringify({
      plan_id: planId,
      application_context: {
        brand_name: 'Menu Col Codice',
        locale: 'it-IT',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        return_url: opts.returnUrl,
        cancel_url: opts.cancelUrl,
      },
    }),
  });
  const approve = (revised.links || []).find((link: { rel?: string; href?: string }) => link.rel === 'approve')?.href;
  return {
    id: String(revised.id || opts.subscriptionId),
    approveUrl: approve ? String(approve) : null,
  };
}

export function paypalConfigured() {
  const cfg = loadBilling();
  return cfg.enabled && Boolean(cfg.clientId && cfg.secret);
}
