import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Input, Select } from '@/components/admin';
import { Camera, Trash2, Check } from 'lucide-react';

type DraftProduct = {
  name: string;
  category: string;
  price: number;
  ingredients: string;
  description: string;
  allergens: string[];
};

interface ScanMenuTabProps {
  categories: any[];
}

export const ScanMenuTab: React.FC<ScanMenuTabProps> = ({ categories }) => {
  const queryClient = useQueryClient();
  const { data: restaurantData } = useQuery({
    queryKey: ['restaurant'],
    queryFn: async () => {
      const response = await fetch('/api/get-restaurant');
      if (!response.ok) throw new Error('Errore');
      return response.json();
    },
  });
  const tenant = restaurantData?.tenant;
  const ocrUsed = Number(tenant?.ocrUsedMonth || 0);
  const ocrLimit = Number(tenant?.ocrPerMonth || 100);
  const ocrLeft = Number(tenant?.ocrRemainingMonth ?? Math.max(0, ocrLimit - ocrUsed));

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [drafts, setDrafts] = useState<DraftProduct[]>([]);
  const [error, setError] = useState('');

  const onFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const next = Array.from(list).filter((f) => f.type.startsWith('image/'));
    setFiles(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
    setDrafts([]);
    setError('');
  };

  const scan = async () => {
    if (files.length === 0) {
      setError('Scatta o carica almeno una foto del menu cartaceo.');
      return;
    }
    if (files.length > ocrLeft) {
      setError(
        ocrLeft === 0
          ? `Hai raggiunto il limite di ${ocrLimit} scansioni di questo mese.`
          : `Ti restano ${ocrLeft} scansioni questo mese: togli qualche foto.`
      );
      return;
    }
    setScanning(true);
    setError('');
    try {
      const fd = new FormData();
      files.forEach((file) => fd.append('file', file));
      const response = await fetch('/api/ocr-menu', {
        method: 'POST',
        body: fd,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Riconoscimento fallito');
      await queryClient.invalidateQueries({ queryKey: ['restaurant'] });
      if (!data.products?.length) {
        setError('Nessun piatto letto. Prova con una foto più nitida, una pagina alla volta.');
        setDrafts([]);
        return;
      }
      setDrafts(data.products);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel riconoscimento');
    } finally {
      setScanning(false);
    }
  };

  const updateDraft = (index: number, patch: Partial<DraftProduct>) => {
    setDrafts((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const removeDraft = (index: number) => {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  };

  const apply = async () => {
    const products = drafts.filter((d) => d.name.trim());
    if (products.length === 0) return;
    setImporting(true);
    setError('');
    try {
      const response = await fetch('/api/ocr-menu-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Import fallito');
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      setDrafts([]);
      setFiles([]);
      setPreviews([]);
      alert(data.message || 'Piatti importati');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel salvataggio');
    } finally {
      setImporting(false);
    }
  };

  const categoryOptions = [
    ...categories.map((cat) => ({ value: cat.name, label: cat.name })),
  ];

  return (
    <div className="space-y-6">
      <Card title="Fotografa il menu cartaceo">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Fotografa le pagine del menu di carta. Leggiamo i piatti e li mettiamo in ordine per categoria.
          Prima di importarli li controlli tu, uno per uno. Ogni pagina conta come una scansione
          (massimo {ocrLimit} al mese nel piano Pro).
        </p>
        <p className="text-sm mb-4" style={{ color: ocrLeft <= 10 ? '#B0770F' : '#5C5A52' }}>
          Scansioni questo mese: <strong>{ocrUsed}</strong> / {ocrLimit} · ne restano <strong>{ocrLeft}</strong>
        </p>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          id="menu-ocr-upload"
          onChange={(e) => onFiles(e.target.files)}
        />
        <div className="flex flex-wrap gap-3">
          <label
            htmlFor="menu-ocr-upload"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700"
          >
            <Camera className="w-4 h-4" />
            Scatta o carica foto
          </label>
          <Button variant="primary" onClick={scan} loading={scanning} disabled={files.length === 0}>
            {scanning ? 'Elaborazione in corso…' : 'Leggi menu'}
          </Button>
        </div>
        {previews.length > 0 && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {previews.map((src, i) => (
              <img key={src} src={src} alt={`Pagina ${i + 1}`} className="w-full h-32 object-cover rounded" />
            ))}
          </div>
        )}
        {scanning && (
          <p className="mt-3 text-sm text-blue-700 dark:text-blue-300">
            Sto leggendo piatti e ingredienti dalle foto, attendi qualche secondo…
          </p>
        )}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </Card>

      {drafts.length > 0 && (
        <Card
          title={`Piatti riconosciuti (${drafts.length})`}
          extra={
            <Button variant="primary" onClick={apply} loading={importing}>
              <Check className="w-4 h-4 mr-2" />
              Importa nel menu
            </Button>
          }
        >
          <div className="space-y-4">
            {drafts.map((draft, index) => (
              <div key={`${draft.name}-${index}`} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input
                    label="Nome"
                    value={draft.name}
                    onChange={(e) => updateDraft(index, { name: e.target.value })}
                  />
                  <Select
                    label="Categoria"
                    value={draft.category}
                    onChange={(e) => updateDraft(index, { category: e.target.value })}
                    options={
                      categoryOptions.some((o) => o.value === draft.category)
                        ? categoryOptions
                        : [{ value: draft.category, label: draft.category }, ...categoryOptions]
                    }
                  />
                  <Input
                    label="Prezzo (€)"
                    type="number"
                    step="0.5"
                    value={draft.price}
                    onChange={(e) => updateDraft(index, { price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <Input
                  label="Ingredienti"
                  value={draft.ingredients}
                  onChange={(e) => updateDraft(index, { ingredients: e.target.value, description: e.target.value })}
                />
                <Button variant="danger" className="text-xs" onClick={() => removeDraft(index)}>
                  <Trash2 className="w-3 h-3 mr-1" />
                  Togli
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
