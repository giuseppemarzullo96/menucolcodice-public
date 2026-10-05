export type CatalogPlanId = 'free' | 'medium' | 'pro';

const FREE_FEATURES = [
  'Fino a 30 piatti',
  'Fino a 5 categorie',
  'Allergeni a norma',
  'QR in PDF',
  'Grafica personalizzata',
  'Privacy e cookie incluse',
  'Il tuo indirizzo',
];

const MEDIA_FEATURES = [
  'Piatti illimitati',
  'Categorie illimitate',
  'Allergeni a norma',
  'QR in PDF',
  'Grafica personalizzata',
  'Privacy e cookie incluse',
  'Il tuo indirizzo',
  'Statistiche: scansioni QR, tempo sul menu, piatti più aperti',
];

const PRO_FEATURES = [
  'Piatti illimitati',
  'Categorie illimitate',
  'Allergeni a norma',
  'QR in PDF',
  'Grafica personalizzata',
  'Privacy e cookie incluse',
  'Il tuo indirizzo',
  'Statistiche: scansioni QR, tempo sul menu, piatti più aperti',
  'Aggiorni scrivendo su WhatsApp, anche durante il servizio',
  'Fotografi il menu di carta (fino a 100 scansioni/mese)',
  'Modelli 3D dei piatti',
];

export const PLAN_CATALOG = [
  {
    id: 'free' as const,
    name: 'Free',
    listEuro: 0,
    chargeEuro: 0,
    dishes: 'Fino a 30 piatti',
    categories: 'Fino a 5 categorie',
    whatsapp: false,
    ocr: false,
    analytics: false,
    model3d: false,
    featured: false,
    blurb: 'Per vedere se fa per te.',
    features: FREE_FEATURES,
  },
  {
    id: 'medium' as const,
    name: 'Media',
    listEuro: 13.99,
    chargeEuro: 17.07,
    dishes: 'Piatti illimitati',
    categories: 'Categorie illimitate',
    whatsapp: false,
    ocr: false,
    analytics: true,
    model3d: false,
    featured: true,
    blurb: 'Per chi ha un menu lungo.',
    features: MEDIA_FEATURES,
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    listEuro: 23.99,
    chargeEuro: 29.27,
    dishes: 'Piatti illimitati',
    categories: 'Categorie illimitate',
    whatsapp: true,
    ocr: true,
    analytics: true,
    model3d: true,
    featured: false,
    blurb: 'Per chi cambia il menu spesso.',
    features: PRO_FEATURES,
  },
];

export function formatEuro(value: number) {
  return value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function planName(id: string) {
  return PLAN_CATALOG.find((item) => item.id === id)?.name || id;
}
