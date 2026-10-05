import React, { useEffect, useRef, useState } from 'react';
import { Card, Button, Input, TextArea } from '@/components/admin';
import { MessageCircle, Save, RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export const WhatsAppTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [config, setConfig] = useState({
    baseUrl: 'http://127.0.0.1:8080',
    instance: 'menucolcodice',
    apiKey: '',
    hasApiKey: false,
    apiKeyMasked: '',
    allowedNumbers: '',
    webhookUrl: '',
  });
  const [status, setStatus] = useState<any>(null);
  const connectedRef = useRef(false);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/whatsapp/config');
      const data = await response.json();
      setConfig({
        baseUrl: data.evolution?.baseUrl || 'http://127.0.0.1:8080',
        instance: data.evolution?.instance || 'menucolcodice',
        apiKey: '',
        hasApiKey: Boolean(data.evolution?.hasApiKey),
        apiKeyMasked: data.evolution?.apiKeyMasked || '',
        allowedNumbers: (data.evolution?.allowedNumbers || []).join('\n'),
        webhookUrl: data.webhookUrl || '',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStatus = async (quiet = false) => {
    if (!quiet) setStatusLoading(true);
    try {
      const response = await fetch('/api/whatsapp/status');
      const data = await response.json();
      connectedRef.current = Boolean(data?.connected);
      setStatus(data);
    } finally {
      if (!quiet) setStatusLoading(false);
    }
  };

  useEffect(() => {
    load().then(() => loadStatus());
    const timer = setInterval(() => {
      if (!connectedRef.current) loadStatus(true);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evolution: {
            baseUrl: config.baseUrl,
            instance: config.instance,
            apiKey: config.apiKey,
            allowedNumbers: config.allowedNumbers
              .split(/[\n,;]+/)
              .map((n) => n.trim())
              .filter(Boolean),
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Salvataggio fallito');
      setMessage(data.warning ? `Salvato, ma webhook: ${data.warning}` : 'Configurazione salvata e webhook impostato.');
      setConfig((prev) => ({ ...prev, apiKey: '' }));
      await load();
      await loadStatus();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Errore');
    } finally {
      setSaving(false);
    }
  };

  const qrCode = status?.qr?.code || '';
  const qrImage = status?.qr?.image || '';
  const pairingCode = status?.qr?.pairingCode || '';

  return (
    <div className="space-y-6">
      <Card
        title="WhatsApp Evolution API"
        extra={
          <Button variant="secondary" onClick={() => loadStatus()} loading={statusLoading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Aggiorna stato
          </Button>
        }
      >
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Collega il numero del ristorante. Da WhatsApp il titolare (e fino a 2–3 numeri del locale)
            gestisce piatti, prezzi, foto, grafica e menu cartaceo senza aprire il pannello.
            Usa la <strong>API key globale</strong> del manager Evolution, non il token di un’istanza già esistente.
          </p>
        {loading ? (
          <p className="text-sm text-gray-500">Caricamento...</p>
        ) : (
          <div className="space-y-4">
            <Input
              label="URL Evolution"
              value={config.baseUrl}
              onChange={(e) => setConfig((p) => ({ ...p, baseUrl: e.target.value }))}
            />
            <Input
              label="Nome istanza"
              value={config.instance}
              onChange={(e) => setConfig((p) => ({ ...p, instance: e.target.value }))}
            />
            <Input
              label={config.hasApiKey ? `API key (${config.apiKeyMasked})` : 'API key Evolution'}
              type="password"
              value={config.apiKey}
              onChange={(e) => setConfig((p) => ({ ...p, apiKey: e.target.value }))}
              placeholder={config.hasApiKey ? 'Lascia vuoto per non cambiare' : 'Chiave globale del manager'}
            />
            <TextArea
              label="Numeri autorizzati (uno per riga, con prefisso 39, es. 393330000000)"
              rows={4}
              value={config.allowedNumbers}
              onChange={(e) => setConfig((p) => ({ ...p, allowedNumbers: e.target.value }))}
            />
            <div className="text-xs text-gray-500 break-all">
              Webhook: {config.webhookUrl}
            </div>
            <Button variant="primary" onClick={save} loading={saving}>
              <Save className="w-4 h-4 mr-2" />
              Salva e collega webhook
            </Button>
            {message && <p className="text-sm text-gray-700 dark:text-gray-300">{message}</p>}
          </div>
        )}
      </Card>

      <Card title="Stato connessione">
        <p className="text-sm mb-3">
          {status?.connected
            ? 'WhatsApp connesso.'
            : status?.state
              ? `Stato: ${status.state}`
              : status?.message || 'Non connesso.'}
        </p>
        {qrCode || qrImage ? (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Scansiona questo QR da WhatsApp → Impostazioni → Dispositivi collegati. Si aggiorna da solo ogni 8 secondi: se WhatsApp dice “riprova più tardi”, aspetta il nuovo QR.
            </p>
            <div className="inline-block bg-white p-3 rounded">
              {qrCode ? (
                <QRCodeSVG value={qrCode} size={256} level="M" includeMargin />
              ) : (
                <img src={qrImage} alt="QR WhatsApp" className="w-64 h-64 object-contain" />
              )}
            </div>
            {pairingCode ? (
              <p className="mt-2 text-sm text-gray-600">Codice di associazione: {pairingCode}</p>
            ) : null}
          </div>
        ) : null}
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <p className="flex items-center gap-2"><MessageCircle className="w-4 h-4" /> Da WhatsApp: *aiuto* (breve), *tutto* (elenco completo).</p>
          <p>Ogni giorno: aggiungi, prezzo, finito/torna, lista. Vocale OK (Whisper).</p>
          <p>Anche: modifica, foto, categorie, configura, statistiche, link, annulla ultima.</p>
          <p>Menu cartaceo: invia le foto, poi *sì*. Annulla: *annulla*.</p>
        </div>
      </Card>
    </div>
  );
};
