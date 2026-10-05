import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Input, TextArea } from '@/components/admin';
import { PhonePrefixField } from '@/components/admin/PhonePrefixField';
import { BookUser, MessageCircle, Save } from 'lucide-react';
import { COMPANY, COMPANY_WHATSAPP_URL } from '@/seo/company';

interface GeneralTabProps {
  form: UseFormReturn<any>;
  restaurantData: any;
  products?: any[];
}

export const GeneralTab: React.FC<GeneralTabProps> = ({ form, restaurantData, products = [] }) => {
  const queryClient = useQueryClient();
  const tenant = restaurantData?.tenant;
  const storedWhatsappNumbers: string[] = Array.isArray(tenant?.whatsappNumbers)
    ? tenant.whatsappNumbers.filter(Boolean).slice(0, 3)
    : [];
  const [extraNumbers, setExtraNumbers] = React.useState(
    storedWhatsappNumbers.slice(1).join('\n')
  );

  React.useEffect(() => {
    setExtraNumbers(storedWhatsappNumbers.slice(1).join('\n'));
  }, [tenant?.whatsappNumbers?.join(',')]);

  const whatsappMutation = useMutation({
    mutationFn: async (whatsappNumber: string) => {
      if (!whatsappNumber) throw new Error('Inserisci il numero di cellulare.');
      const extras = extraNumbers
        .split(/[\n,;]+/)
        .map((n) => n.trim())
        .filter(Boolean)
        .slice(0, 2);
      const response = await fetch('/api/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsappNumbers: [whatsappNumber, ...extras] }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Errore');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant'] });
      alert('Numeri WhatsApp salvati.');
    },
    onError: (err: Error) => alert(err.message),
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      // Recupera i prodotti esistenti dalla cache o usa quelli passati come prop
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


  const onSubmit = (data: any) => {
    saveMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      {tenant?.plan === 'free' && (
        <Card title="Piano Free">
          <p className="text-sm" style={{ color: '#5C5A52' }}>
            Puoi caricare fino a {tenant.maxProducts} piatti e {tenant.maxCategories} categorie.
            Per togliere i limiti passa a Media (13,99 €/mese + IVA). WhatsApp e OCR sono nel piano Pro.
          </p>
        </Card>
      )}
      {tenant?.whatsapp && (
        <Card title="Gestione menu via WhatsApp">
          <p className="text-sm mb-3" style={{ color: '#5C5A52' }}>
            Salva il nostro numero in rubrica, scrivici da questo cellulare e da lì cambi il menu quando vuoi.
            Solo il tuo numero può modificare il tuo menu. Puoi autorizzare fino a 3 cellulari del locale
            (titolare, chef…).
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <a
              href="/menu-col-codice.vcf"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-[#1A1A17] hover:bg-[#2E2E29] text-[#FAF7F0]"
            >
              <BookUser className="w-4 h-4" />
              Salva in rubrica
            </a>
            <a
              href={COMPANY_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-[#EFE9DC] hover:bg-[#E8E2D6] text-[#1A1A17]"
            >
              <MessageCircle className="w-4 h-4" />
              Apri WhatsApp
            </a>
            {storedWhatsappNumbers[0] ? (
              <a
                href={`${COMPANY_WHATSAPP_URL}?text=${encodeURIComponent('lista')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-[#25D366] hover:bg-[#1da851] text-white"
              >
                <MessageCircle className="w-4 h-4" />
                Mandami il messaggio di prova
              </a>
            ) : null}
          </div>
          <PhonePrefixField
            storedNumber={storedWhatsappNumbers[0] || ''}
            saving={whatsappMutation.isPending}
            onSave={(number) => whatsappMutation.mutate(number)}
          />
          <div className="mt-3">
            <TextArea
              label="Altri numeri autorizzati (max 2, uno per riga, con prefisso es. 3933…)"
              rows={2}
              value={extraNumbers}
              onChange={(e) => setExtraNumbers(e.target.value)}
            />
            <p className="text-xs mt-1" style={{ color: '#8A877C' }}>
              Dopo averli scritti, salva di nuovo dal campo del numero principale sopra.
            </p>
          </div>
        </Card>
      )}
      <Card title="Informazioni Base">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Nome Ristorante"
            value={form.watch('name') || ''}
            onChange={(e) => form.setValue('name', e.target.value)}
            error={form.formState.errors.name as any}
          />
          <Input
            label="Titolo Pagina Menu (Tab Browser)"
            value={form.watch('menuPageTitle') || ''}
            onChange={(e) => form.setValue('menuPageTitle', e.target.value)}
            error={form.formState.errors.menuPageTitle as any}
          />
          <p className="text-xs -mt-2" style={{ color: '#5C5A52' }}>
            Il titolo che appare nella tab del browser per la pagina menu
          </p>
          <TextArea
            label="Descrizione pagina menu (SEO / condivisione)"
            rows={2}
            placeholder="Es: List of delicious dishes"
            value={form.watch('pageDescription') || ''}
            onChange={(e) => form.setValue('pageDescription', e.target.value)}
            error={form.formState.errors.pageDescription as any}
          />
          <p className="text-xs -mt-2" style={{ color: '#5C5A52' }}>
            Testo usato come meta description e quando si condivide il link (WhatsApp, Facebook, ecc.)
          </p>
          <Input
            label="Immagine condivisione (WhatsApp / Facebook)"
            type="url"
            placeholder="https://... (URL immagine per anteprima link)"
            value={form.watch('menuShareImageUrl') || ''}
            onChange={(e) => form.setValue('menuShareImageUrl', e.target.value)}
            error={form.formState.errors.menuShareImageUrl as any}
          />
          <p className="text-xs -mt-2" style={{ color: '#5C5A52' }}>
            Immagine mostrata quando si condivide il link alla pagina menu (og:image). Consigliato 1200×630 px.
          </p>
          <TextArea
            label="Descrizione"
            rows={4}
            value={form.watch('description') || ''}
            onChange={(e) => form.setValue('description', e.target.value)}
            error={form.formState.errors.description as any}
          />
        </form>
      </Card>

      <Card title="Indirizzo">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Via"
            value={form.watch('address.street') || ''}
            onChange={(e) => {
              const currentAddress = form.watch('address') || { street: '', city: '', state: '', postalCode: '' };
              form.setValue('address', { ...currentAddress, street: e.target.value }, { shouldDirty: true });
            }}
            error={(form.formState.errors.address as any)?.street}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Città"
              value={form.watch('address.city') || ''}
              onChange={(e) => {
                const currentAddress = form.watch('address') || { street: '', city: '', state: '', postalCode: '' };
                form.setValue('address', { ...currentAddress, city: e.target.value }, { shouldDirty: true });
              }}
              error={(form.formState.errors.address as any)?.city}
            />
            <Input
              label="Provincia"
              value={form.watch('address.state') || ''}
              onChange={(e) => {
                const currentAddress = form.watch('address') || { street: '', city: '', state: '', postalCode: '' };
                form.setValue('address', { ...currentAddress, state: e.target.value }, { shouldDirty: true });
              }}
              error={(form.formState.errors.address as any)?.state}
            />
            <Input
              label="CAP"
              value={form.watch('address.postalCode') || ''}
              onChange={(e) => {
                const currentAddress = form.watch('address') || { street: '', city: '', state: '', postalCode: '' };
                form.setValue('address', { ...currentAddress, postalCode: e.target.value }, { shouldDirty: true });
              }}
              error={(form.formState.errors.address as any)?.postalCode}
            />
          </div>
        </form>
      </Card>

      <Card title="Contatti">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Telefono"
              type="tel"
              placeholder="+39 089 123456"
              value={form.watch('phone') || ''}
              onChange={(e) => form.setValue('phone', e.target.value)}
              error={form.formState.errors.phone as any}
            />
            <Input
              label="Email"
              type="email"
              placeholder="info@menucolcodice.it"
              value={form.watch('email') || ''}
              onChange={(e) => form.setValue('email', e.target.value)}
              error={form.formState.errors.email as any}
            />
          </div>
          <Input
            label="Sito Web"
            type="url"
            placeholder="https://menucolcodice.it"
            value={form.watch('website') || ''}
            onChange={(e) => form.setValue('website', e.target.value)}
            error={form.formState.errors.website as any}
          />
        </form>
      </Card>

      <Card title="Orari e Informazioni">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <TextArea
            label="Orari di Apertura"
            rows={3}
            placeholder="Lun-Dom: 12:00-15:00, 19:00-23:00"
            value={form.watch('openingHours') || ''}
            onChange={(e) => form.setValue('openingHours', e.target.value)}
            error={form.formState.errors.openingHours as any}
          />
          <TextArea
            label="Testo Footer"
            rows={2}
            placeholder="© 2026 menucolcodice.it - Tutti i diritti riservati"
            value={form.watch('footerText') || ''}
            onChange={(e) => form.setValue('footerText', e.target.value)}
            error={form.formState.errors.footerText as any}
          />
        </form>
      </Card>

      <Card title="Social Media">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Facebook"
            type="url"
            placeholder="https://facebook.com/menucolcodice"
            value={form.watch('social.facebook') || ''}
            onChange={(e) => {
              const currentSocial = form.watch('social') || { facebook: '', instagram: '', whatsapp: '', glovo: '', deliveroo: '', justeat: '' };
              form.setValue('social', { ...currentSocial, facebook: e.target.value }, { shouldDirty: true });
            }}
            error={(form.formState.errors.social as any)?.facebook}
          />
          <Input
            label="Instagram"
            type="url"
            placeholder="https://instagram.com/menucolcodice"
            value={form.watch('social.instagram') || ''}
            onChange={(e) => {
              const currentSocial = form.watch('social') || { facebook: '', instagram: '', whatsapp: '', glovo: '', deliveroo: '', justeat: '' };
              form.setValue('social', { ...currentSocial, instagram: e.target.value }, { shouldDirty: true });
            }}
            error={(form.formState.errors.social as any)?.instagram}
          />
          <Input
            label="WhatsApp"
            placeholder="+39 089 123456"
            value={form.watch('social.whatsapp') || ''}
            onChange={(e) => {
              const currentSocial = form.watch('social') || { facebook: '', instagram: '', whatsapp: '', glovo: '', deliveroo: '', justeat: '' };
              form.setValue('social', { ...currentSocial, whatsapp: e.target.value }, { shouldDirty: true });
            }}
            error={(form.formState.errors.social as any)?.whatsapp}
          />
          <Input
            label="Glovo"
            type="url"
            placeholder="https://glovoapp.com/it/it/..."
            value={form.watch('social.glovo') || ''}
            onChange={(e) => {
              const currentSocial = form.watch('social') || { facebook: '', instagram: '', whatsapp: '', glovo: '', deliveroo: '', justeat: '' };
              form.setValue('social', { ...currentSocial, glovo: e.target.value }, { shouldDirty: true });
            }}
            error={(form.formState.errors.social as any)?.glovo}
          />
          <Input
            label="Deliveroo"
            type="url"
            placeholder="https://deliveroo.it/it/..."
            value={form.watch('social.deliveroo') || ''}
            onChange={(e) => {
              const currentSocial = form.watch('social') || { facebook: '', instagram: '', whatsapp: '', glovo: '', deliveroo: '', justeat: '' };
              form.setValue('social', { ...currentSocial, deliveroo: e.target.value }, { shouldDirty: true });
            }}
            error={(form.formState.errors.social as any)?.deliveroo}
          />
          <Input
            label="Just Eat"
            type="url"
            placeholder="https://www.justeat.it/..."
            value={form.watch('social.justeat') || ''}
            onChange={(e) => {
              const currentSocial = form.watch('social') || { facebook: '', instagram: '', whatsapp: '', glovo: '', deliveroo: '', justeat: '' };
              form.setValue('social', { ...currentSocial, justeat: e.target.value }, { shouldDirty: true });
            }}
            error={(form.formState.errors.social as any)?.justeat}
          />
        </form>
      </Card>

      <Card title="Privacy e cookie">
        <p className="text-sm" style={{ color: '#5C5A52' }}>
          Ogni menu ha informativa privacy e cookie generate da Menu col codice, con il nome del locale
          e i recapiti che salvi qui sopra.
          {tenant?.slug ? (
            <>
              {' '}
              Le trovi su{' '}
              <a href={`https://${tenant.slug}.menucolcodice.it/privacy`} target="_blank" rel="noreferrer">
                {tenant.slug}.menucolcodice.it/privacy
              </a>
              {' e '}
              <a href={`https://${tenant.slug}.menucolcodice.it/cookie`} target="_blank" rel="noreferrer">
                /cookie
              </a>
              .
            </>
          ) : null}{' '}
          Non usiamo Iubenda.
        </p>
      </Card>

      {/* Pulsante WhatsApp Fluttuante e Colori Tema spostati in tab Grafica */}


      <div className="flex justify-end">
        <Button
          onClick={form.handleSubmit(onSubmit)}
          loading={saveMutation.isPending}
          variant="primary"
        >
          <Save className="w-4 h-4 mr-2" />
          Salva Informazioni
        </Button>
      </div>
    </div>
  );
};
