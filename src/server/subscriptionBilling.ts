import { cancelPaypalSubscription, createPaypalSubscription, getPaypalSubscription, listPaypalSubscriptionTransactions, paypalConfigured, revisePaypalSubscription } from './billing';
import {
  cancelStripeSubscription,
  createStripeCheckout,
  getStripeCheckoutSession,
  getStripeSubscriptionExpanded,
  getStripeUpcomingAmount,
  listStripeInvoices,
  stripeConfigured,
  upgradeStripeSubscription,
} from './stripeBilling';
import { patchTenant, type BillingProvider, type PlanId, type TenantRecord } from './tenant';
import { savePendingSignup, findPendingSignup, takePendingSignup, activateAccount } from './signup';
import { PLAN_CATALOG, type CatalogPlanId } from '@/utils/plans';

export type BillingInvoiceRow = {
  id: string;
  date: number | null;
  amount: number;
  currency: string;
  status: string;
  pdfUrl: string | null;
  hostedUrl: string | null;
};

export type SubscriptionStatus = {
  plan: PlanId;
  billingProvider: BillingProvider;
  hasSubscription: boolean;
  cancellable: boolean;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: number | null;
  currentPeriodEnd: number | null;
  nextPaymentAmount: number | null;
  nextPaymentCurrency: string;
  invoices: BillingInvoiceRow[];
  canManageBilling: boolean;
  providerStatus: string;
  message: string;
};

function billingExtras(): Pick<
  SubscriptionStatus,
  'currentPeriodStart' | 'currentPeriodEnd' | 'nextPaymentAmount' | 'nextPaymentCurrency' | 'invoices' | 'canManageBilling'
> {
  return {
    currentPeriodStart: null,
    currentPeriodEnd: null,
    nextPaymentAmount: null,
    nextPaymentCurrency: 'EUR',
    invoices: [],
    canManageBilling: false,
  };
}

function planChargeEuro(plan: PlanId) {
  return PLAN_CATALOG.find((row) => row.id === plan)?.chargeEuro ?? null;
}

export type UpgradePlanOption = {
  id: 'medium' | 'pro';
  name: string;
  listEuro: number;
  chargeEuro: number;
  blurb: string;
  immediate?: boolean;
};

const PLAN_RANK: Record<PlanId, number> = { free: 0, medium: 1, pro: 2 };

export function listUpgradePlans(tenant: TenantRecord): UpgradePlanOption[] {
  return PLAN_CATALOG.filter(
    (row): row is (typeof PLAN_CATALOG)[number] & { id: 'medium' | 'pro' } =>
      row.id !== 'free' && PLAN_RANK[row.id] > PLAN_RANK[tenant.plan]
  ).map((row) => ({
    id: row.id,
    name: row.name,
    listEuro: row.listEuro,
    chargeEuro: row.chargeEuro,
    blurb: row.blurb,
    immediate:
      tenant.plan === 'medium' &&
      row.id === 'pro' &&
      tenant.billingProvider === 'stripe' &&
      Boolean(tenant.stripeSubscriptionId),
  }));
}

function formatWhen(ts: number | null) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

