import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Table } from '@/components/admin';
import styles from '@/styles/admin.module.css';
import { formatEuro, planName } from '@/utils/plans';

type PayMethod = 'stripe' | 'paypal';

type UpgradePlan = {
  id: 'medium' | 'pro';
  name: string;
  listEuro: number;
  chargeEuro: number;
  blurb: string;
  immediate?: boolean;
};

type BillingInvoice = {
  id: string;
  date: number | null;
  amount: number;
  currency: string;
  status: string;
  pdfUrl: string | null;
  hostedUrl: string | null;
};

function when(ts: number | null) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

function money(amount: number | null | undefined, currency = 'EUR') {
  if (amount == null) return '—';
  const symbol = currency === 'EUR' ? '€' : currency;
  return `${formatEuro(amount)} ${symbol}`;
}

function invoiceStatusLabel(status: string) {
  const key = String(status || '').toLowerCase();
  if (key === 'paid') return 'Pagata';
  if (key === 'open') return 'Da pagare';
  if (key === 'void') return 'Annullata';
  if (key === 'uncollectible') return 'Insoluta';
  if (key === 'draft') return 'Bozza';
  if (key === 'completed') return 'Pagato';
  if (key === 'pending') return 'In attesa';
  if (key === 'failed') return 'Fallito';
  if (key === 'refunded') return 'Rimborsato';
  return status || '—';
}

function providerLabel(id: string) {
  if (id === 'stripe') return 'Carta (Stripe)';
  if (id === 'paypal') return 'PayPal';
  return '—';
}

