import React, { useEffect, useState } from 'react';
import { Card, Button, Input } from '@/components/admin';
import { Save } from 'lucide-react';

export const Tripo3dCard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    apiKey: '',
    hasApiKey: false,
    apiKeyMasked: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/platform/tripo3d');
      const data = await response.json();
      setForm({
        apiKey: '',
        hasApiKey: Boolean(data.hasApiKey),
        apiKeyMasked: data.apiKeyMasked || '',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/platform/tripo3d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: form.apiKey }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Salvataggio fallito');
      setMessage(data.message || 'Tripo3D salvato');
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Errore');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Tripo3D (modelli 3D piatti)">
      <p className="text-sm text-[#5C5A52] mb-4">
        Chiave API usata dal comando WhatsApp <em>modello 3d &lt;piatto&gt;</em> (solo piano Pro) per
        generare un modello 3D del piatto dalle foto mandate dal ristoratore. Senza chiave il comando
        risponde che il servizio non è ancora attivo.
      </p>
      {loading ? (
        <p className="text-sm text-[#5C5A52]">Caricamento...</p>
      ) : (
        <div className="space-y-4">
          <Input
            label={form.hasApiKey ? `Tripo3D API key (${form.apiKeyMasked})` : 'Tripo3D API key'}
            type="password"
            value={form.apiKey}
            onChange={(e) => setForm((p) => ({ ...p, apiKey: e.target.value }))}
            placeholder={form.hasApiKey ? 'Lascia vuoto per non cambiare' : 'tsk_...'}
          />
          <Button variant="primary" onClick={save} loading={saving}>
            <Save className="w-4 h-4 mr-2" />
            Salva Tripo3D
          </Button>
          {message && <p className="text-sm text-[#1A1A17]">{message}</p>}
        </div>
      )}
    </Card>
  );
};
