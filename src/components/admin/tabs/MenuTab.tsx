import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Table, Modal, Input, TextArea, Select } from '@/components/admin';
import { Plus, Edit, Trash2, Upload } from 'lucide-react';
import Image from 'next/image';
import { ALLERGEN_LABELS } from '@/constants/allergens';
import { AllergenIcon } from '@/components/ui/AllergenIcon';

interface MenuTabProps {
  products: any[];
  categories: any[];
  loading: boolean;
  restaurantData?: any;
}

export const MenuTab: React.FC<MenuTabProps> = ({ products, categories, loading, restaurantData }) => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [productImagePreview, setProductImagePreview] = useState('');

  const deleteMutation = useMutation({
    mutationFn: async (productId: string) => {
      const updatedProducts = products.filter(p => p.id !== productId);
      const response = await fetch('/api/save-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: updatedProducts, restaurantInfo: restaurantData || {} }),
      });
      if (!response.ok) throw new Error('Errore nel salvare');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      alert('Prodotto eliminato!');
    },
  });

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setProductImagePreview(product.imageUrl || '');
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingProduct(null);
    setProductImagePreview('');
    setIsModalOpen(true);
  };

  const handleDelete = (productId: string) => {
    if (confirm('Sei sicuro di voler eliminare questo prodotto?')) {
      deleteMutation.mutate(productId);
    }
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
      title: 'Nome',
      dataIndex: 'name' as const,
      render: (name: string) => <span className="font-medium">{name}</span>,
    },
    {
      key: 'category',
      title: 'Categoria',
      dataIndex: 'category' as const,
      render: (category: string) => (
        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
          {category}
        </span>
      ),
    },
    {
      key: 'price',
      title: 'Prezzo',
      dataIndex: 'price' as const,
      render: (price: number) => `€${price.toFixed(2)}`,
    },
    {
      key: 'bestSeller',
      title: 'Best Seller',
      dataIndex: 'bestSeller' as const,
      render: (bestSeller: boolean) =>
        bestSeller ? (
          <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded text-xs">
            ⭐ Best Seller
          </span>
        ) : (
          <span className="text-gray-400">No</span>
        ),
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
      <Card
        title="Gestione Menu"
        extra={
          <Button variant="primary" onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Aggiungi Prodotto
          </Button>
        }
      >
        <Table columns={columns} data={products} rowKey="id" loading={loading} />
      </Card>

      <ProductModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProduct(null);
          setProductImagePreview('');
        }}
        product={editingProduct}
        categories={categories}
        products={products}
        restaurantData={restaurantData}
      />
    </div>
  );
};

const ProductModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  product: any;
  categories: any[];
  products: any[];
  restaurantData?: any;
}> = ({ isOpen, onClose, product, categories, products, restaurantData }) => {
  const queryClient = useQueryClient();
  const model3dAllowed = Boolean(restaurantData?.tenant?.model3d);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    ingredients: '',
    description: '',
    price: 0,
    imageUrl: '',
    mediaType: 'image' as 'image' | 'model3d',
    bestSeller: false,
    allergens: [] as string[],
  });
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);

  const allergensList = ALLERGEN_LABELS;

  // Aggiorna formData quando product cambia
  useEffect(() => {
    if (product) {
      console.log('ProductModal: product received', product);
      console.log('ProductModal: allergens from product', product.allergens);
      const allergens = product.allergens || [];
      console.log('ProductModal: setting allergens to formData', allergens);
      setFormData({
        name: product.name || '',
        category: product.category || '',
        ingredients: product.description || '',
        description: product.ingredients || '',
        price: product.price || 0,
        imageUrl: product.imageUrl || '',
        mediaType: product.mediaType === 'model3d' ? 'model3d' : 'image',
        bestSeller: product.bestSeller || false,
        allergens: allergens,
      });
      setImagePreview(product.imageUrl || '');
    } else {
      setFormData({
        name: '',
        category: '',
        ingredients: '',
        description: '',
        price: 0,
        imageUrl: '',
        mediaType: 'image',
        bestSeller: false,
        allergens: [],
      });
      setImagePreview('');
    }
  }, [product]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      // Scambia i valori prima di salvare: ingredients diventa description e viceversa
      const swappedData = {
        ...data,
        ingredients: data.description,
        description: data.ingredients,
        allergens: data.allergens || [], // Assicura che gli allergeni siano sempre inclusi
      };
      console.log('Saving product with allergens:', swappedData.allergens);
      
      let updatedProducts;
      if (product) {
        updatedProducts = products.map(p =>
          p.id === product.id ? { ...p, ...swappedData } : p
        );
      } else {
        const maxId = products.reduce((max, p) => {
          const idNum = parseInt(p.id, 10);
          return !isNaN(idNum) && idNum > max ? idNum : max;
        }, -1);
        const newId = String(maxId + 1);
        updatedProducts = [...products, { id: newId, ...swappedData }];
      }

      const response = await fetch('/api/save-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: updatedProducts, restaurantInfo: restaurantData || {} }),
      });
      if (!response.ok) throw new Error('Errore nel salvare');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      alert(product ? 'Prodotto modificato!' : 'Prodotto aggiunto!');
      onClose();
    },
    onError: () => {
      alert('Errore nel salvare il prodotto');
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('kind', 'dish');

    try {
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: fd,
      });
      if (!response.ok) throw new Error('Upload fallito');
      const data = await response.json();
      setImagePreview(data.url);
      setFormData(prev => ({ ...prev, imageUrl: data.url, mediaType: 'image' }));
    } catch (error) {
      alert('Errore nel caricamento dell\'immagine');
    } finally {
      setUploading(false);
    }
  };

  const handleModel3DUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (ext !== '.glb' && ext !== '.gltf') {
      alert('Usa un file .glb o .gltf');
      return;
    }

    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);

    try {
      const response = await fetch('/api/upload-model', {
        method: 'POST',
        body: fd,
      });
      if (!response.ok) throw new Error('Upload fallito');
      const data = await response.json();
      setImagePreview(data.url);
      setFormData(prev => ({ ...prev, imageUrl: data.url, mediaType: 'model3d' }));
    } catch (error) {
      alert('Errore nel caricamento del modello 3D');
    } finally {
      setUploading(false);
    }
  };

  const handleMediaTypeChange = (type: 'image' | 'model3d') => {
    if (type === 'model3d' && !model3dAllowed) return;
    setFormData(prev => ({ ...prev, mediaType: type, imageUrl: '' }));
    setImagePreview('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.imageUrl) {
      alert(formData.mediaType === 'model3d' ? 'Carica un modello 3D prima di salvare' : "Carica un'immagine prima di salvare");
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? 'Modifica Prodotto' : 'Aggiungi Prodotto'}
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
          label="Nome Prodotto"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
        />
        <Select
          label="Categoria"
          value={formData.category}
          onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
          options={categories.map(cat => ({ value: cat.name, label: cat.name }))}
          required
        />
        <TextArea
          label="Ingredienti"
          rows={3}
          value={formData.ingredients}
          onChange={(e) => setFormData(prev => ({ ...prev, ingredients: e.target.value }))}
          required
        />
        <TextArea
          label="Descrizione"
          rows={2}
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          required
        />
        <Input
          label="Prezzo (€)"
          type="number"
          step="0.5"
          min="0"
          value={formData.price}
          onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
          required
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Media prodotto (foto o modello 3D)
          </label>
          <div className="flex gap-4 mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mediaType"
                checked={formData.mediaType === 'image'}
                onChange={() => handleMediaTypeChange('image')}
                className="rounded-full"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Foto</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mediaType"
                checked={formData.mediaType === 'model3d'}
                onChange={() => handleMediaTypeChange('model3d')}
                className="rounded-full"
                disabled={!model3dAllowed}
              />
              <span className={`text-sm ${model3dAllowed ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}`}>
                Modello 3D (.glb / .gltf)
              </span>
            </label>
          </div>
          {!model3dAllowed ? (
            <p className="text-xs text-gray-500 mb-3">
              I modelli 3D sono nel piano Pro. Le foto vanno benissimo per partire.
            </p>
          ) : null}
          {formData.mediaType === 'image' && (
            <>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="product-image-upload"
              />
              <label
                htmlFor="product-image-upload"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700"
              >
                <Upload className="w-4 h-4" />
                {uploading ? 'Caricamento...' : 'Carica Immagine'}
              </label>
              {imagePreview && (
                <div className="mt-4">
                  <Image
                    src={imagePreview}
                    alt="Anteprima"
                    width={200}
                    height={200}
                    className="w-full h-48 object-cover rounded"
                    unoptimized
                  />
                </div>
              )}
            </>
          )}
          {formData.mediaType === 'model3d' && (
            <>
              <input
                type="file"
                accept=".glb,.gltf"
                onChange={handleModel3DUpload}
                className="hidden"
                id="product-model3d-upload"
              />
              <label
                htmlFor="product-model3d-upload"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg cursor-pointer hover:bg-green-700"
              >
                <Upload className="w-4 h-4" />
                {uploading ? 'Caricamento...' : 'Carica modello 3D (.glb / .gltf)'}
              </label>
              {imagePreview && (
                <p className="mt-2 text-sm text-green-600 dark:text-green-400">Modello 3D caricato correttamente.</p>
              )}
            </>
          )}
        </div>
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.bestSeller}
              onChange={(e) => setFormData(prev => ({ ...prev, bestSeller: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Best Seller</span>
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Allergeni
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2 border border-gray-300 dark:border-gray-600 rounded-lg">
            {allergensList.map((allergen) => (
              <label key={allergen} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded">
                <input
                  type="checkbox"
                  checked={formData.allergens.includes(allergen)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData(prev => ({
                        ...prev,
                        allergens: [...prev.allergens, allergen]
                      }));
                    } else {
                      setFormData(prev => ({
                        ...prev,
                        allergens: prev.allergens.filter(a => a !== allergen)
                      }));
                    }
                  }}
                  className="rounded"
                />
                <AllergenIcon allergen={allergen} size={16} className="text-gray-500 dark:text-gray-400 shrink-0" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{allergen}</span>
              </label>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
};
