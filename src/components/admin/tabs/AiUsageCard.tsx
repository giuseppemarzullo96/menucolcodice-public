import React, { useEffect, useState } from 'react';
import { Card } from '@/components/admin';

type UsageRow = { slug: string; ocr: number; whisper: number; openai: number; deepseek: number };

export const AiUsageCard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState('');
  const [totals, setTotals] = useState({ ocr: 0, whisper: 0, openai: 0, deepseek: 0 });
  const [locali, setLocali] = useState<UsageRow[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/ai-usage');
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Errore');
        setMonth(data.month || '');
        setTotals(data.totals || { ocr: 0, whisper: 0, openai: 0, deepseek: 0 });
        setLocali(Array.isArray(data.locali) ? data.locali : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <Card title="Uso AI questo mese">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Contatori interni (non euro). Ogni pagina menu scansionata conta 1. Limite Pro: 100 scansioni/mese per locale.
        Le foto vengono compresse prima di OpenAI.
      </p>
      {loading ? (
        <p className="text-sm text-gray-500">Caricamento…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Mese <strong>{month}</strong> · OCR {totals.ocr} · Vocali {totals.whisper} · OpenAI{' '}
            {totals.openai} · DeepSeek {totals.deepseek}
          </p>
          {locali.length === 0 ? (
            <p className="text-sm text-gray-500">Nessuna chiamata AI registrata questo mese.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-[#EFE9DC]">
                    <th className="py-2 pr-3">Locale</th>
                    <th className="py-2 pr-3">OCR</th>
                    <th className="py-2 pr-3">Vocali</th>
                    <th className="py-2 pr-3">OpenAI</th>
                    <th className="py-2">DeepSeek</th>
                  </tr>
                </thead>
                <tbody>
                  {locali.map((row) => (
                    <tr key={row.slug} className="border-b border-[#F5F1E8]">
                      <td className="py-2 pr-3 font-medium">{row.slug}</td>
                      <td className="py-2 pr-3">{row.ocr}</td>
                      <td className="py-2 pr-3">{row.whisper}</td>
                      <td className="py-2 pr-3">{row.openai}</td>
                      <td className="py-2">{row.deepseek}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
