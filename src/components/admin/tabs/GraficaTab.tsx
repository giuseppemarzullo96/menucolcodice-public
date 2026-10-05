import React, { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Button, ColorPicker, Input, InputNumber } from '@/components/admin';
import { Save, Upload, ChevronDown, ChevronUp } from 'lucide-react';
import Image from 'next/image';
import { THEME_PRESETS, themeColorsFromPreset, type ThemePreset } from '@/utils/themePresets';

interface GraficaTabProps {
  form: UseFormReturn<any>;
  restaurantData: any;
  products?: any[];
}

export const GraficaTab: React.FC<GraficaTabProps> = ({ form, restaurantData, products = [] }) => {
  const queryClient = useQueryClient();
  const [logoPreview, setLogoPreview] = useState('');
  const [faviconPreview, setFaviconPreview] = useState('');
  const [homeBackgroundPreview, setHomeBackgroundPreview] = useState('');
  const [homeBackgroundVideoPreview, setHomeBackgroundVideoPreview] = useState('');
  const [cardBackgroundImagePreview, setCardBackgroundImagePreview] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [faviconUploading, setFaviconUploading] = useState(false);
  const [homeBackgroundUploading, setHomeBackgroundUploading] = useState(false);
  const [homeBackgroundVideoUploading, setHomeBackgroundVideoUploading] = useState(false);
  const [openPanels, setOpenPanels] = useState<string[]>([]);
  const [previewPresetId, setPreviewPresetId] = useState<string | null>(null);

  // Aggiorna preview quando restaurantData cambia
  useEffect(() => {
    if (restaurantData) {
      if (restaurantData.logoUrl) {
        setLogoPreview(restaurantData.logoUrl);
      }
      if (restaurantData.faviconUrl) {
        setFaviconPreview(restaurantData.faviconUrl);
      }
      if (restaurantData.homeBackgroundUrl) {
        setHomeBackgroundPreview(restaurantData.homeBackgroundUrl);
      }
      if (restaurantData.homeBackgroundVideoUrl) {
        setHomeBackgroundVideoPreview(restaurantData.homeBackgroundVideoUrl);
      }
      if (restaurantData.themeColors?.card?.backgroundImage) {
        setCardBackgroundImagePreview(restaurantData.themeColors.card.backgroundImage);
      }
    }
  }, [restaurantData]);

  const togglePanel = (panelKey: string) => {
    setOpenPanels(prev => 
      prev.includes(panelKey) 
        ? prev.filter(key => key !== panelKey)
        : [...prev, panelKey]
    );
  };

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const existingProducts = products.length > 0 
        ? products 
        : queryClient.getQueryData(['products']) || [];
      
      const response = await fetch('/api/save-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: existingProducts, restaurantInfo: data }),
      });
      if (!response.ok) throw new Error('Errore nel salvare');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      alert('Salvato con successo!');
    },
    onError: () => {
      alert('Errore nel salvare');
    },
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Upload fallito');
      const data = await response.json();
      setLogoPreview(data.url);
      form.setValue('logoUrl', data.url);
    } catch (error) {
      alert('Errore nel caricamento del logo');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFaviconUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Upload fallito');
      const data = await response.json();
      setFaviconPreview(data.url);
      form.setValue('faviconUrl', data.url);
    } catch (error) {
      alert('Errore nel caricamento del favicon');
    } finally {
      setFaviconUploading(false);
    }
  };

  const handleHomeBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setHomeBackgroundUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Upload fallito');
      const data = await response.json();
      setHomeBackgroundPreview(data.url);
      form.setValue('homeBackgroundUrl', data.url);
    } catch (error) {
      alert('Errore nel caricamento dell\'immagine');
    } finally {
      setHomeBackgroundUploading(false);
    }
  };

  const handleHomeBackgroundVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setHomeBackgroundVideoUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload-video', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Upload fallito');
      const data = await response.json();
      setHomeBackgroundVideoPreview(data.url);
      form.setValue('homeBackgroundVideoUrl', data.url);
    } catch (error) {
      alert('Errore nel caricamento del video');
    } finally {
      setHomeBackgroundVideoUploading(false);
    }
  };

  const applyPreset = (preset: ThemePreset) => {
    const generated = themeColorsFromPreset(preset);
    const current = form.watch('themeColors') || {};
    form.setValue(
      'themeColors',
      {
        ...generated,
        card: {
          ...generated.card,
          ...(current.card?.viewMode ? { viewMode: current.card.viewMode } : {}),
          ...(current.card?.backgroundImage ? { backgroundImage: current.card.backgroundImage } : {}),
          ...(current.card?.backgroundOpacity !== undefined ? { backgroundOpacity: current.card.backgroundOpacity } : {}),
        },
        ...(current.viewer3d ? { viewer3d: current.viewer3d } : {}),
      },
      { shouldDirty: true, shouldValidate: false }
    );
    setPreviewPresetId(preset.id);
  };

  const onSubmit = (data: any) => {
    // Ottieni tutti i valori del form per assicurarsi di salvare anche i campi di altre tab (es. Iubenda)
    const allFormValues = form.getValues();
    // Unisci i dati passati (modificati) con tutti i valori del form
    const completeData = { ...allFormValues, ...data };
    saveMutation.mutate(completeData);
  };

  return (
    <div className="space-y-6">
      <Card title="Logo e Immagini">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo Logo
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="text"
                  {...form.register('logoType')}
                  className="mr-2"
                />
                Testo + Icona
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="image"
                  {...form.register('logoType')}
                  className="mr-2"
                />
                Immagine
              </label>
            </div>
          </div>

          {form.watch('logoType') === 'image' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Upload Logo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload"
                />
                <label
                  htmlFor="logo-upload"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700"
                >
                  <Upload className="w-4 h-4" />
                  {logoUploading ? 'Caricamento...' : 'Carica Logo'}
                </label>
                {logoPreview && (
                  <div className="mt-4 p-4 border border-gray-300 dark:border-gray-600 rounded-lg">
                    <Image
                      src={logoPreview}
                      alt="Logo preview"
                      width={200}
                      height={100}
                      className="w-full h-auto object-contain"
                      unoptimized
                    />
                    <p className="mt-2 text-xs text-gray-500">URL: {logoPreview}</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputNumber
                  label="Larghezza (px)"
                  {...form.register('logoWidth', { valueAsNumber: true })}
                  value={form.watch('logoWidth') || 150}
                  min={50}
                  max={500}
                />
                <InputNumber
                  label="Altezza (px)"
                  {...form.register('logoHeight', { valueAsNumber: true })}
                  value={form.watch('logoHeight') || 50}
                  min={20}
                  max={200}
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Upload Favicon
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFaviconUpload}
              className="hidden"
              id="favicon-upload"
            />
            <label
              htmlFor="favicon-upload"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700"
            >
              <Upload className="w-4 h-4" />
              {faviconUploading ? 'Caricamento...' : 'Carica Favicon'}
            </label>
            {faviconPreview && (
              <div className="mt-4 p-4 border border-gray-300 dark:border-gray-600 rounded-lg">
                <Image
                  src={faviconPreview}
                  alt="Favicon preview"
                  width={32}
                  height={32}
                  className="object-contain"
                  unoptimized
                />
                <p className="mt-2 text-xs text-gray-500">URL: {faviconPreview}</p>
              </div>
            )}
            <p className="mt-2 text-xs text-gray-500">
              Il favicon apparirà nella tab del browser. Dimensioni consigliate: 32x32 o 64x64 pixels.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo Sfondo Home
            </label>
            <div className="flex gap-4 mb-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="color"
                  {...form.register('homeBackgroundType')}
                  className="mr-2"
                />
                Colore
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="image"
                  {...form.register('homeBackgroundType')}
                  className="mr-2"
                />
                Immagine
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="video"
                  {...form.register('homeBackgroundType')}
                  className="mr-2"
                />
                Video
              </label>
            </div>
          </div>

          {form.watch('homeBackgroundType') === 'image' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Upload Immagine di Sfondo Home
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleHomeBackgroundUpload}
                className="hidden"
                id="home-bg-upload"
              />
              <label
                htmlFor="home-bg-upload"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700"
              >
                <Upload className="w-4 h-4" />
                {homeBackgroundUploading ? 'Caricamento...' : 'Carica Immagine di Sfondo'}
              </label>
              {(homeBackgroundPreview || form.watch('homeBackgroundUrl')) && (
                <div className="mt-4 p-4 border border-gray-300 dark:border-gray-600 rounded-lg">
                  <Image
                    key={form.watch('homeBackgroundUrl') || homeBackgroundPreview}
                    src={form.watch('homeBackgroundUrl') || homeBackgroundPreview}
                    alt="Home background preview"
                    width={600}
                    height={200}
                    className="w-full h-auto max-h-48 object-cover rounded"
                    unoptimized
                  />
                  <p className="mt-2 text-xs text-gray-500">URL: {form.watch('homeBackgroundUrl') || homeBackgroundPreview}</p>
                </div>
              )}
              <p className="mt-2 text-xs text-gray-500">
                Questa immagine apparirà come sfondo nella pagina home. Dimensioni consigliate: 1920x1080 pixels.
              </p>
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                Dopo aver caricato l&apos;immagine, clicca &quot;Salva&quot; in fondo alla sezione per applicare le modifiche alla pagina principale.
              </p>
            </div>
          )}

          {form.watch('homeBackgroundType') === 'video' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Upload Video di Sfondo Home
              </label>
              <input
                type="file"
                accept="video/*"
                onChange={handleHomeBackgroundVideoUpload}
                className="hidden"
                id="home-video-upload"
              />
              <label
                htmlFor="home-video-upload"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700"
              >
                <Upload className="w-4 h-4" />
                {homeBackgroundVideoUploading ? 'Caricamento...' : 'Carica Video di Sfondo'}
              </label>
              {homeBackgroundVideoPreview && (
                <div className="mt-4 p-4 border border-gray-300 dark:border-gray-600 rounded-lg">
                  <video
                    src={homeBackgroundVideoPreview}
                    controls
                    className="w-full h-auto max-h-48 object-cover rounded"
                  />
                  <p className="mt-2 text-xs text-gray-500">URL: {homeBackgroundVideoPreview}</p>
                </div>
              )}
              <p className="mt-2 text-xs text-gray-500">
                Questo video apparirà come sfondo nella pagina home. Formati supportati: MP4, WebM, OGG, MOV. Dimensione massima: 50MB.
              </p>
            </div>
          )}
        </form>
      </Card>

      <Card title="Scegli una grafica pronta">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Un clic applica colori e stile al menu. Poi salva in basso per pubblicare. Non serve scegliere codici colore.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {THEME_PRESETS.map((preset) => {
            const preview = themeColorsFromPreset(preset);
            const selected = previewPresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`text-left rounded-lg border p-3 transition-all ${
                  selected
                    ? 'border-blue-600 ring-2 ring-blue-200 dark:ring-blue-900'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'
                }`}
              >
                <div
                  className="rounded-md overflow-hidden border border-black/10 mb-2"
                  aria-hidden
                >
                  <div className="h-6 px-2 flex items-center text-[10px] text-white" style={{ background: preview.navbar.background }}>
                    Menu
                  </div>
                  <div className="p-2 space-y-1" style={{ background: preview.layout.background }}>
                    <div className="h-3 rounded-sm w-3/4" style={{ background: preview.card.productNameColor, opacity: 0.35 }} />
                    <div className="h-8 rounded-sm" style={{ background: preview.card.backgroundColor }} />
                  </div>
                </div>
                <div className="flex gap-1 mb-1">
                  {preset.swatches.map((color) => (
                    <span key={color} className="w-4 h-4 rounded-full border border-black/10" style={{ background: color }} />
                  ))}
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{preset.name}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-500">
          <button
            type="button"
            className="underline hover:no-underline"
            onClick={() => document.getElementById('theme-advanced')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Personalizza ogni singolo colore →
          </button>
        </p>
      </Card>

      <div id="theme-advanced">
      <Card title="Colori avanzati">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Layout Generale */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <button
              type="button"
              onClick={() => togglePanel('layout')}
              className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="font-medium text-gray-900 dark:text-white">🎨 Layout Generale</span>
              {openPanels.includes('layout') ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            {openPanels.includes('layout') && (
              <div className="p-4 space-y-4">
                <ColorPicker
                  label="Sfondo Generale Pagina"
                  name="themeColors.layout.background"
                  value={form.watch('themeColors.layout.background') || '#000000'}
                  onChange={(color) => {
                    const currentTheme = form.watch('themeColors') || {};
                    form.setValue('themeColors', {
                      ...currentTheme,
                      layout: { ...currentTheme.layout, background: color }
                    }, { shouldDirty: true, shouldValidate: false });
                  }}
                />
                <ColorPicker
                  label="Colore Pulsante Pagina Principale"
                  name="themeColors.layout.homeButtonColor"
                  value={form.watch('themeColors.layout.homeButtonColor') || '#1890ff'}
                  onChange={(color) => {
                    const currentTheme = form.watch('themeColors') || {};
                    form.setValue('themeColors', {
                      ...currentTheme,
                      layout: { ...currentTheme.layout, homeButtonColor: color }
                    }, { shouldDirty: true, shouldValidate: false });
                  }}
                />
                <ColorPicker
                  label="Colore Testo Pulsante Pagina Principale"
                  name="themeColors.layout.homeButtonTextColor"
                  value={form.watch('themeColors.layout.homeButtonTextColor') || '#ffffff'}
                  onChange={(color) => {
                    const currentTheme = form.watch('themeColors') || {};
                    form.setValue('themeColors', {
                      ...currentTheme,
                      layout: { ...currentTheme.layout, homeButtonTextColor: color }
                    }, { shouldDirty: true, shouldValidate: false });
                  }}
                />
              </div>
            )}
          </div>

          {/* Navbar */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <button
              type="button"
              onClick={() => togglePanel('navbar')}
              className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="font-medium text-gray-900 dark:text-white">📱 Navbar (Barra di Navigazione)</span>
              {openPanels.includes('navbar') ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            {openPanels.includes('navbar') && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <ColorPicker
                    label="Sfondo Navbar"
                    value={form.watch('themeColors.navbar.background') || '#141414'}
                    onChange={(color) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        navbar: { ...currentTheme.navbar, background: color }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                  />
                  <ColorPicker
                    label="Colore Logo/Icona"
                    value={form.watch('themeColors.navbar.logoColor') || '#FFB800'}
                    onChange={(color) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        navbar: { ...currentTheme.navbar, logoColor: color }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                  />
                  <ColorPicker
                    label="Colore Testo Nome"
                    value={form.watch('themeColors.navbar.textColor') || '#ffffff'}
                    onChange={(color) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        navbar: { ...currentTheme.navbar, textColor: color }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                  />
                  <ColorPicker
                    label="Sfondo Pulsanti"
                    value={form.watch('themeColors.navbar.buttonBackground') || '#303030'}
                    onChange={(color) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        navbar: { ...currentTheme.navbar, buttonBackground: color }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                  />
                  <ColorPicker
                    label="Testo Pulsanti"
                    value={form.watch('themeColors.navbar.buttonText') || '#ffffff'}
                    onChange={(color) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        navbar: { ...currentTheme.navbar, buttonText: color }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                  />
                  <ColorPicker
                    label="Pulsanti Hover"
                    value={form.watch('themeColors.navbar.buttonHover') || '#404040'}
                    onChange={(color) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        navbar: { ...currentTheme.navbar, buttonHover: color }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                  />
                  <ColorPicker
                    label="Colore Icone"
                    value={form.watch('themeColors.navbar.iconColor') || '#ffffff'}
                    onChange={(color) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        navbar: { ...currentTheme.navbar, iconColor: color }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <button
              type="button"
              onClick={() => togglePanel('sidebar')}
              className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="font-medium text-gray-900 dark:text-white">📋 Sidebar (Menu Laterale)</span>
              {openPanels.includes('sidebar') ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            {openPanels.includes('sidebar') && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <ColorPicker
                    label="Sfondo Sidebar"
                    value={form.watch('themeColors.sidebar.background') || '#ffffff'}
                    onChange={(color) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        sidebar: { ...currentTheme.sidebar, background: color }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                  />
                  <ColorPicker
                    label="Colore Titolo"
                    value={form.watch('themeColors.sidebar.titleColor') || '#FFB800'}
                    onChange={(color) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        sidebar: { ...currentTheme.sidebar, titleColor: color }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                  />
                  <ColorPicker
                    label="Sfondo Voci Menu"
                    value={form.watch('themeColors.sidebar.menuItemBackground') || '#401b0e'}
                    onChange={(color) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        sidebar: { ...currentTheme.sidebar, menuItemBackground: color }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                  />
                  <ColorPicker
                    label="Colore Voci Menu"
                    value={form.watch('themeColors.sidebar.menuItemColor') || '#ffffff'}
                    onChange={(color) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        sidebar: { ...currentTheme.sidebar, menuItemColor: color }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                  />
                  <ColorPicker
                    label="Voce Menu Attiva"
                    value={form.watch('themeColors.sidebar.menuItemActive') || '#FFB800'}
                    onChange={(color) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        sidebar: { ...currentTheme.sidebar, menuItemActive: color }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                  />
                  <ColorPicker
                    label="Voce Menu Hover"
                    value={form.watch('themeColors.sidebar.menuItemHover') || '#FFE5B4'}
                    onChange={(color) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        sidebar: { ...currentTheme.sidebar, menuItemHover: color }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                  />
                  <ColorPicker
                    label="Colore Icone Menu"
                    value={form.watch('themeColors.sidebar.iconColor') || '#FFB800'}
                    onChange={(color) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        sidebar: { ...currentTheme.sidebar, iconColor: color }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Drawer */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <button
              type="button"
              onClick={() => togglePanel('drawer')}
              className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="font-medium text-gray-900 dark:text-white">📱 Drawer (Menu Mobile)</span>
              {openPanels.includes('drawer') ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            {openPanels.includes('drawer') && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ColorPicker
                    label="Sfondo Drawer"
                    value={form.watch('themeColors.drawer.background') || '#ffffff'}
                    onChange={(color) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        drawer: { ...currentTheme.drawer, background: color }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                  />
                  <ColorPicker
                    label="Colore Titolo"
                    value={form.watch('themeColors.drawer.titleColor') || '#FFB800'}
                    onChange={(color) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        drawer: { ...currentTheme.drawer, titleColor: color }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                  />
                  <ColorPicker
                    label="Colore Voci Menu"
                    value={form.watch('themeColors.drawer.menuItemColor') || '#000000'}
                    onChange={(color) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        drawer: { ...currentTheme.drawer, menuItemColor: color }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                  />
                  <ColorPicker
                    label="Colore Testo Footer"
                    value={form.watch('themeColors.drawer.footerTextColor') || '#d9d9d9'}
                    onChange={(color) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        drawer: { ...currentTheme.drawer, footerTextColor: color }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Card Prodotto */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <button
              type="button"
              onClick={() => togglePanel('card')}
              className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="font-medium text-gray-900 dark:text-white">🃏 Card Prodotto</span>
              {openPanels.includes('card') ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            {openPanels.includes('card') && (
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sfondo Card (immagine o colore)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="#FFFFFF o https://..."
                      value={cardBackgroundImagePreview}
                      onChange={(e) => {
                        setCardBackgroundImagePreview(e.target.value);
                        const currentTheme = form.watch('themeColors') || {};
                        form.setValue('themeColors', {
                          ...currentTheme,
                          card: { ...currentTheme.card, backgroundImage: e.target.value }
                        }, { shouldDirty: true, shouldValidate: false });
                      }}
                      className="flex-1"
                    />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const formData = new FormData();
                        formData.append('file', file);
                        try {
                          const response = await fetch('/api/upload-image', {
                            method: 'POST',
                            body: formData,
                          });
                          if (!response.ok) throw new Error('Upload fallito');
                          const data = await response.json();
                          setCardBackgroundImagePreview(data.url);
                          const currentTheme = form.watch('themeColors') || {};
                          form.setValue('themeColors', {
                            ...currentTheme,
                            card: { ...currentTheme.card, backgroundImage: data.url }
                          }, { shouldDirty: true, shouldValidate: false });
                          alert('Immagine di sfondo caricata!');
                        } catch (error) {
                          alert('Errore nel caricamento');
                        }
                      }}
                      className="hidden"
                      id="card-bg-upload"
                    />
                    <label
                      htmlFor="card-bg-upload"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700"
                    >
                      <Upload className="w-4 h-4" />
                      Carica
                    </label>
                  </div>
                  {cardBackgroundImagePreview && (cardBackgroundImagePreview.startsWith('http') || cardBackgroundImagePreview.startsWith('/')) && (
                    <div className="mt-2">
                      <Image
                        src={cardBackgroundImagePreview}
                        alt="Sfondo Card"
                        width={200}
                        height={100}
                        className="w-auto max-w-[200px] h-auto max-h-[100px] object-cover rounded"
                        unoptimized
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Vista del menu
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const currentTheme = form.watch('themeColors') || {};
                        form.setValue('themeColors', {
                          ...currentTheme,
                          card: { ...currentTheme.card, viewMode: 'list' }
                        }, { shouldDirty: true, shouldValidate: false });
                      }}
                      className={`text-left rounded-xl border-2 p-3 transition ${
                        (form.watch('themeColors.card.viewMode') || 'list') === 'list'
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="space-y-2 mb-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded bg-gray-200 dark:bg-gray-600 shrink-0" />
                            <span className="flex-1 border-b border-dotted border-gray-400 h-3" />
                            <span className="text-[10px] text-gray-500">€</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-sm font-semibold">Elenco sobrio</p>
                      <p className="text-xs text-gray-500 mt-1">Nome, prezzo e ingredienti in riga, come un menu cartaceo.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const currentTheme = form.watch('themeColors') || {};
                        form.setValue('themeColors', {
                          ...currentTheme,
                          card: { ...currentTheme.card, viewMode: 'carousel' }
                        }, { shouldDirty: true, shouldValidate: false });
                      }}
                      className={`text-left rounded-xl border-2 p-3 transition ${
                        form.watch('themeColors.card.viewMode') === 'carousel'
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-end justify-center gap-1 h-16 mb-3">
                        <span className="w-8 h-10 rounded bg-gray-200 dark:bg-gray-600 opacity-50" />
                        <span className="w-10 h-14 rounded bg-gray-300 dark:bg-gray-500" />
                        <span className="w-8 h-10 rounded bg-gray-200 dark:bg-gray-600 opacity-50" />
                      </div>
                      <p className="text-sm font-semibold">Carosello</p>
                      <p className="text-xs text-gray-500 mt-1">Card con foto grandi, da scorrere in orizzontale.</p>
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <InputNumber
                    label="Trasparenza Sfondo (0-1)"
                    value={form.watch('themeColors.card.backgroundOpacity') || 1}
                    onChange={(e) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        card: { ...currentTheme.card, backgroundOpacity: parseFloat(e.target.value) || 1 }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                    min={0}
                    max={1}
                    step={0.1}
                  />
                  <ColorPicker
                    label="Sfondo Card (colore)"
                    value={form.watch('themeColors.card.backgroundColor') || '#fcbe00'}
                    onChange={(color) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        card: { ...currentTheme.card, backgroundColor: color }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                  />
                  <ColorPicker
                    label="Tag Best Seller"
                    value={form.watch('themeColors.card.bestSellerTagColor') || '#fcbe00'}
                    onChange={(color) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        card: { ...currentTheme.card, bestSellerTagColor: color }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                  />
                  <ColorPicker
                    label="Nome Prodotto"
                    value={form.watch('themeColors.card.productNameColor') || '#ffffff'}
                    onChange={(color) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        card: { ...currentTheme.card, productNameColor: color }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                  />
                  <ColorPicker
                    label="Prezzo"
                    value={form.watch('themeColors.card.priceColor') || '#cc1f00'}
                    onChange={(color) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        card: { ...currentTheme.card, priceColor: color }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                  />
                  <ColorPicker
                    label="Ingredienti"
                    value={form.watch('themeColors.card.ingredientsColor') || '#d9d9d9'}
                    onChange={(color) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        card: { ...currentTheme.card, ingredientsColor: color }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                  />
                  <ColorPicker
                    label="Icona Freccia"
                    value={form.watch('themeColors.card.detailsButtonIcon') || '#ffffff'}
                    onChange={(color) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        card: { ...currentTheme.card, detailsButtonIcon: color }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                  />
                  <ColorPicker
                    label="Colore Ombra"
                    value={form.watch('themeColors.card.shadowColor') || '#000000'}
                    onChange={(color) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        card: { ...currentTheme.card, shadowColor: color }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                  />
                  <InputNumber
                    label="Opacità Ombra (0-1)"
                    value={form.watch('themeColors.card.shadowOpacity') || 0.1}
                    onChange={(e) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        card: { ...currentTheme.card, shadowOpacity: parseFloat(e.target.value) || 0.1 }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                    min={0}
                    max={1}
                    step={0.1}
                  />
                  <InputNumber
                    label="Opacità Ombra Hover (0-1)"
                    value={form.watch('themeColors.card.hoverShadowOpacity') || 0.15}
                    onChange={(e) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        card: { ...currentTheme.card, hoverShadowOpacity: parseFloat(e.target.value) || 0.15 }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                    min={0}
                    max={1}
                    step={0.1}
                  />
                  <InputNumber
                    label="Border Radius (px)"
                    value={form.watch('themeColors.card.borderRadius') || 12}
                    onChange={(e) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        card: { ...currentTheme.card, borderRadius: parseInt(e.target.value) || 12 }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                    min={0}
                    max={50}
                    step={1}
                  />
                  <ColorPicker
                    label="Colore Bordo Card"
                    value={form.watch('themeColors.card.borderColor') || '#d9d9d9'}
                    onChange={(color) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        card: { ...currentTheme.card, borderColor: color }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                  />
                  <InputNumber
                    label="Spessore Bordo (px)"
                    value={form.watch('themeColors.card.borderWidth') || 1}
                    onChange={(e) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        card: { ...currentTheme.card, borderWidth: parseInt(e.target.value) || 1 }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                    min={0}
                    max={20}
                    step={1}
                  />
                  <ColorPicker
                    label="Sfondo Pulsante Dettagli"
                    value={form.watch('themeColors.card.detailsButtonBackground') || '#303030'}
                    onChange={(color) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        card: { ...currentTheme.card, detailsButtonBackground: color }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Card Dettagli Prodotto */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <button
              type="button"
              onClick={() => togglePanel('cardDetails')}
              className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="font-medium text-gray-900 dark:text-white">📄 Card Dettagli Prodotto</span>
              {openPanels.includes('cardDetails') ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            {openPanels.includes('cardDetails') && (
              <div className="p-4 space-y-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Colori per la pagina dei dettagli del piatto. Questi colori vengono applicati alla card che appare quando si clicca su un piatto per vedere i dettagli completi.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <ColorPicker
                    label="Colore Titolo Sezione (Ingredienti/Descrizione)"
                    value={form.watch('themeColors.card.subtitleColor') || '#ffffff'}
                    onChange={(color) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        card: { ...currentTheme.card, subtitleColor: color }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                  />
                  <ColorPicker
                    label="Colore Testo Ingredienti"
                    value={form.watch('themeColors.card.detailsIngredientsColor') || '#d9d9d9'}
                    onChange={(color) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        card: { ...currentTheme.card, detailsIngredientsColor: color }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                  />
                  <ColorPicker
                    label="Colore Testo Descrizione"
                    value={form.watch('themeColors.card.descriptionTextColor') || '#d9d9d9'}
                    onChange={(color) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        card: { ...currentTheme.card, descriptionTextColor: color }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                  />
                  <ColorPicker
                    label="Colore Bordo Card Dettagli"
                    value={form.watch('themeColors.card.detailsBorderColor') || '#d9d9d9'}
                    onChange={(color) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        card: { ...currentTheme.card, detailsBorderColor: color }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                  />
                  <InputNumber
                    label="Spessore Bordo Card Dettagli (px)"
                    value={form.watch('themeColors.card.detailsBorderWidth') || 1}
                    onChange={(e) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        card: { ...currentTheme.card, detailsBorderWidth: parseInt(e.target.value) || 1 }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                    min={0}
                    max={20}
                    step={1}
                  />
                  <ColorPicker
                    label="Colore Chip Allergeni"
                    value={form.watch('themeColors.card.allergenTagColor') || '#ff9800'}
                    onChange={(color) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        card: { ...currentTheme.card, allergenTagColor: color }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                  />
                  <ColorPicker
                    label="Colore Testo Allergeni"
                    value={form.watch('themeColors.card.allergenTextColor') || '#ffffff'}
                    onChange={(color) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        card: { ...currentTheme.card, allergenTextColor: color }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sezioni Menu */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <button
              type="button"
              onClick={() => togglePanel('sections')}
              className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="font-medium text-gray-900 dark:text-white">📑 Sezioni Menu</span>
              {openPanels.includes('sections') ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            {openPanels.includes('sections') && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ColorPicker
                    label="Colore Titolo Sezione"
                    value={form.watch('themeColors.sections.titleColor') || '#FFB800'}
                    onChange={(color) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        sections: { ...currentTheme.sections, titleColor: color }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                  />
                  <ColorPicker
                    label="Colore Descrizione"
                    value={form.watch('themeColors.sections.descriptionColor') || '#d9d9d9'}
                    onChange={(color) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        sections: { ...currentTheme.sections, descriptionColor: color }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <button
              type="button"
              onClick={() => togglePanel('footer')}
              className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="font-medium text-gray-900 dark:text-white">🦶 Footer</span>
              {openPanels.includes('footer') ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            {openPanels.includes('footer') && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ColorPicker
                    label="Sfondo Footer"
                    value={form.watch('themeColors.footer.background') || '#141414'}
                    onChange={(color) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        footer: { ...currentTheme.footer, background: color }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                  />
                  <ColorPicker
                    label="Colore Testo"
                    value={form.watch('themeColors.footer.textColor') || '#d9d9d9'}
                    onChange={(color) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        footer: { ...currentTheme.footer, textColor: color }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                  />
                  <InputNumber
                    label="Opacità Link Hover (0-1)"
                    value={form.watch('themeColors.footer.linkHoverOpacity') || 0.8}
                    onChange={(e) => {
                      const currentTheme = form.watch('themeColors') || {};
                      form.setValue('themeColors', {
                        ...currentTheme,
                        footer: { ...currentTheme.footer, linkHoverOpacity: parseFloat(e.target.value) || 0.8 }
                      }, { shouldDirty: true, shouldValidate: false });
                    }}
                    min={0}
                    max={1}
                    step={0.1}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Viewer 3D - Luci */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <button
              type="button"
              onClick={() => togglePanel('modelViewer')}
              className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="font-medium text-gray-900 dark:text-white">💡 Viewer 3D - Luci</span>
              {openPanels.includes('modelViewer') ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            {openPanels.includes('modelViewer') && (
              <div className="p-4 space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Intensità e posizione delle luci per gli oggetti 3D (card e dettaglio prodotto). Valori in radianti per le posizioni (es. 5 = luce da destra/sopra).
                </p>
                <InputNumber
                  label="Luce ambientale - Intensità (0-2)"
                  value={form.watch('themeColors.modelViewer.ambientIntensity') ?? 0.6}
                  onChange={(e) => {
                    const currentTheme = form.watch('themeColors') || {};
                    form.setValue('themeColors', {
                      ...currentTheme,
                      modelViewer: { ...currentTheme.modelViewer, ambientIntensity: parseFloat(e.target.value) ?? 0.6 }
                    }, { shouldDirty: true, shouldValidate: false });
                  }}
                  min={0}
                  max={2}
                  step={0.1}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputNumber label="Luce direzionale 1 - X" value={form.watch('themeColors.modelViewer.directional1Position.0') ?? 5} onChange={(e) => { const t = form.watch('themeColors') || {}; const p = t.modelViewer?.directional1Position || [5, 5, 5]; form.setValue('themeColors', { ...t, modelViewer: { ...t.modelViewer, directional1Position: [parseFloat(e.target.value) || 5, p[1], p[2]] } }, { shouldDirty: true }); }} />
                  <InputNumber label="Luce direzionale 1 - Y" value={form.watch('themeColors.modelViewer.directional1Position.1') ?? 5} onChange={(e) => { const t = form.watch('themeColors') || {}; const p = t.modelViewer?.directional1Position || [5, 5, 5]; form.setValue('themeColors', { ...t, modelViewer: { ...t.modelViewer, directional1Position: [p[0], parseFloat(e.target.value) || 5, p[2]] } }, { shouldDirty: true }); }} />
                  <InputNumber label="Luce direzionale 1 - Z" value={form.watch('themeColors.modelViewer.directional1Position.2') ?? 5} onChange={(e) => { const t = form.watch('themeColors') || {}; const p = t.modelViewer?.directional1Position || [5, 5, 5]; form.setValue('themeColors', { ...t, modelViewer: { ...t.modelViewer, directional1Position: [p[0], p[1], parseFloat(e.target.value) || 5] } }, { shouldDirty: true }); }} />
                  <InputNumber label="Luce direzionale 1 - Intensità" value={form.watch('themeColors.modelViewer.directional1Intensity') ?? 1} onChange={(e) => { const t = form.watch('themeColors') || {}; form.setValue('themeColors', { ...t, modelViewer: { ...t.modelViewer, directional1Intensity: parseFloat(e.target.value) ?? 1 } }, { shouldDirty: true }); }} min={0} max={3} step={0.1} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputNumber label="Luce direzionale 2 - X" value={form.watch('themeColors.modelViewer.directional2Position.0') ?? -5} onChange={(e) => { const t = form.watch('themeColors') || {}; const p = t.modelViewer?.directional2Position || [-5, 5, -5]; form.setValue('themeColors', { ...t, modelViewer: { ...t.modelViewer, directional2Position: [parseFloat(e.target.value) ?? -5, p[1], p[2]] } }, { shouldDirty: true }); }} />
                  <InputNumber label="Luce direzionale 2 - Y" value={form.watch('themeColors.modelViewer.directional2Position.1') ?? 5} onChange={(e) => { const t = form.watch('themeColors') || {}; const p = t.modelViewer?.directional2Position || [-5, 5, -5]; form.setValue('themeColors', { ...t, modelViewer: { ...t.modelViewer, directional2Position: [p[0], parseFloat(e.target.value) ?? 5, p[2]] } }, { shouldDirty: true }); }} />
                  <InputNumber label="Luce direzionale 2 - Z" value={form.watch('themeColors.modelViewer.directional2Position.2') ?? -5} onChange={(e) => { const t = form.watch('themeColors') || {}; const p = t.modelViewer?.directional2Position || [-5, 5, -5]; form.setValue('themeColors', { ...t, modelViewer: { ...t.modelViewer, directional2Position: [p[0], p[1], parseFloat(e.target.value) ?? -5] } }, { shouldDirty: true }); }} />
                  <InputNumber label="Luce direzionale 2 - Intensità" value={form.watch('themeColors.modelViewer.directional2Intensity') ?? 0.5} onChange={(e) => { const t = form.watch('themeColors') || {}; form.setValue('themeColors', { ...t, modelViewer: { ...t.modelViewer, directional2Intensity: parseFloat(e.target.value) ?? 0.5 } }, { shouldDirty: true }); }} min={0} max={3} step={0.1} />
                </div>
              </div>
            )}
          </div>

          {/* Pulsante Informazioni (Angolino Social) */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <button
              type="button"
              onClick={() => togglePanel('socialButton')}
              className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="font-medium text-gray-900 dark:text-white">ℹ️ Pulsante Informazioni</span>
              {openPanels.includes('socialButton') ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            {openPanels.includes('socialButton') && (
              <div className="p-4 space-y-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded mb-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Configura i colori dell&apos;angolino bombato che appare in basso a destra della pagina. Quando premuto, mostra tutti i cerchi dei social con una transizione animata.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ColorPicker
                    label="Colore Sfondo Angolino"
                    value={form.watch('socialButtonColor') || '#6366f1'}
                    onChange={(color) => {
                      form.setValue('socialButtonColor', color, { shouldDirty: true, shouldValidate: false });
                    }}
                  />
                  <ColorPicker
                    label="Colore Icona Punto Interrogativo"
                    value={form.watch('socialIconColor') || '#ffffff'}
                    onChange={(color) => {
                      form.setValue('socialIconColor', color, { shouldDirty: true, shouldValidate: false });
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Pulsante WhatsApp Fluttuante */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <button
              type="button"
              onClick={() => togglePanel('whatsappButton')}
              className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="font-medium text-gray-900 dark:text-white">💬 Pulsante WhatsApp Fluttuante</span>
              {openPanels.includes('whatsappButton') ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            {openPanels.includes('whatsappButton') && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ColorPicker
                    label="Colore Sfondo"
                    name="whatsappButtonColor"
                    value={form.watch('whatsappButtonColor') || '#25D366'}
                    onChange={(color) => form.setValue('whatsappButtonColor', color, { shouldDirty: true, shouldValidate: false })}
                  />
                  <ColorPicker
                    label="Colore Icona"
                    name="whatsappIconColor"
                    value={form.watch('whatsappIconColor') || '#ffffff'}
                    onChange={(color) => form.setValue('whatsappIconColor', color, { shouldDirty: true, shouldValidate: false })}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Nota: I colori del tema verranno applicati dopo il salvataggio e il ricaricamento della pagina.
            </p>
          </div>
        </form>
      </Card>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={form.handleSubmit(onSubmit)}
          loading={saveMutation.isPending}
          variant="primary"
        >
          <Save className="w-4 h-4 mr-2" />
          Salva Configurazione Grafica
        </Button>
      </div>
    </div>
  );
};