export async function fetchSubscriptionStatus(tenant: TenantRecord): Promise<SubscriptionStatus> {
  const base: SubscriptionStatus = {
    plan: tenant.plan,
    billingProvider: tenant.billingProvider,
    hasSubscription: false,
    cancellable: false,
    cancelAtPeriodEnd: false,
    providerStatus: '',
    message: '',
    ...billingExtras(),
  };

  if (tenant.plan === 'free' || tenant.billingProvider === 'none') {
    return {
      ...base,
      message: 'Sei sul piano Free. Nessun abbonamento da disdire.',
    };
  }

  if (tenant.billingProvider === 'stripe' && tenant.stripeSubscriptionId) {
    try {
      const [sub, invoices, upcoming] = await Promise.all([
        getStripeSubscriptionExpanded(tenant.stripeSubscriptionId),
        listStripeInvoices({
          subscriptionId: tenant.stripeSubscriptionId,
          customerId: tenant.stripeCustomerId || undefined,
        }),
        getStripeUpcomingAmount(tenant.stripeSubscriptionId),
      ]);
      const cancelAtPeriodEnd = Boolean(sub.cancel_at_period_end);
      const end = sub.current_period_end ? sub.current_period_end * 1000 : null;
      const start = sub.current_period_start ? sub.current_period_start * 1000 : null;
      const active = ['active', 'trialing'].includes(sub.status);
      const itemPrice = sub.items.data[0]?.price?.unit_amount;
      const fallbackAmount = itemPrice != null ? itemPrice / 100 : planChargeEuro(tenant.plan);
      const nextAmount = !cancelAtPeriodEnd && active ? (upcoming?.amount ?? fallbackAmount) : null;
      const nextCurrency = upcoming?.currency || (sub.currency || 'EUR').toUpperCase();
      return {
        ...base,
        hasSubscription: true,
        cancellable: active && !cancelAtPeriodEnd,
        cancelAtPeriodEnd,
        currentPeriodStart: start,
        currentPeriodEnd: end,
        nextPaymentAmount: nextAmount,
        nextPaymentCurrency: nextCurrency,
        invoices,
        canManageBilling: Boolean(tenant.stripeCustomerId && stripeConfigured()),
        providerStatus: sub.status,
        message: cancelAtPeriodEnd
          ? `Disdetta già programmata. Il piano ${tenant.plan} resta attivo fino al ${formatWhen(end)}.`
          : active
            ? `Abbonamento ${tenant.plan} attivo con Stripe.`
            : `Abbonamento Stripe: ${sub.status}.`,
      };
    } catch (error) {
      return {
        ...base,
        message: error instanceof Error ? error.message : 'Impossibile leggere l’abbonamento Stripe.',
      };
    }
  }

  if (tenant.billingProvider === 'paypal' && tenant.paypalSubscriptionId) {
    try {
      const [sub, transactions] = await Promise.all([
        getPaypalSubscription(tenant.paypalSubscriptionId),
        listPaypalSubscriptionTransactions(tenant.paypalSubscriptionId).catch(() => []),
      ]);
      const status = String(sub.status || '').toUpperCase();
      const active = ['ACTIVE', 'APPROVED', 'SUSPENDED'].includes(status);
      const billingInfo = sub.billing_info as {
        next_billing_time?: string;
        last_payment?: { time?: string; amount?: { value?: string; currency_code?: string } };
      } | undefined;
      const nextBilling = billingInfo?.next_billing_time ? new Date(billingInfo.next_billing_time).getTime() : null;
      const lastPayment = billingInfo?.last_payment;
      const lastPaymentTime = lastPayment?.time ? new Date(lastPayment.time).getTime() : null;
      const nextAmount =
        parseFloat(String(lastPayment?.amount?.value || '')) || planChargeEuro(tenant.plan);
      const nextCurrency = String(lastPayment?.amount?.currency_code || 'EUR').toUpperCase();
      const invoices: BillingInvoiceRow[] = transactions.map((tx) => ({
        id: tx.id,
        date: tx.date,
        amount: tx.amount,
        currency: tx.currency,
        status: tx.status,
        pdfUrl: null,
        hostedUrl: null,
      }));
      return {
        ...base,
        hasSubscription: active,
        cancellable: active,
        currentPeriodStart: lastPaymentTime,
        currentPeriodEnd: nextBilling,
        nextPaymentAmount: active ? nextAmount : null,
        nextPaymentCurrency: nextCurrency,
        invoices,
        canManageBilling: false,
        providerStatus: status,
        message: active
          ? `Abbonamento ${tenant.plan} attivo con PayPal.`
          : `Abbonamento PayPal: ${status || 'non attivo'}.`,
      };
    } catch (error) {
      return {
        ...base,
        message: error instanceof Error ? error.message : 'Impossibile leggere l’abbonamento PayPal.',
      };
    }
  }

  return {
    ...base,
    nextPaymentAmount: planChargeEuro(tenant.plan),
    message: 'Piano a pagamento senza abbonamento collegato. Contattaci se qualcosa non torna.',
  };
}

