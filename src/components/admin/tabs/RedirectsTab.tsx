import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Table, Modal, Input } from '@/components/admin';
import { Plus, Edit, Trash2 } from 'lucide-react';

interface RedirectsTabProps {
  redirects: any[];
  loading: boolean;
}

export const RedirectsTab: React.FC<RedirectsTabProps> = ({ redirects, loading }) => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRedirect, setEditingRedirect] = useState<any>(null);

  const deleteMutation = useMutation({
    mutationFn: async (redirectId: string) => {
      const updatedRedirects = redirects.filter(r => r.id !== redirectId);
      const response = await fetch('/api/save-redirects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redirects: updatedRedirects }),
      });
      if (!response.ok) throw new Error('Errore nel salvare');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['redirects'] });
      alert('Redirect eliminato!');
    },
  });

  const handleEdit = (redirect: any) => {
    setEditingRedirect(redirect);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingRedirect(null);
    setIsModalOpen(true);
  };

  const handleDelete = (redirectId: string) => {
    if (confirm('Sei sicuro di voler eliminare questo redirect?')) {
      deleteMutation.mutate(redirectId);
    }
  };

  const columns = [
    { key: 'id', title: 'ID', dataIndex: 'id' as const, width: 80 },
    {
      key: 'from',
      title: 'Da (From)',
      dataIndex: 'from' as const,
      render: (from: string) => (
        <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded text-sm">
          /{from}
        </span>
      ),
    },
    {
      key: 'to',
      title: 'A (To)',
      dataIndex: 'to' as const,
      render: (to: string) => (
        <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-sm">
          {to}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'Azioni',
      render: (_: any, record: any) => (
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => handleEdit(record)} className="text-xs">
            <Edit className="w-3 h-3 mr-1" /> Modifica
          </Button>
          <Button variant="danger" onClick={() => handleDelete(record.id)} className="text-xs">
            <Trash2 className="w-3 h-3 mr-1" /> Elimina
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Gestione Redirect</strong><br />
          Crea redirect da un indirizzo a un altro. Il campo &apos;Da&apos; non deve contenere lo slash iniziale.
        </p>
      </div>
      <Card
        title="Gestione Redirect"
        extra={
          <Button variant="primary" onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" /> Aggiungi Redirect
          </Button>
        }
      >
        <Table columns={columns} data={redirects} rowKey="id" loading={loading} />
      </Card>
      <RedirectModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingRedirect(null); }}
        redirect={editingRedirect}
        redirects={redirects}
      />
    </div>
  );
};

const RedirectModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  redirect: any;
  redirects: any[];
}> = ({ isOpen, onClose, redirect, redirects }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    from: '',
    to: '',
  });
  const [errors, setErrors] = useState<{ from?: string; to?: string }>({});

  // Aggiorna formData quando redirect cambia
  useEffect(() => {
    if (redirect) {
      console.log('RedirectModal: redirect received', redirect);
      setFormData({
        from: redirect.from || '',
        to: redirect.to || '',
      });
    } else {
      // Reset per nuovo redirect
      setFormData({
        from: '',
        to: '',
      });
    }
    // Reset errori quando cambia il redirect
    setErrors({});
  }, [redirect]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      let updatedRedirects;
      if (redirect) {
        updatedRedirects = redirects.map(r => r.id === redirect.id ? { ...r, ...data } : r);
      } else {
        updatedRedirects = [...redirects, { id: String(Date.now()), ...data }];
      }
      const response = await fetch('/api/save-redirects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redirects: updatedRedirects }),
      });
      if (!response.ok) throw new Error('Errore nel salvare');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['redirects'] });
      alert(redirect ? 'Redirect modificato!' : 'Redirect aggiunto!');
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { from?: string; to?: string } = {};
    if (!formData.from) newErrors.from = 'Inserisci il percorso di origine';
    else if (formData.from.startsWith('/')) newErrors.from = 'Non includere lo slash iniziale';
    if (!formData.to) newErrors.to = 'Inserisci la destinazione';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    saveMutation.mutate(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={redirect ? 'Modifica Redirect' : 'Aggiungi Redirect'}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Annulla</Button>
          <Button variant="primary" onClick={handleSubmit} loading={saveMutation.isPending}>Salva</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            label="Da (From)"
            placeholder="piacere"
            value={formData.from}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, from: e.target.value }));
              if (errors.from) setErrors(prev => ({ ...prev, from: undefined }));
            }}
            required
          />
          {errors.from && <p className="mt-1 text-sm text-red-600">{errors.from}</p>}
        </div>
        <div>
          <Input
            label="A (To)"
            placeholder="https://menucolcodice.it oppure /"
            value={formData.to}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, to: e.target.value }));
              if (errors.to) setErrors(prev => ({ ...prev, to: undefined }));
            }}
            required
          />
          {errors.to && <p className="mt-1 text-sm text-red-600">{errors.to}</p>}
        </div>
      </form>
    </Modal>
  );
};
