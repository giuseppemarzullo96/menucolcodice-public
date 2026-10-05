import React, { useEffect, useState } from 'react';
import { Card, Button, Input, Select, Toggle } from '@/components/admin';
import { Save } from 'lucide-react';

export const PaypalCard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingEnabled, setTogglingEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    clientId: '',
    secret: '',
    hasSecret: false,
    secretMasked: '',
    mode: 'live',
    webhookId: '',
    configured: false,
    enabled: true,
  });

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/billing/config');
      const data = await response.json();
      setForm({
        clientId: data.clientId || '',
        secret: '',
        hasSecret: Boolean(data.hasSecret),
        secretMasked: data.secretMasked || '',
        mode: data.mode || 'live',
        webhookId: data.webhookId || '',
        configured: Boolean(data.configured),
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
      const response = await fetch('/api/billing/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: checked }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Salvataggio fallito');
      setMessage(checked ? 'PayPal riattivato.' : 'PayPal disattivato: non sarà proposto ai nuovi clienti né utilizzabile per upgrade.');
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
      const response = await fetch('/api/billing/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: form.clientId,
          secret: form.secret,
          mode: form.mode,
          webhookId: form.webhookId,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Salvataggio fallito');
      setMessage(data.message || 'PayPal salvato');
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Errore');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="PayPal">
      <div className="space-y-3">
        <Toggle
          label="PayPal attivo"
          checked={form.enabled}
          onChange={toggleEnabled}
        />
        {togglingEnabled ? <p className="text-xs text-gray-500">Salvataggio…</p> : null}
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Client ID e Secret dell’app REST (abbonamenti). Webhook: <code>/api/billing/webhook</code>
          {form.configured ? ' — collegato.' : ' — non ancora collegato: il Free funziona comunque.'}
        </p>
        <Input
          label="Client ID"
          value={form.clientId}
          onChange={(e) => setForm((p) => ({ ...p, clientId: e.target.value }))}
        />
        <Input
          label={form.hasSecret ? `Secret (${form.secretMasked})` : 'Secret'}
          type="password"
          value={form.secret}
          placeholder={form.hasSecret ? 'Lascia vuoto per non cambiare' : ''}
          onChange={(e) => setForm((p) => ({ ...p, secret: e.target.value }))}
        />
        <Select
          label="Ambiente"
          value={form.mode}
          onChange={(e) => setForm((p) => ({ ...p, mode: e.target.value }))}
          options={[
            { value: 'live', label: 'Live' },
            { value: 'sandbox', label: 'Sandbox' },
          ]}
        />
        <Input
          label="Webhook ID (facoltativo)"
          value={form.webhookId}
          onChange={(e) => setForm((p) => ({ ...p, webhookId: e.target.value }))}
        />
        <Button onClick={save} disabled={saving || loading}>
          <Save className="w-4 h-4 mr-1" />
          Salva PayPal
        </Button>
        {message ? <p className="text-sm">{message}</p> : null}
      </div>
    </Card>
  );
};