export const SubscriptionTab: React.FC = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<'medium' | 'pro' | null>(null);
  const [payMethod, setPayMethod] = useState<PayMethod>('stripe');
  const [completing, setCompleting] = useState(false);
  const [portalBusy, setPortalBusy] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['billing-subscription'],
    queryFn: async () => {
      const response = await fetch('/api/billing/subscription');
      const json = await response.json();
      if (!response.ok) throw new Error(json.message || 'Errore');
      return json;
    },
  });

  useEffect(() => {
    if (!data?.upgradePlans?.length) return;
    setSelectedPlan((current) => {
      if (current && data.upgradePlans.some((p: UpgradePlan) => p.id === current)) return current;
      return data.upgradePlans[0]?.id || null;
    });
  }, [data?.upgradePlans]);

  useEffect(() => {
    if (!data) return;
    if (data.stripeOk) setPayMethod('stripe');
    else if (data.paypalOk) setPayMethod('paypal');
  }, [data?.stripeOk, data?.paypalOk]);

  useEffect(() => {
    if (!router.isReady || completing) return;
    const sessionId = String(router.query.session_id || '');
    const subscriptionId = String(router.query.subscription_id || '');
    if (!sessionId && !subscriptionId) return;

    setCompleting(true);
    fetch('/api/billing/complete-upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionId ? { sessionId } : { subscriptionId }),
    })
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok) throw new Error(json.message || 'Attivazione non riuscita');
        await queryClient.invalidateQueries({ queryKey: ['billing-subscription'] });
        await queryClient.invalidateQueries({ queryKey: ['restaurant'] });
        alert(json.message || 'Piano aggiornato.');
        const { session_id, subscription_id, upgrade_cancelled, ...rest } = router.query;
        void router.replace({ pathname: router.pathname, query: { ...rest, tab: 'subscription' } }, undefined, {
          shallow: true,
        });
      })
      .catch((err) => {
        alert(err instanceof Error ? err.message : 'Errore');
      })
      .finally(() => setCompleting(false));
  }, [router.isReady, router.query.session_id, router.query.subscription_id, completing, queryClient, router]);

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/billing/cancel', { method: 'POST' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.message || 'Disdetta non riuscita');
      return json;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['billing-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['restaurant'] });
      alert(result.message || 'Abbonamento disdetto.');
    },
    onError: (err: Error) => alert(err.message),
  });

  const upgradeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPlan) throw new Error('Scegli un piano.');
      const response = await fetch('/api/billing/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan, method: payMethod }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.message || 'Upgrade non riuscito');
      return json;
    },
    onSuccess: (result) => {
      if (result.immediate) {
        queryClient.invalidateQueries({ queryKey: ['billing-subscription'] });
        queryClient.invalidateQueries({ queryKey: ['restaurant'] });
        alert(result.message || 'Piano aggiornato.');
        return;
      }
      const url = result.checkoutUrl || result.approveUrl;
      if (url) window.location.href = url;
    },
    onError: (err: Error) => alert(err.message),
  });

  if (isLoading || completing) {
    return <p className={styles.muted}>{completing ? 'Confermo il pagamento…' : 'Carico l’abbonamento…'}</p>;
  }
  if (error || !data) return <p className={styles.muted}>Non riesco a leggere l’abbonamento.</p>;

  const upgradePlans: UpgradePlan[] = data.upgradePlans || [];
  const selected = upgradePlans.find((p) => p.id === selectedPlan);
  const canPay = Boolean(data.stripeOk || data.paypalOk);
  const showPayPicker = canPay && upgradePlans.length > 0 && !selected?.immediate;

  const onCancel = () => {
    const ok = window.confirm(
      data.billingProvider === 'stripe'
        ? 'Disdici l’abbonamento?\n\nIl piano resta attivo fino alla fine del periodo già pagato, poi passi al Free.'
        : 'Disdici l’abbonamento?\n\nIl locale torna subito al piano Free.'
    );
    if (ok) cancelMutation.mutate();
  };

  const upgradeLabel = selected?.immediate
    ? `Passa a ${selected.name}`
    : payMethod === 'paypal'
      ? 'Continua con PayPal'
      : 'Continua con carta';

  const invoices: BillingInvoice[] = data.invoices || [];
  const invoiceTitle = data.billingProvider === 'paypal' ? 'Pagamenti recenti' : 'Fatture recenti';
  const showBillingDetails =
    data.plan !== 'free' &&
    (data.hasSubscription || data.currentPeriodEnd || data.nextPaymentAmount != null || invoices.length > 0);

  const openStripePortal = async () => {
    setPortalBusy(true);
    try {
      const response = await fetch('/api/billing/portal', { method: 'POST' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.message || 'Portale non disponibile');
      if (json.url) window.location.href = json.url;
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Errore');
    } finally {
      setPortalBusy(false);
    }
  };

  const invoiceColumns = [
    {
      key: 'date',
      title: 'Data',
      render: (_: unknown, row: BillingInvoice) => when(row.date),
    },
    {
      key: 'id',
      title: data.billingProvider === 'paypal' ? 'Transazione' : 'Numero',
      dataIndex: 'id' as const,
    },
    {
      key: 'amount',
      title: 'Importo',
      render: (_: unknown, row: BillingInvoice) => money(row.amount, row.currency),
    },
    {
      key: 'status',
      title: 'Stato',
      render: (_: unknown, row: BillingInvoice) => invoiceStatusLabel(row.status),
    },
    {
      key: 'doc',
      title: 'Documento',
      render: (_: unknown, row: BillingInvoice) => {
        if (row.pdfUrl) {
          return (
            <a href={row.pdfUrl} target="_blank" rel="noreferrer" className={styles.link}>
              PDF
            </a>
          );
        }
        if (row.hostedUrl) {
          return (
            <a href={row.hostedUrl} target="_blank" rel="noreferrer" className={styles.link}>
              Online
            </a>
          );
        }
        return '—';
      },
    },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <Card title="Il tuo abbonamento">
        <div className="space-y-4">
          <div>
            <p className={styles.muted} style={{ marginBottom: '0.25rem' }}>
              Piano attuale
            </p>
            <p className="text-lg font-bold text-[#1A1A17]">{planName(data.plan)}</p>
          </div>
          {data.billingProvider && data.billingProvider !== 'none' ? (
            <div>
              <p className={styles.muted} style={{ marginBottom: '0.25rem' }}>
                Pagamento con
              </p>
              <p>{providerLabel(data.billingProvider)}</p>
            </div>
          ) : null}
          {data.currentPeriodStart && data.currentPeriodEnd ? (
            <div>
              <p className={styles.muted} style={{ marginBottom: '0.25rem' }}>
                Periodo in corso
              </p>
              <p>
                {when(data.currentPeriodStart)} → {when(data.currentPeriodEnd)}
              </p>
            </div>
          ) : data.currentPeriodEnd ? (
            <div>
              <p className={styles.muted} style={{ marginBottom: '0.25rem' }}>
                {data.cancelAtPeriodEnd ? 'Attivo fino al' : 'Prossimo rinnovo'}
              </p>
              <p>{when(data.currentPeriodEnd)}</p>
            </div>
          ) : null}
          {data.nextPaymentAmount != null && !data.cancelAtPeriodEnd ? (
            <div>
              <p className={styles.muted} style={{ marginBottom: '0.25rem' }}>
                Prossimo addebito
              </p>
              <p>
                {money(data.nextPaymentAmount, data.nextPaymentCurrency)}
                {data.currentPeriodEnd ? ` il ${when(data.currentPeriodEnd)}` : ''}
              </p>
            </div>
          ) : null}
          <p className={styles.muted}>{data.message}</p>
          {data.canManageBilling ? (
            <Button variant="secondary" loading={portalBusy} onClick={openStripePortal}>
              Gestisci carta e fatture su Stripe
            </Button>
          ) : null}
          {data.cancellable ? (
            <Button variant="danger" loading={cancelMutation.isPending} onClick={onCancel}>
              Disdici abbonamento
            </Button>
          ) : null}
        </div>
      </Card>

      {showBillingDetails ? (
        <Card title={invoiceTitle}>
          {invoices.length > 0 ? (
            <Table columns={invoiceColumns} data={invoices} rowKey="id" />
          ) : (
            <p className={styles.muted}>Nessuna fattura o pagamento registrato finora.</p>
          )}
          {data.billingProvider === 'paypal' ? (
            <p className={styles.muted} style={{ marginTop: '0.75rem' }}>
              I pagamenti PayPal compaiono qui. Per ricevute dettagliate controlla anche il tuo conto PayPal.
            </p>
          ) : null}
        </Card>
      ) : null}

      {upgradePlans.length > 0 ? (
        <Card title="Passa a un piano superiore">
          <div className="space-y-4">
            {router.query.upgrade_cancelled ? (
              <p className={styles.muted}>Pagamento annullato. Puoi riprovare quando vuoi.</p>
            ) : null}
            <div className="space-y-2">
              {upgradePlans.map((plan) => (
                <label
                  key={plan.id}
                  className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer"
                  style={{
                    borderColor: selectedPlan === plan.id ? '#6366f1' : '#e5e5e0',
                    background: selectedPlan === plan.id ? '#f5f5ff' : 'transparent',
                  }}
                >
                  <input
                    type="radio"
                    name="upgrade-plan"
                    checked={selectedPlan === plan.id}
                    onChange={() => setSelectedPlan(plan.id)}
                    style={{ marginTop: '0.25rem' }}
                  />
                  <span>
                    <strong>{plan.name}</strong>
                    {' — '}
                    {formatEuro(plan.listEuro)} €/mese + IVA
                    {plan.immediate ? ' · upgrade immediato' : ''}
                    <br />
                    <span className={styles.muted}>{plan.blurb}</span>
                  </span>
                </label>
              ))}
            </div>

            {showPayPicker ? (
              <div>
                <p className={styles.muted} style={{ marginBottom: '0.5rem' }}>
                  Metodo di pagamento
                </p>
                <div className="flex flex-wrap gap-2">
                  {data.stripeOk ? (
                    <button
                      type="button"
                      className="px-3 py-2 rounded-lg border text-sm"
                      style={{
                        opacity: payMethod === 'stripe' ? 1 : 0.6,
                        borderColor: payMethod === 'stripe' ? '#6366f1' : '#e5e5e0',
                        background: payMethod === 'stripe' ? '#f5f5ff' : 'transparent',
                      }}
                      onClick={() => setPayMethod('stripe')}
                    >
                      Carta (Stripe)
                    </button>
                  ) : null}
                  {data.paypalOk ? (
                    <button
                      type="button"
                      className="px-3 py-2 rounded-lg border text-sm"
                      style={{
                        opacity: payMethod === 'paypal' ? 1 : 0.6,
                        borderColor: payMethod === 'paypal' ? '#6366f1' : '#e5e5e0',
                        background: payMethod === 'paypal' ? '#f5f5ff' : 'transparent',
                      }}
                      onClick={() => setPayMethod('paypal')}
                    >
                      PayPal
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {!canPay ? (
              <p className={styles.muted}>I pagamenti non sono ancora collegati. Scrivici per l’upgrade.</p>
            ) : (
              <Button loading={upgradeMutation.isPending} onClick={() => upgradeMutation.mutate()}>
                {upgradeLabel}
              </Button>
            )}
          </div>
        </Card>
      ) : data.plan === 'pro' ? (
        <p className={styles.muted}>Sei già sul piano Pro, il più completo.</p>
      ) : null}
    </div>
  );
};

export function CancelSubscriptionButton({
  slug,
  plan,
  billingProvider,
  hasSubscription,
  isDemo,
  cancelAtPeriodEnd,
  subscriptionEndsAt,
  cancellable,
}: {
  slug: string;
  plan: string;
  billingProvider: string;
  hasSubscription: boolean;
  isDemo?: boolean;
  cancelAtPeriodEnd?: boolean;
  subscriptionEndsAt?: number | null;
  cancellable?: boolean;
}) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = React.useState(false);

  const formatEnd = (ts: number) =>
    new Date(ts).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

  if (isDemo || plan === 'free' || !hasSubscription) return <span className={styles.muted}>—</span>;

  if (cancelAtPeriodEnd) {
    return (
      <span style={{ color: '#9a6700' }} title="Abbonamento disdetto">
        {subscriptionEndsAt
          ? `Scade il ${formatEnd(subscriptionEndsAt)}`
          : 'Disdetta programmata'}
      </span>
    );
  }

  if (!cancellable) return <span className={styles.muted}>—</span>;

  const onCancel = async () => {
    const ok = window.confirm(
      `Disdici l’abbonamento di ${slug}?\n\nStripe: resta attivo fino a fine periodo. PayPal: torna Free subito.`
    );
    if (!ok) return;
    setBusy(true);
    try {
      const response = await fetch('/api/platform/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Disdetta non riuscita');
      await queryClient.invalidateQueries({ queryKey: ['platform-overview'] });
      alert(data.message || 'Abbonamento disdetto.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Errore');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className={styles.linkDanger}
      disabled={busy}
      onClick={onCancel}
      title={billingProvider === 'stripe' ? 'Disdetta su Stripe' : 'Disdici su PayPal'}
    >
      {busy ? '…' : 'Disdici'}
    </button>
  );
};
