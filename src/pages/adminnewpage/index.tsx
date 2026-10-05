import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Head from 'next/head';
import { Header, Tabs } from '@/components/admin';
import { Home, ShoppingCart, FolderOpen, Lock, Palette, Camera, Settings, BarChart3, Users, ChartLine, QrCode, CreditCard, Ticket } from 'lucide-react';
import { GeneralTab, MenuTab, CategoriesTab, ScanMenuTab, SecurityTab, GraficaTab, PlatformTab, OverviewTab, SignupsTab, AnalyticsTab, QrTab, SubscriptionTab, PromoCodesTab } from '@/components/admin/tabs';
import styles from '@/styles/admin.module.css';
import { planName } from '@/utils/plans';

// Schema di validazione per le informazioni ristorante
const restaurantSchema = yup.object().shape({
  name: yup.string().required('Il nome è obbligatorio'),
  description: yup.string().required('La descrizione è obbligatoria'),
  menuPageTitle: yup.string(),
  address: yup.object().shape({
    street: yup.string().required('La via è obbligatoria'),
    city: yup.string().required('La città è obbligatoria'),
    state: yup.string().required('La provincia è obbligatoria'),
    postalCode: yup.string().required('Il CAP è obbligatorio'),
  }),
});

// Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Componente principale Admin
const AdminPageContent = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('general');
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [hasAccessCode, setHasAccessCode] = useState<boolean | undefined>(undefined);
  const [workspace, setWorkspace] = useState<'platform' | 'demo'>('demo');
  const [tenantMeta, setTenantMeta] = useState<any>(null);

  // Form per informazioni ristorante
  const restaurantForm = useForm({
    defaultValues: {
      name: '',
      description: '',
      menuPageTitle: '',
      pageDescription: '',
      menuShareImageUrl: '',
      address: {
        street: '',
        city: '',
        state: '',
        postalCode: '',
      },
      phone: '',
      email: '',
      website: '',
      openingHours: '',
      footerText: '',
      social: {
        facebook: '',
        instagram: '',
        whatsapp: '',
        glovo: '',
        deliveroo: '',
        justeat: '',
      },
      iubendaScriptUrl: '',
      iubendaPrivacyPolicyUrl: '',
      iubendaCookiePolicyUrl: '',
      logoType: 'text',
      logoUrl: '',
      faviconUrl: '',
      homeBackgroundUrl: '',
      whatsappButtonColor: '#25D366',
      whatsappIconColor: '#ffffff',
      socialButtonColor: '#6366f1',
      socialIconColor: '#ffffff',
      themeColors: {},
    },
  });

  // Verifica autenticazione
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const meResponse = await fetch('/api/me');
        const me = meResponse.ok ? await meResponse.json() : null;
        setTenantMeta(me);
        if (me?.isPlatform) {
          setWorkspace('platform');
          setActiveTab('overview');
        }

        const codeCheckResponse = await fetch('/api/admin/get-access-code');
        const codeData = codeCheckResponse.ok ? await codeCheckResponse.json() : { hasCode: false };
        
        if (!codeData.hasCode) {
          setAuthenticated(true);
          setHasAccessCode(false);
          setCheckingAuth(false);
          return;
        }

        const response = await fetch('/api/admin/verify-session');
        if (response.ok) {
          const data = await response.json();
          if (data.authenticated) {
            setAuthenticated(true);
            setHasAccessCode(true);
          } else {
            router.push('/admin/login');
            return;
          }
        } else {
          router.push('/admin/login');
          return;
        }
      } catch (error) {
        console.error('Errore nella verifica dell\'autenticazione:', error);
        setAuthenticated(true);
        setHasAccessCode(false);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!router.isReady) return;
    const tab = String(router.query.tab || '');
    const tenantTabs = ['general', 'menu', 'categories', 'scan', 'security', 'subscription', 'grafica'];
    const platformTabsList = ['overview', 'analytics', 'signups', 'promo', 'keys', 'platform'];
    if (tenantTabs.includes(tab) || platformTabsList.includes(tab)) {
      setActiveTab(tab);
      if (platformTabsList.includes(tab)) setWorkspace('platform');
    }
  }, [router.isReady, router.query.tab]);

  // Carica dati ristorante
  const { data: restaurantData, isLoading: loadingRestaurant } = useQuery({
    queryKey: ['restaurant'],
    queryFn: async () => {
      const response = await fetch('/api/get-restaurant');
      if (!response.ok) throw new Error('Errore nel caricamento');
      const data = await response.json();
      console.log('Restaurant data loaded:', data);
      return data;
    },
    enabled: (hasAccessCode === false) || (authenticated && !checkingAuth),
    retry: 1,
  });

  // Aggiorna form quando i dati sono caricati
  useEffect(() => {
    if (restaurantData) {
      console.log('Updating form with restaurant data:', restaurantData);
      restaurantForm.reset(restaurantData);
    }
  }, [restaurantData]);

  // Carica prodotti
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await fetch('/api/get-products');
      if (!response.ok) throw new Error('Errore nel caricamento');
      const data = await response.json();
      console.log('Products loaded:', data);
      return data;
    },
    enabled: (hasAccessCode === false) || (authenticated && !checkingAuth),
    retry: 1,
  });

  // Carica categorie
  const { data: categoriesData, isLoading: loadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await fetch('/api/get-categories');
      if (!response.ok) throw new Error('Errore nel caricamento');
      const data = await response.json();
      const formatted = data.categories.map((cat: any, index: number) => ({
        id: String(index + 1),
        name: cat.name || cat.key,
        icon: cat.icon,
        description: cat.description !== undefined ? cat.description : '',
        order: cat.order !== undefined ? cat.order : undefined,
      }));
      console.log('Categories loaded:', formatted);
      return formatted;
    },
    enabled: (hasAccessCode === false) || (authenticated && !checkingAuth),
    retry: 1,
  });

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
      if (response.ok) {
        // Invalida tutte le query e reindirizza
        queryClient.clear();
        setAuthenticated(false);
        setHasAccessCode(undefined);
        router.push('/admin/login');
      } else {
        alert('Errore nel logout');
      }
    } catch (error) {
      console.error('Errore nel logout:', error);
      alert('Errore nel logout');
    }
  };

  if (checkingAuth && hasAccessCode !== false) {
    return (
      <div className={styles.shell} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className={styles.muted}>Verifica accesso…</p>
      </div>
    );
  }

  if (!authenticated && hasAccessCode === true) {
    return null;
  }

  const tenant = restaurantData?.tenant || tenantMeta;
  const isPlatform = Boolean(tenant?.isPlatform);
  const restaurantTabs = [
    {
      key: 'general',
      label: (
        <span className="flex items-center gap-2">
          <Home className="w-4 h-4" />
          Generale
        </span>
      ),
      children: <GeneralTab form={restaurantForm} restaurantData={restaurantData} products={products} />,
    },
    {
      key: 'stats',
      label: (
        <span className="flex items-center gap-2">
          <ChartLine className="w-4 h-4" />
          Statistiche
        </span>
      ),
      children: <AnalyticsTab mode="tenant" analyticsLocked={!tenant?.analytics} />,
    },
    {
      key: 'qr',
      label: (
        <span className="flex items-center gap-2">
          <QrCode className="w-4 h-4" />
          QR
        </span>
      ),
      children: <QrTab restaurantData={restaurantData} />,
    },
    {
      key: 'menu',
      label: (
        <span className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4" />
          Menu ({products.length})
        </span>
      ),
      children: <MenuTab products={products} categories={categoriesData || []} loading={loadingProducts} restaurantData={restaurantData} />,
    },
    {
      key: 'categories',
      label: (
        <span className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4" />
          Categorie ({categoriesData?.length || 0})
        </span>
      ),
      children: <CategoriesTab categories={categoriesData || []} products={products} loading={loadingCategories} restaurantData={restaurantData} />,
    },
    ...(tenant?.ocr ? [{
      key: 'scan',
      label: (
        <span className="flex items-center gap-2">
          <Camera className="w-4 h-4" />
          Scansiona menu
        </span>
      ),
      children: <ScanMenuTab categories={categoriesData || []} />,
    }] : []),
    {
      key: 'security',
      label: (
        <span className="flex items-center gap-2">
          <Lock className="w-4 h-4" />
          Sicurezza
        </span>
      ),
      children: <SecurityTab hasAccessCode={hasAccessCode} />,
    },
    ...(tenant?.isPlatform
      ? []
      : [
          {
            key: 'subscription',
            label: (
              <span className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Abbonamento
              </span>
            ),
            children: <SubscriptionTab />,
          },
        ]),
    {
      key: 'grafica',
      label: (
        <span className="flex items-center gap-2">
          <Palette className="w-4 h-4" />
          Grafica
        </span>
      ),
      children: <GraficaTab form={restaurantForm} restaurantData={restaurantData} products={products} />,
    },
  ];
  const platformTabs = [
    {
      key: 'overview',
      label: (
        <span className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Panoramica
        </span>
      ),
      children: <OverviewTab />,
    },
    {
      key: 'analytics',
      label: (
        <span className="flex items-center gap-2">
          <ChartLine className="w-4 h-4" />
          Analisi
        </span>
      ),
      children: <AnalyticsTab mode="platform" />,
    },
    {
      key: 'signups',
      label: (
        <span className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          Iscrizioni
        </span>
      ),
      children: <SignupsTab />,
    },
    {
      key: 'promo',
      label: (
        <span className="flex items-center gap-2">
          <Ticket className="w-4 h-4" />
          Promo
        </span>
      ),
      children: <PromoCodesTab />,
    },
    {
      key: 'keys',
      label: (
        <span className="flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Chiavi
        </span>
      ),
      children: <PlatformTab />,
    },
  ];
  const tabItems = isPlatform && workspace === 'platform' ? platformTabs : restaurantTabs;
  const menuUrl = tenant?.slug ? `https://${tenant.slug}.menucolcodice.it` : '';
  const hasBasics = Boolean(restaurantData?.name?.trim());
  const hasCategory = (categoriesData?.length || 0) > 0;
  const hasDish = products.length > 0;
  const onboardingComplete = hasBasics && hasCategory && hasDish;

  return (
    <>
      <Head>
        <title>{isPlatform ? 'Piattaforma' : restaurantData?.name || 'Pannello'} — Menu col codice</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className={styles.shell}>
        <Header
          onLogout={handleLogout}
          variant={isPlatform ? 'platform' : 'locale'}
          kicker={isPlatform ? 'Piattaforma' : 'Pannello del locale'}
          title={isPlatform ? 'Menu col codice' : restaurantData?.name || 'Il tuo menu'}
          meta={
            isPlatform
              ? workspace === 'platform'
                ? 'Iscrizioni, locali, analisi e chiavi. Il menu demo sta nell’altra vista.'
                : 'Stai modificando Osteria Lume, la vetrina pubblica.'
              : `${planName(tenant?.plan || 'free')}${tenant?.slug ? ` · ${tenant.slug}.menucolcodice.it` : ''}`
          }
          menuUrl={menuUrl}
          workspace={workspace}
          onWorkspace={
            isPlatform
              ? (next) => {
                  setWorkspace(next);
                  setActiveTab(next === 'platform' ? 'overview' : 'general');
                }
              : undefined
          }
        />
        <main className={styles.main}>
          {!isPlatform && hasAccessCode === false ? (
            <div className={styles.banner}>
              <strong>Primo accesso.</strong> Entra, poi vai in Sicurezza e imposta un codice. Senza codice, chi conosce l’indirizzo del pannello può entrare.
            </div>
          ) : null}
          {!isPlatform && !onboardingComplete && !loadingProducts && !loadingCategories ? (
            <div className={styles.onboarding}>
              <p className={styles.onboardingTitle}>Per mettere online il menu:</p>
              <ol className={styles.onboardingList}>
                <li className={hasBasics ? styles.onboardingDone : styles.onboardingTodo}>
                  <button type="button" onClick={() => setActiveTab('general')}>
                    {hasBasics ? '✓' : '①'} Nome e recapiti
                  </button>
                </li>
                <li className={hasCategory ? styles.onboardingDone : styles.onboardingTodo}>
                  <button type="button" onClick={() => setActiveTab('categories')}>
                    {hasCategory ? '✓' : '②'} Prima categoria
                  </button>
                </li>
                <li className={hasDish ? styles.onboardingDone : styles.onboardingTodo}>
                  <button type="button" onClick={() => setActiveTab('menu')}>
                    {hasDish ? '✓' : '③'} Primo piatto
                  </button>
                </li>
              </ol>
            </div>
          ) : null}
          <Tabs items={tabItems} activeKey={activeTab} onChange={setActiveTab} />
        </main>
        <footer className={styles.footer}>
          {isPlatform ? 'Piattaforma Menu col codice' : 'Pannello del locale'} · {new Date().getFullYear()}
        </footer>
      </div>
    </>
  );
};


// Wrapper con QueryClientProvider
const AdminPage = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminPageContent />
    </QueryClientProvider>
  );
};

export default AdminPage;
