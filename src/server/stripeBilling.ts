import fs from 'fs';
import path from 'path';
import Stripe from 'stripe';
import { maskKey } from './integrations';
import { PLAN_CATALOG, type CatalogPlanId } from '@/utils/plans';

export type StripeConfig = {
  secretKey: string;
  webhookSecret: string;
  productId: string;
  priceIds: {
    medium: string;
    pro: string;
  };
  /** Interruttore manuale, indipendente dalla presenza delle chiavi: permette di
   * disattivare Stripe temporaneamente (es. manutenzione) senza toccare le chiavi. */
  enabled: boolean;
};

const FILE = path.join(process.cwd(), 'platform', 'stripe.json');

const DEFAULTS: StripeConfig = {
  secretKey: '',
  webhookSecret: '',
  productId: '',
  priceIds: { medium: '', pro: '' },
  enabled: true,
};

export function loadStripeConfig(): StripeConfig {
  if (!fs.existsSync(FILE)) return { ...DEFAULTS, priceIds: { ...DEFAULTS.priceIds } };
  const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  return {
    secretKey: raw.secretKey || '',
    webhookSecret: raw.webhookSecret || '',
    productId: raw.productId || '',
    priceIds: {
      medium: raw.priceIds?.medium || '',
      pro: raw.priceIds?.pro || '',
    },
    // File esistenti creati prima di questo campo non hanno "enabled": trattarli come attivi.
    enabled: raw.enabled !== false,
  };
}

export function saveStripeConfig(next: StripeConfig) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(next, null, 2), 'utf8');
}

export function isStripeSecretKey(key: string) {
  return /^sk_(test|live)_/.test(String(key || '').trim());
}

export function validateStripeSecretKey(key: string) {
  const value = String(key || '').trim();
  if (!value) return 'Inserisci la Secret key Stripe.';
  if (value.startsWith('pk_')) {
    return 'Hai incollato la Publishable key (pk_…). Serve la Secret key (sk_test_… o sk_live_…).';
  }
  if (value.startsWith('mk_') || value.startsWith('rk_')) {
    return 'Questa non è la Secret key standard. In Stripe apri Sviluppatori → Chiavi API e copia la Secret key (sk_test_… o sk_live_…).';
  }
  if (!isStripeSecretKey(value)) {
    return 'Secret key non valida. Deve iniziare con sk_test_ o sk_live_.';
  }
  return null;
}

export function validateStripeWebhookSecret(key: string) {
  const value = String(key || '').trim();
  if (!value) return null;
  if (!value.startsWith('whsec_')) {
    return 'Webhook secret non valido. Deve iniziare con whsec_.';
  }
  return null;
}

export function stripePublic(cfg = loadStripeConfig()) {
  const secretOk = isStripeSecretKey(cfg.secretKey);
  return {
    configured: secretOk,
    secretKeyValid: secretOk,
    hasSecret: Boolean(cfg.secretKey),
    secretMasked: maskKey(cfg.secretKey),
    hasWebhookSecret: Boolean(cfg.webhookSecret),
    webhookSecretMasked: maskKey(cfg.webhookSecret),
    productId: cfg.productId,
    priceIds: cfg.priceIds,
    enabled: cfg.enabled,
  };
}

export function stripeConfigured() {
  const cfg = loadStripeConfig();
  return cfg.enabled && isStripeSecretKey(cfg.secretKey);
}

function chargeCents(plan: CatalogPlanId) {
  const row = PLAN_CATALOG.find((item) => item.id === plan);
  return Math.round((row?.chargeEuro || 0) * 100);
}

export function stripeClient(cfg = loadStripeConfig()) {
  if (!cfg.secretKey) {
    throw new Error('Stripe non è configurato. Inserisci la Secret key nel tab Piattaforma.');
  }
  const invalid = validateStripeSecretKey(cfg.secretKey);
  if (invalid) {
    throw new Error(invalid);
  }
  return new Stripe(cfg.secretKey, { apiVersion: '2025-02-24.acacia' });
}

/** SaaS uso business — richiesto se Managed Payments è attivo sull'account Stripe. */
const PRODUCT_TAX_CODE = 'txcd_10103001';

async function ensureCatalog(cfg: StripeConfig) {
  const stripe = stripeClient(cfg);
  let next = { ...cfg, priceIds: { ...cfg.priceIds } };

  if (!next.productId) {
    const product = await stripe.products.create({
      name: 'Menu col codice',
      description: 'Abbonamento menu digitale QR',
      tax_code: PRODUCT_TAX_CODE,
    });
    next.productId = product.id;
  } else {
    // Prodotto già creato senza tax_code: aggiorna per Managed Payments / Stripe Tax
    await stripe.products.update(next.productId, {
      tax_code: PRODUCT_TAX_CODE,
      name: 'Menu col codice',
      description: 'Abbonamento menu digitale QR',
    });
  }

  for (const plan of ['medium', 'pro'] as const) {
    if (next.priceIds[plan]) continue;
    const price = await stripe.prices.create({
      product: next.productId,
      unit_amount: chargeCents(plan),
      currency: 'eur',
      recurring: { interval: 'month' },
      nickname: plan === 'pro' ? 'Pro' : 'Media',
      metadata: { plan },
    });
    next.priceIds[plan] = price.id;
  }

  saveStripeConfig(next);
  return next;
}

