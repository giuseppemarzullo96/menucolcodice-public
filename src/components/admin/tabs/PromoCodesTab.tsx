import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Table, Modal, Input, Select } from '@/components/admin';
import styles from '@/styles/admin.module.css';

type PromoRow = {
  id: string;
  code: string;
  type: 'percent' | 'free_months' | 'free_year';
  value: number;
  label: string;
  active: boolean;
  expiresAt: number | null;
  maxUses: number | null;
  usedCount: number;
  plans: string[];
  createdAt: number;
};

function typeLabel(type: PromoRow['type'], value: number) {
  if (type === 'percent') return `${value}% di sconto`;
  if (type === 'free_year') return '1 anno gratis';
  return `${value} ${value === 1 ? 'mese' : 'mesi'} gratis`;
}

function when(ts: number | null) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('it-IT');
}

export const PromoCodesTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    code: '',
    type: 'percent' as PromoRow['type'],
    value: '20',
    label: '',
    maxUses: '',
    expiresAt: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['promo-codes'],
    queryFn: async () => {
      const response = await fetch('/api/platform/promo-codes');
      const json = await response.json();
      if (!response.ok) throw new Error(json.message || 'Errore');
      return (json.codes || []) as PromoRow[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/platform/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code,
          type: form.type,
          value: form.type === 'free_year' ? 12 : Number(form.value),
          label: form.label,
          maxUses: form.maxUses ? Number(form.maxUses) : null,
          expiresAt: form.expiresAt ? new Date(form.expiresAt).getTime() : null,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.message || 'Creazione non riuscita');
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
      setOpen(false);
      setForm({ code: '', type: 'percent', value: '20', label: '', maxUses: '', expiresAt: '' });
    },
    onError: (err: Error) => alert(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async (row: PromoRow) => {
      const response = await fetch('/api/platform/promo-codes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, active: !row.active }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.message || 'Aggiornamento non riuscito');
      return json;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['promo-codes'] }),
    onError: (err: Error) => alert(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch('/api/platform/promo-codes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.message || 'Eliminazione non riuscita');
      return json;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['promo-codes'] }),
    onError: (err: Error) => alert(err.message),
  });

  const columns = [
    { key: 'code', title: 'Codice', dataIndex: 'code' as const },
    {
      key: 'type',
      title: 'Beneficio',
      render: (_: unknown, row: PromoRow) => row.label || typeLabel(row.type, row.value),
    },
    {
      key: 'uses',
      title: 'Utilizzi',
      render: (_: unknown, row: PromoRow) =>
        row.maxUses != null ? `${row.usedCount}/${row.maxUses}` : String(row.usedCount),
    },
    {
      key: 'expires',
      title: 'Scadenza',
      render: (_: unknown, row: PromoRow) => when(row.expiresAt),
    },
    {
      key: 'active',
      title: 'Stato',
      render: (_: unknown, row: PromoRow) => (row.active ? 'Attivo' : 'Disattivo'),
    },
    {
      key: 'actions',
      title: '',
      render: (_: unknown, row: PromoRow) => (
        <div className="flex gap-2">
          <button type="button" className={styles.link} onClick={() => toggleMutation.mutate(row)}>
            {row.active ? 'Disattiva' : 'Attiva'}
          </button>
          <button
            type="button"
            className={styles.linkDanger}
            onClick={() => {
              if (window.confirm(`Eliminare il codice ${row.code}?`)) deleteMutation.mutate(row.id);
            }}
          >
            Elimina
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <p className={styles.muted}>
        Crea codici promozionali per l&apos;iscrizione. Tutto è gestito dal pannello: lo sconto viene applicato al prezzo mensile su Stripe e PayPal.
      </p>
      <Card
        title="Codici promozionali"
        extra={
          <Button onClick={() => setOpen(true)}>Nuovo codice</Button>
        }
      >
        <Table columns={columns} data={data || []} rowKey="id" loading={isLoading} />
      </Card>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Nuovo codice promozionale">
        <div className="space-y-4">
          <Input
            label="Codice"
            value={form.code}
            onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
            placeholder="ESTATE20"
            required
          />
          <Select
            label="Tipo"
            value={form.type}
            onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as PromoRow['type'] }))}
            options={[
              { value: 'percent', label: 'Sconto percentuale' },
              { value: 'free_months', label: 'Mesi gratis' },
              { value: 'free_year', label: '1 anno gratis' },
            ]}
          />
          {form.type === 'percent' ? (
            <Input
              label="Percentuale sconto"
              type="number"
              min={1}
              max={100}
              value={form.value}
              onChange={(e) => setForm((prev) => ({ ...prev, value: e.target.value }))}
            />
          ) : form.type === 'free_months' ? (
            <Input
              label="Mesi gratis"
              type="number"
              min={1}
              max={24}
              value={form.value}
              onChange={(e) => setForm((prev) => ({ ...prev, value: e.target.value }))}
            />
          ) : null}
          <Input
            label="Descrizione (opzionale)"
            value={form.label}
            onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
            placeholder="Es. Promo estate 2026"
          />
          <Input
            label="Utilizzi massimi (opzionale)"
            type="number"
            min={1}
            value={form.maxUses}
            onChange={(e) => setForm((prev) => ({ ...prev, maxUses: e.target.value }))}
          />
          <Input
            label="Scadenza (opzionale)"
            type="date"
            value={form.expiresAt}
            onChange={(e) => setForm((prev) => ({ ...prev, expiresAt: e.target.value }))}
          />
          <Button loading={createMutation.isPending} onClick={() => createMutation.mutate()}>
            Crea codice
          </Button>
        </div>
      </Modal>
    </div>
  );
};
