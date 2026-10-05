import React, { useEffect, useState } from 'react';
import { Card, Button, Input, Toggle } from '@/components/admin';
import { Save } from 'lucide-react';

export const StripeCard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingEnabled, setTogglingEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    secretKey: '',
    webhookSecret: '',
    hasSecret: false,
    secretMasked: '',
    hasWebhookSecret: false,
    webhookSecretMasked: '',
    configured: false,
    productId: '',
    priceIds: { medium: '', pro: '' },
    enabled: true,
  });

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/billing/stripe-config');
      const data = await response.json();
      setForm({
        secretKey: '',
        webhookSecret: '',
        hasSecret: Boolean(data.hasSecret),
        secretMasked: data.secretMasked || '',
        hasWebhookSecret: Boolean(data.hasWebhookSecret),
        webhookSecretMasked: data.webhookSecretMasked || '',
        configured: Boolean(data.configured),
        productId: data.productId || '',
        priceIds: data.priceIds || { medium: '', pro: '' },
        enabled: data.enabled !== false,
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleEnabled = async (checked: boolean) => {
    setTogglingEnabled(true);
    setForm((p) => ({ ...p, enabled: checked }));
    try {
      const response = await fetch('/api/billing/stripe-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: checked }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Salvataggio fallito');
      setMessage(checked ? 'Stripe riattivato.' : 'Stripe disattivato: non sarà proposto ai nuovi clienti né utilizzabile per upgrade/portale.');
      await load();
    } catch (err) {
      setForm((p) => ({ ...p, enabled: !checked }));
      setMessage(err instanceof Error ? err.message : 'Errore');
    } finally {
      setTogglingEnabled(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/billing/stripe-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secretKey: form.secretKey,
          webhookSecret: form.webhookSecret,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Salvataggio fallito');
      setMessage(data.message || 'Stripe salvato');
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Errore');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Stripe">
      <div className="space-y-3">
        <Toggle
          label="Stripe attivo"
          checked={form.enabled}
          onChange={toggleEnabled}
        />
        {togglingEnabled ? <p className="text-xs text-gray-500">Salvataggio…</p> : null}
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Secret key dell’account Stripe (abbonamenti Checkout). Webhook endpoint:{' '}
          <code>/api/billing/stripe-webhook</code>
          {form.configured ? ' — collegato.' : ' — non ancora collegato.'}
          {' '}Eventi: <code>checkout.session.completed</code>,{' '}
          <code>customer.subscription.created</code>, <code>customer.subscription.updated</code>.
        </p>
        <p className="text-sm" style={{ color: '#5C5A52' }}>
          In Stripe: <strong>Sviluppatori → Chiavi API</strong> → copia la <strong>Secret key</strong>{' '}
          (<code>sk_test_…</code> o <code>sk_live_…</code>). Non usare la Publishable key (<code>pk_</code>)
          né chiavi <code>mk_</code>.
        </p>
        <Input
          label={form.hasSecret ? `Secret key (${form.secretMasked})` : 'Secret key'}
          type="password"
          value={form.secretKey}
          placeholder={form.hasSecret ? 'Lascia vuoto per non cambiare' : 'sk_live_… oppure sk_test_…'}
          onChange={(e) => setForm((p) => ({ ...p, secretKey: e.target.value }))}
        />
        <Input
          label={form.hasWebhookSecret ? `Webhook secret (${form.webhookSecretMasked})` : 'Webhook secret'}
          type="password"
          value={form.webhookSecret}
          placeholder={form.hasWebhookSecret ? 'Lascia vuoto per non cambiare' : 'whsec_…'}
          onChange={(e) => setForm((p) => ({ ...p, webhookSecret: e.target.value }))}
        />
        {form.productId ? (
          <p className="text-xs" style={{ color: '#5C5A52' }}>
            Prodotto: {form.productId}. Media: {form.priceIds.medium || '—'} · Pro: {form.priceIds.pro || '—'}.
            I prezzi si creano da soli al primo pagamento.
          </p>
        ) : null}
        <Button onClick={save} disabled={saving || loading}>
          <Save className="w-4 h-4 mr-1" />
          Salva Stripe
        </Button>
        {message ? <p className="text-sm">{message}</p> : null}
      </div>
    </Card>
  );
};
