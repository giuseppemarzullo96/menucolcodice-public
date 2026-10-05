import React, { useEffect, useState } from 'react';
import { Card, Button, Input } from '@/components/admin';
import { Save } from 'lucide-react';

export const GoogleCard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    ga4MeasurementId: '',
    searchConsoleVerification: '',
    placesApiKey: '',
    placesHasKey: false,
    placesMasked: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/platform/google');
      const data = await response.json();
      setForm({
        ga4MeasurementId: data.ga4MeasurementId || '',
        searchConsoleVerification: data.searchConsoleVerification || '',
        placesApiKey: '',
        placesHasKey: Boolean(data.placesApiKey?.hasApiKey),
        placesMasked: data.placesApiKey?.apiKeyMasked || '',
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
      const response = await fetch('/api/platform/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ga4MeasurementId: form.ga4MeasurementId,
          searchConsoleVerification: form.searchConsoleVerification,
          placesApiKey: form.placesApiKey,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Salvataggio fallito');
      setMessage(data.message || 'Google salvato');
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Errore');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Google Analytics e Search Console">
      <p className="text-sm text-[#5C5A52] mb-4">
        Vale per tutta la piattaforma: sito di vendita e menu dei locali. Analytics parte solo dopo il
        consenso. Search Console è il meta di verifica HTML. I numeri che vedi in Analisi / Statistiche
        sono i nostri, non quelli di Google.
      </p>
      {loading ? (
        <p className="text-sm text-[#5C5A52]">Caricamento...</p>
      ) : (
        <div className="space-y-4">
          <Input
            label="ID misurazione Google Analytics 4"
            value={form.ga4MeasurementId}
            onChange={(e) => setForm((p) => ({ ...p, ga4MeasurementId: e.target.value }))}
            placeholder="G-XXXXXXXX"
          />
          <Input
            label="Codice verifica Search Console"
            value={form.searchConsoleVerification}
            onChange={(e) => setForm((p) => ({ ...p, searchConsoleVerification: e.target.value }))}
            placeholder="contenuto del meta google-site-verification"
          />
          <Input
            label={form.placesHasKey ? `Google Places API key (${form.placesMasked})` : 'Google Places API key'}
            type="password"
            value={form.placesApiKey}
            onChange={(e) => setForm((p) => ({ ...p, placesApiKey: e.target.value }))}
            placeholder={form.placesHasKey ? 'Lascia vuoto per non cambiare' : 'AIza...'}
          />
          <p className="text-xs text-[#5C5A52] -mt-2">
            Usata per leggere nome, indirizzo, orari e foto dal link Google Maps che manda il
            ristoratore su WhatsApp, al posto dello scraping della pagina (spesso incompleto).
          </p>
          <Button variant="primary" onClick={save} loading={saving}>
            <Save className="w-4 h-4 mr-2" />
            Salva Google
          </Button>
          {message && <p className="text-sm text-[#1A1A17]">{message}</p>}
        </div>
      )}
    </Card>
  );
};