export async function createStripeCheckout(opts: {
  plan: 'medium' | 'pro';
  slug: string;
  name: string;
  email: string;
  successUrl: string;
  cancelUrl: string;
  promo?: {
    code: string;
    trialDays?: number;
    discountedCents?: number;
  };
}) {
  const cfg = await ensureCatalog(loadStripeConfig());
  const priceId = cfg.priceIds[opts.plan];
  if (!priceId) throw new Error('Prezzo Stripe non creato');
  const stripe = stripeClient();
  const discountedCents = opts.promo?.discountedCents;
  const useCustomPrice = discountedCents != null && discountedCents > 0 && discountedCents < chargeCents(opts.plan);
  const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
    metadata: {
      slug: opts.slug,
      plan: opts.plan,
      name: opts.name,
      ...(opts.promo?.code ? { promoCode: opts.promo.code } : {}),
    },
  };
  if (opts.promo?.trialDays) subscriptionData.trial_period_days = opts.promo.trialDays;

  const sessionParams = {
    mode: 'subscription' as const,
    customer_email: opts.email || undefined,
    line_items: [
      useCustomPrice
        ? {
            price_data: {
              currency: 'eur',
              product: cfg.productId,
              unit_amount: discountedCents,
              recurring: { interval: 'month' as const },
            },
            quantity: 1,
          }
        : { price: priceId, quantity: 1 },
    ],
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    locale: 'it' as const,
    allow_promotion_codes: !opts.promo?.code,
    managed_payments: { enabled: false },
    metadata: {
      slug: opts.slug,
      plan: opts.plan,
      name: opts.name,
      ...(opts.promo?.code ? { promoCode: opts.promo.code } : {}),
    },
    subscription_data: subscriptionData,
  } as Stripe.Checkout.SessionCreateParams;

  const session = await stripe.checkout.sessions.create(sessionParams);
  if (!session.url) throw new Error('Stripe non ha restituito il link di pagamento');
  return {
    sessionId: session.id,
    checkoutUrl: session.url,
  };
}

export async function getStripeCheckoutSession(sessionId: string) {
  const stripe = stripeClient();
  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['subscription'],
  });
}

export async function getStripeSubscription(subscriptionId: string) {
  const stripe = stripeClient();
  return stripe.subscriptions.retrieve(subscriptionId);
}

export async function getStripeSubscriptionExpanded(subscriptionId: string) {
  const stripe = stripeClient();
  return stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['items.data.price'],
  });
}

export type StripeInvoiceRow = {
  id: string;
  date: number | null;
  amount: number;
  currency: string;
  status: string;
  pdfUrl: string | null;
  hostedUrl: string | null;
};

export async function listStripeInvoices(opts: { subscriptionId?: string; customerId?: string; limit?: number }) {
  const stripe = stripeClient();
  const params: Stripe.InvoiceListParams = { limit: opts.limit || 12 };
  if (opts.subscriptionId) params.subscription = opts.subscriptionId;
  else if (opts.customerId) params.customer = opts.customerId;
  else return [];
  const list = await stripe.invoices.list(params);
  return list.data.map(
    (inv): StripeInvoiceRow => ({
      id: String(inv.number || inv.id),
      date: inv.created ? inv.created * 1000 : null,
      amount: (inv.amount_paid ?? inv.total ?? 0) / 100,
      currency: (inv.currency || 'eur').toUpperCase(),
      status: inv.status || '',
      pdfUrl: inv.invoice_pdf || null,
      hostedUrl: inv.hosted_invoice_url || null,
    })
  );
}

export async function getStripeUpcomingAmount(subscriptionId: string) {
  try {
    const stripe = stripeClient();
    const upcoming = await stripe.invoices.retrieveUpcoming({ subscription: subscriptionId });
    return {
      amount: (upcoming.amount_due ?? 0) / 100,
      currency: (upcoming.currency || 'eur').toUpperCase(),
    };
  } catch {
    return null;
  }
}

export async function createStripePortalSession(customerId: string, returnUrl: string) {
  const stripe = stripeClient();
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  if (!session.url) throw new Error('Portale Stripe non disponibile');
  return session.url;
}

/** Disdetta a fine periodo di fatturazione (mantiene il piano fino alla scadenza). */
export async function cancelStripeSubscription(subscriptionId: string) {
  const stripe = stripeClient();
  return stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
}

/** Cambio piano su abbonamento Stripe già attivo (es. Media → Pro). */
export async function upgradeStripeSubscription(subscriptionId: string, plan: 'medium' | 'pro') {
  const cfg = await ensureCatalog(loadStripeConfig());
  const priceId = cfg.priceIds[plan];
  if (!priceId) throw new Error('Prezzo Stripe non configurato');
  const stripe = stripeClient(cfg);
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const itemId = sub.items.data[0]?.id;
  if (!itemId) throw new Error('Abbonamento Stripe senza voce di fatturazione');
  return stripe.subscriptions.update(subscriptionId, {
    items: [{ id: itemId, price: priceId }],
    proration_behavior: 'create_prorations',
    cancel_at_period_end: false,
    metadata: { ...sub.metadata, plan },
  });
}

export function constructStripeEvent(rawBody: Buffer, signature: string) {
  const cfg = loadStripeConfig();
  if (!cfg.webhookSecret) {
    throw new Error('Manca il webhook secret Stripe');
  }
  const stripe = stripeClient(cfg);
  return stripe.webhooks.constructEvent(rawBody, signature, cfg.webhookSecret);
}
