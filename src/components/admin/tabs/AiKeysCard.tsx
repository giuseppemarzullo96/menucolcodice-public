import React, { useEffect, useState } from 'react';
import { Card, Button, Input, Select } from '@/components/admin';
import { Save } from 'lucide-react';

const OPENAI_MODELS = [
  { value: 'gpt-4o-mini', label: 'gpt-4o-mini (consigliato)' },
  { value: 'gpt-4o', label: 'gpt-4o' },
  { value: 'gpt-4.1-mini', label: 'gpt-4.1-mini' },
  { value: 'gpt-4.1', label: 'gpt-4.1' },
];

const DEEPSEEK_MODELS = [
  { value: 'deepseek-v4-flash', label: 'deepseek-v4-flash (consigliato)' },
  { value: 'deepseek-v4-pro', label: 'deepseek-v4-pro' },
  { value: 'deepseek-chat', label: 'deepseek-chat' },
];

export const AiKeysCard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    openaiKey: '',
    openaiHasKey: false,
    openaiMasked: '',
    openaiModel: 'gpt-4o-mini',
    deepseekKey: '',
    deepseekHasKey: false,
    deepseekMasked: '',
    deepseekModel: 'deepseek-v4-flash',
  });

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai-config');
      const data = await response.json();
      setForm({
        openaiKey: '',
        openaiHasKey: Boolean(data.openai?.hasApiKey),
        openaiMasked: data.openai?.apiKeyMasked || '',
        openaiModel: data.openai?.model || 'gpt-4o-mini',
        deepseekKey: '',
        deepseekHasKey: Boolean(data.deepseek?.hasApiKey),
        deepseekMasked: data.deepseek?.apiKeyMasked || '',
        deepseekModel: data.deepseek?.model || 'deepseek-v4-flash',
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
      const response = await fetch('/api/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          openai: { apiKey: form.openaiKey, model: form.openaiModel },
          deepseek: { apiKey: form.deepseekKey, model: form.deepseekModel },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Salvataggio fallito');
      setMessage(data.message || 'Chiavi salvate');
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Errore');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Chiavi AI (OpenAI + DeepSeek)">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        OpenAI legge la foto del menu (dopo compressione). DeepSeek sistema nomi, prezzi e categoria.
        Ogni locale Pro ha fino a 100 scansioni/mese. Le foto non funzionano senza OpenAI.
      </p>
      {loading ? (
        <p className="text-sm text-gray-500">Caricamento...</p>
      ) : (
        <div className="space-y-4">
          <Input
            label={form.openaiHasKey ? `OpenAI API key (${form.openaiMasked})` : 'OpenAI API key'}
            type="password"
            value={form.openaiKey}
            onChange={(e) => setForm((p) => ({ ...p, openaiKey: e.target.value }))}
            placeholder={form.openaiHasKey ? 'Lascia vuoto per non cambiare' : 'sk-...'}
          />
          <Select
            label="Modello OpenAI (visione)"
            value={form.openaiModel}
            onChange={(e) => setForm((p) => ({ ...p, openaiModel: e.target.value }))}
            options={OPENAI_MODELS}
          />
          <Input
            label={form.deepseekHasKey ? `DeepSeek API key (${form.deepseekMasked})` : 'DeepSeek API key'}
            type="password"
            value={form.deepseekKey}
            onChange={(e) => setForm((p) => ({ ...p, deepseekKey: e.target.value }))}
            placeholder={form.deepseekHasKey ? 'Lascia vuoto per non cambiare' : 'sk-...'}
          />
          <Select
            label="Modello DeepSeek (testo)"
            value={form.deepseekModel}
            onChange={(e) => setForm((p) => ({ ...p, deepseekModel: e.target.value }))}
            options={DEEPSEEK_MODELS}
          />
          <Button variant="primary" onClick={save} loading={saving}>
            <Save className="w-4 h-4 mr-2" />
            Salva chiavi AI
          </Button>
          {message && <p className="text-sm text-gray-700 dark:text-gray-300">{message}</p>}
        </div>
      )}
    </Card>
  );
};