export async function cancelSubscriptionForTenant(tenant: TenantRecord) {
  if (tenant.slug === 'demo') {
    throw new Error('La demo piattaforma non ha un abbonamento da disdire.');
  }
  if (tenant.plan === 'free') {
    throw new Error('Questo locale è già sul piano Free.');
  }

  if (tenant.billingProvider === 'stripe' && tenant.stripeSubscriptionId) {
    const sub = await cancelStripeSubscription(tenant.stripeSubscriptionId);
    const end = sub.current_period_end ? sub.current_period_end * 1000 : null;
    patchTenant(tenant.slug, {
      cancelAtPeriodEnd: true,
      subscriptionEndsAt: end || undefined,
    });
    return {
      message: end
        ? `Disdetta registrata. Il piano ${tenant.plan} resta attivo fino al ${formatWhen(end)}; poi passi al Free.`
        : 'Disdetta registrata su Stripe.',
      cancelAt: end,
      plan: tenant.plan,
    };
  }

  if (tenant.billingProvider === 'paypal' && tenant.paypalSubscriptionId) {
    await cancelPaypalSubscription(tenant.paypalSubscriptionId);
    patchTenant(tenant.slug, {
      plan: 'free',
      billingProvider: 'none',
      paypalSubscriptionId: '',
      cancelAtPeriodEnd: false,
      subscriptionEndsAt: undefined,
    });
    return {
      message: 'Abbonamento PayPal disdetto. Il locale è passato al piano Free.',
      cancelAt: null,
      plan: 'free' as PlanId,
    };
  }

  throw new Error('Non trovo un abbonamento Stripe o PayPal collegato a questo locale.');
}

/** Dopo webhook o disdetta PayPal: torna Free e pulisce gli ID billing. */
export function downgradeTenantToFree(slug: string) {
  patchTenant(slug, {
    plan: 'free',
    billingProvider: 'none',
    paypalSubscriptionId: '',
    stripeSubscriptionId: '',
    stripeCustomerId: '',
    stripeSessionId: '',
    cancelAtPeriodEnd: false,
    subscriptionEndsAt: undefined,
  });
}

function assertUpgradeTarget(tenant: TenantRecord, plan: CatalogPlanId) {
  if (tenant.slug === 'demo') throw new Error('La demo piattaforma non ha un abbonamento da aggiornare.');
  if (plan !== 'medium' && plan !== 'pro') throw new Error('Piano non valido.');
  if (PLAN_RANK[plan] <= PLAN_RANK[tenant.plan]) {
    throw new Error(`Sei già sul piano ${tenant.plan === 'pro' ? 'Pro' : tenant.plan === 'medium' ? 'Media' : 'Free'}.`);
  }
}

function hasActiveBilling(tenant: TenantRecord) {
  return (
    tenant.billingProvider === 'stripe' &&
    Boolean(tenant.stripeSubscriptionId) &&
    tenant.plan !== 'free'
  ) || (
    tenant.billingProvider === 'paypal' &&
    Boolean(tenant.paypalSubscriptionId) &&
    tenant.plan !== 'free'
  );
}

