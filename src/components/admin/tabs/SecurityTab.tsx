import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Input } from '@/components/admin';
import { Lock } from 'lucide-react';
import { useRouter } from 'next/router';

interface SecurityTabProps {
  hasAccessCode: boolean | undefined;
}

export const SecurityTab: React.FC<SecurityTabProps> = ({ hasAccessCode }) => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [formData, setFormData] = useState({ code: '', confirmCode: '' });
  const [errors, setErrors] = useState<{ code?: string; confirmCode?: string }>({});
  const [saving, setSaving] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await fetch('/api/admin/set-access-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Errore nel salvare il codice');
      }
      return response.json();
    },
    onSuccess: () => {
      alert('Codice di accesso salvato con successo!');
      setFormData({ code: '', confirmCode: '' });
      setErrors({});
      // Invalida la query per ricaricare lo stato del codice di accesso
      queryClient.invalidateQueries({ queryKey: ['accessCode'] });
      // Ricarica la pagina per aggiornare lo stato
      setTimeout(() => {
        router.reload();
      }, 1000);
    },
    onError: (error: any) => {
      alert(error.message || 'Errore nel salvare il codice di accesso');
    },
    onSettled: () => setSaving(false),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { code?: string; confirmCode?: string } = {};
    if (!formData.code) newErrors.code = 'Inserisci un codice di accesso';
    else if (formData.code.length < 4) newErrors.code = 'Il codice deve essere di almeno 4 caratteri';
    if (!formData.confirmCode) newErrors.confirmCode = 'Conferma il codice di accesso';
    else if (formData.code !== formData.confirmCode) newErrors.confirmCode = 'I codici non corrispondono';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setSaving(true);
    saveMutation.mutate(formData.code);
  };

  return (
    <Card title={<span className="flex items-center gap-2"><Lock className="w-5 h-5" />Configurazione Codice di Accesso</span>}>
      <div className="mb-4 p-4" style={{ background: '#FAF7F0', border: '1px solid #EFE9DC' }}>
        <p className="text-sm" style={{ color: '#1A1A17' }}>
          <strong>Sicurezza Area Amministrativa</strong><br />
          {hasAccessCode ? "Un codice di accesso è già configurato. Puoi modificarlo inserendo un nuovo codice." : "Configura un codice di accesso per proteggere l'area amministrativa."}
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input label="Nuovo Codice di Accesso" type="password" placeholder="Inserisci il nuovo codice di accesso" value={formData.code} onChange={(e) => { setFormData(prev => ({ ...prev, code: e.target.value })); if (errors.code) setErrors(prev => ({ ...prev, code: undefined })); }} required />
          {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code}</p>}
        </div>
        <div>
          <Input label="Conferma Codice" type="password" placeholder="Conferma il codice di accesso" value={formData.confirmCode} onChange={(e) => { setFormData(prev => ({ ...prev, confirmCode: e.target.value })); if (errors.confirmCode) setErrors(prev => ({ ...prev, confirmCode: undefined })); }} required />
          {errors.confirmCode && <p className="mt-1 text-sm text-red-600">{errors.confirmCode}</p>}
        </div>
        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={saving}><Lock className="w-4 h-4 mr-2" />{hasAccessCode ? 'Aggiorna Codice' : 'Salva Codice di Accesso'}</Button>
        </div>
      </form>
    </Card>
  );
};
