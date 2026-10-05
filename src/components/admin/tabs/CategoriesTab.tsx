import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Table, Modal, Input, TextArea } from '@/components/admin';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON, normalizeCategoryIconId } from '@/constants/categoryIcons';
import { CategoryIcon } from '@/components/ui/CategoryIcon';

interface CategoriesTabProps {
  categories: any[];
  products: any[];
  loading: boolean;
  restaurantData?: any;
}

export const CategoriesTab: React.FC<CategoriesTabProps> = ({ categories, products, loading, restaurantData }) => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);

  const deleteMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      const category = categories.find(c => c.id === categoryId);
      const hasProducts = products.some(p => p.category === category?.name);
      
      if (hasProducts) {
        throw new Error("Non puoi eliminare una categoria che contiene prodotti!");
      }

      const updatedCategories = categories.filter(c => c.id !== categoryId);
      const response = await fetch('/api/save-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: updatedCategories }),
      });
      if (!response.ok) throw new Error('Errore nel salvare');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      alert('Categoria eliminata!');
    },
    onError: (error: any) => {
      alert(error.message || 'Errore nell\'eliminazione');
    },
  });

  const handleEdit = (category: any) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  const handleDelete = (categoryId: string) => {
    if (confirm('Sei sicuro di voler eliminare questa categoria?')) {
      deleteMutation.mutate(categoryId);
    }
  };

  const iconLabel = (value: string) => CATEGORY_ICONS.find((o) => o.id === normalizeCategoryIconId(value))?.label || 'Icona';

  const renderIcon = (icon: string) => {
    const label = iconLabel(icon);
    return (
      <span className="inline-flex items-center gap-2 px-2 py-1 bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200 rounded text-xs">
        <CategoryIcon icon={icon} size={16} />
        <span>{label}</span>
      </span>
    );
  };

  const columns = [
    {
      key: 'id',
      title: 'ID',
      dataIndex: 'id' as const,
      width: 60,
    },
    {
      key: 'name',
      title: 'Nome Categoria',
      dataIndex: 'name' as const,
      render: (name: string) => (
        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-sm">
          {name}
        </span>
      ),
    },
    {
      key: 'icon',
      title: 'Icona',
      dataIndex: 'icon' as const,
      render: (icon: string) => renderIcon(icon),
    },
    {
      key: 'description',
      title: 'Descrizione',
      dataIndex: 'description' as const,
    },
    {
      key: 'order',
      title: 'Ordine',
      dataIndex: 'order' as const,
      width: 80,
      render: (order: number) => order !== undefined ? order : '-',
    },
    {
      key: 'productCount',
      title: 'Prodotti',
      render: (_: any, record: any) => {
        const count = products.filter(p => p.category === record.name).length;
        return (
          <span className={`px-2 py-1 rounded text-xs ${
            count > 0 
              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
          }`}>
            {count} prodotti
          </span>
        );
      },
    },
    {
      key: 'actions',
      title: 'Azioni',
      render: (_: any, record: any) => (
        <div className="flex gap-2">
          <Button
            variant="primary"
            onClick={() => handleEdit(record)}
            className="text-xs"
          >
            <Edit className="w-3 h-3 mr-1" />
            Modifica
          </Button>
          <Button
            variant="danger"
            onClick={() => handleDelete(record.id)}
            className="text-xs"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Elimina
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Gestione Categorie Menu</strong>
          <br />
          Le categorie modificate qui saranno salvate nel menu laterale del sito. Attenzione: non puoi eliminare categorie che contengono prodotti.
        </p>
      </div>
      <Card
        title="Gestione Categorie"
        extra={
          <Button variant="primary" onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Aggiungi Categoria
          </Button>
        }
      >
        <Table columns={columns} data={categories} rowKey="id" loading={loading} />
      </Card>

      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCategory(null);
        }}
        category={editingCategory}
        categories={categories}
        restaurantData={restaurantData}
      />
    </div>
  );
};

const CategoryModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  category: any;
  categories: any[];
  restaurantData?: any;
}> = ({ isOpen, onClose, category, categories, restaurantData }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    icon: '',
    description: '',
    order: undefined as number | undefined,
  });
  const [selectedIcon, setSelectedIcon] = useState('');

  // Aggiorna formData quando category cambia
  useEffect(() => {
    if (category) {
      console.log('CategoryModal: category received', category);
      setFormData({
        name: category.name || '',
        icon: category.icon || '',
        description: category.description !== undefined ? category.description : '',
        order: category.order !== undefined ? category.order : undefined,
      });
      setSelectedIcon(category.icon || '');
    } else {
      // Reset per nuova categoria
      setFormData({
        name: '',
        icon: '',
        description: '',
        order: undefined,
      });
      setSelectedIcon('');
    }
  }, [category]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      let updatedCategories;
      if (category) {
        updatedCategories = categories.map(c =>
          c.id === category.id ? { ...c, ...data } : c
        );
      } else {
        const newCategory = {
          id: String(categories.length + 1),
          ...data,
        };
        updatedCategories = [...categories, newCategory];
      }

      const response = await fetch('/api/save-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: updatedCategories }),
      });
      if (!response.ok) throw new Error('Errore nel salvare');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      alert(category ? 'Categoria modificata!' : 'Categoria aggiunta!');
      onClose();
    },
    onError: () => {
      alert('Errore nel salvare la categoria');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({ ...formData, icon: selectedIcon });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={category ? 'Modifica Categoria' : 'Aggiungi Categoria'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Annulla
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={saveMutation.isPending}>
            Salva
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nome Categoria"
          placeholder="Es: Al Girarrosto"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Icona
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-64 overflow-y-auto p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
            {CATEGORY_ICONS.map((iconOption) => {
              const isSelected = normalizeCategoryIconId(selectedIcon || DEFAULT_CATEGORY_ICON) === iconOption.id;

              return (
                <div
                  key={iconOption.id}
                  onClick={() => {
                    setSelectedIcon(iconOption.id);
                    setFormData(prev => ({ ...prev, icon: iconOption.id }));
                  }}
                  className={`
                    flex flex-col items-center justify-center p-3 cursor-pointer rounded-lg transition-all
                    ${isSelected
                      ? 'bg-blue-600 border-2 border-blue-600'
                      : 'border-2 border-transparent hover:bg-gray-200 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  <CategoryIcon
                    icon={iconOption.id}
                    size={32}
                    className={isSelected ? 'text-white' : 'text-gray-700 dark:text-gray-300'}
                  />
                  <span className={`text-xs mt-1 text-center ${isSelected ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                    {iconOption.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <TextArea
          label="Descrizione"
          rows={2}
          placeholder="Breve descrizione della categoria"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          required
        />
        <Input
          label="Ordine di visualizzazione"
          type="number"
          min="0"
          max="999"
          placeholder="Lasciare vuoto per ordine automatico"
          value={formData.order || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, order: e.target.value ? parseInt(e.target.value) : undefined }))}
        />
        <p className="text-xs text-gray-500">
          Numero più basso = appare prima nel menu. Lasciare vuoto per ordine automatico.
        </p>
      </form>
    </Modal>
  );
};