export async function startUpgradeForTenant(
  tenant: TenantRecord,
  plan: 'medium' | 'pro',
  method: 'stripe' | 'paypal',
  baseUrl: string
) {
  assertUpgradeTarget(tenant, plan);

  const returnAdmin = `${baseUrl}/admin?tab=subscription`;
  const cancelAdmin = `${baseUrl}/admin?tab=subscription&upgrade_cancelled=1`;

  // Media → Pro con Stripe attivo: upgrade immediato senza checkout
  if (
    tenant.plan === 'medium' &&
    plan === 'pro' &&
    tenant.billingProvider === 'stripe' &&
    tenant.stripeSubscriptionId &&
    method === 'stripe'
  ) {
    await upgradeStripeSubscription(tenant.stripeSubscriptionId, 'pro');
    patchTenant(tenant.slug, { plan: 'pro' });
    return {
      immediate: true as const,
      message: 'Piano aggiornato a Pro. Le nuove funzioni sono già attive.',
      plan: 'pro' as PlanId,
    };
  }

  // Media → Pro con PayPal attivo: revise (può richiedere approvazione)
  if (
    tenant.plan === 'medium' &&
    plan === 'pro' &&
    tenant.billingProvider === 'paypal' &&
    tenant.paypalSubscriptionId &&
    method === 'paypal'
  ) {
    const revised = await revisePaypalSubscription({
      subscriptionId: tenant.paypalSubscriptionId,
      plan: 'pro',
      returnUrl: returnAdmin,
      cancelUrl: cancelAdmin,
    });
    savePendingSignup({
      slug: tenant.slug,
      name: tenant.name,
      email: tenant.email || '',
      plan: 'pro',
      paypalSubscriptionId: revised.id,
      createdAt: Date.now(),
    });
    if (revised.approveUrl) {
      return { immediate: false as const, approveUrl: revised.approveUrl };
    }
    patchTenant(tenant.slug, { plan: 'pro' });
    return {
      immediate: true as const,
      message: 'Piano aggiornato a Pro su PayPal.',
      plan: 'pro' as PlanId,
    };
  }

  // Free o piano senza abbonamento collegato: nuovo checkout
  if (hasActiveBilling(tenant) && tenant.billingProvider !== method) {
    throw new Error(
      `Hai già un abbonamento ${tenant.billingProvider === 'stripe' ? 'Stripe' : 'PayPal'}. Usa lo stesso metodo di pagamento per l’upgrade.`
    );
  }

  const email = tenant.email || '';
  const name = tenant.name || tenant.slug;

  if (method === 'stripe') {
    if (!stripeConfigured()) throw new Error('Stripe non è ancora collegato. Riprova più tardi o scrivici.');
    const checkout = await createStripeCheckout({
      plan,
      slug: tenant.slug,
      name,
      email,
      successUrl: `${returnAdmin}&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: cancelAdmin,
    });
    savePendingSignup({
      slug: tenant.slug,
      name,
      email,
      plan,
      stripeSessionId: checkout.sessionId,
      createdAt: Date.now(),
    });
    return { immediate: false as const, checkoutUrl: checkout.checkoutUrl };
  }

  if (method === 'paypal') {
    if (!paypalConfigured()) throw new Error('PayPal non è ancora collegato. Riprova più tardi o scrivici.');
    const sub = await createPaypalSubscription({
      plan,
      slug: tenant.slug,
      email,
      returnUrl: returnAdmin,
      cancelUrl: cancelAdmin,
    });
    savePendingSignup({
      slug: tenant.slug,
      name,
      email,
      plan,
      paypalSubscriptionId: sub.id,
      createdAt: Date.now(),
    });
    return { immediate: false as const, approveUrl: sub.approveUrl };
  }

  throw new Error('Metodo di pagamento non valido.');
}

export async function completeUpgradeForTenant(tenant: TenantRecord, opts: { sessionId?: string; subscriptionId?: string }) {
  const sessionId = String(opts.sessionId || '').trim();
  const subscriptionId = String(opts.subscriptionId || '').trim();

  if (sessionId) {
    const session = await getStripeCheckoutSession(sessionId);
    const paid =
      session.status === 'complete' &&
      (session.payment_status === 'paid' || session.payment_status === 'no_payment_required');
    if (!paid) {
      throw new Error(`Pagamento non ancora attivo (${session.payment_status || session.status || 'sconosciuto'})`);
    }
    const slug = String(session.metadata?.slug || '').toLowerCase();
    if (slug !== tenant.slug) throw new Error('Sessione di pagamento non collegata a questo locale.');
    const pending = findPendingSignup(sessionId) || findPendingSignup(slug);
    const plan =
      pending?.plan === 'pro' || session.metadata?.plan === 'pro' ? 'pro' : ('medium' as PlanId);
    const subscription =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription && typeof session.subscription === 'object'
          ? session.subscription.id
          : '';
    takePendingSignup(slug);
    takePendingSignup(sessionId);
    await activateAccount({
      slug: tenant.slug,
      name: tenant.name,
      plan,
      email: pending?.email || tenant.email || session.customer_details?.email || session.customer_email || undefined,
      billingProvider: 'stripe',
      stripeCustomerId: typeof session.customer === 'string' ? session.customer : undefined,
      stripeSubscriptionId: subscription || undefined,
      stripeSessionId: sessionId,
    });
    return {
      message: `Piano aggiornato a ${plan === 'pro' ? 'Pro' : 'Media'}.`,
      plan,
    };
  }

  if (subscriptionId) {
    const sub = await getPaypalSubscription(subscriptionId);
    const status = String(sub.status || '').toUpperCase();
    if (!['ACTIVE', 'APPROVED'].includes(status)) {
      throw new Error(`Pagamento non ancora attivo (${status || 'sconosciuto'})`);
    }
    const slug = String(sub.custom_id || '').toLowerCase();
    if (slug !== tenant.slug) throw new Error('Sottoscrizione PayPal non collegata a questo locale.');
    const pending = findPendingSignup(subscriptionId) || findPendingSignup(slug);
    const plan = pending?.plan === 'pro' ? 'pro' : ('medium' as PlanId);
    takePendingSignup(slug);
    takePendingSignup(subscriptionId);
    await activateAccount({
      slug: tenant.slug,
      name: tenant.name,
      plan,
      email: pending?.email || tenant.email || sub.subscriber?.email_address,
      billingProvider: 'paypal',
      paypalSubscriptionId: subscriptionId,
    });
    return {
      message: `Piano aggiornato a ${plan === 'pro' ? 'Pro' : 'Media'}.`,
      plan,
    };
  }

  throw new Error('Manca la conferma del pagamento.');
}
