# Proposta di Riorganizzazione Database

## Problema Attuale
Tutti i dati sono in un unico file `dishes.ts` che contiene:
- Informazioni ristorante
- Menu e prodotti
- Configurazioni tema/design
- Configurazioni legali (Iubenda)
- Configurazioni admin

Questo rende difficile la manutenzione e la sicurezza.

## Struttura Proposta

```
database/
├── restaurant/
│   ├── info.ts              # Info base ristorante (nome, descrizione, indirizzo)
│   ├── contacts.ts          # Contatti (telefono, email, website)
│   └── social.ts            # Social media links
│
├── menu/
│   ├── sections.ts          # Sezioni del menu (categorie)
│   └── products.ts          # Prodotti (items)
│
├── theme/
│   ├── colors.ts            # Colori tema
│   └── layout.ts            # Configurazioni layout (logo, immagini)
│
├── legal/
│   └── iubenda.ts           # Configurazioni Iubenda (privacy, cookie)
│
├── admin/
│   ├── config.json          # Access codes (già esistente)
│   └── redirects.json       # Redirects (già esistente)
│
└── index.ts                 # File principale che esporta tutto
```

## Dettagli File

### 1. `restaurant/info.ts`
```typescript
export const restaurantInfo = {
  name: "Menucolcodice.it",
  description: "Il Menù digitale",
  address: {
    street: "Via Roma 100",
    city: "Salerno",
    state: "Salerno",
    postalCode: "84121",
    country: "Italia",
  },
  menuPageTitle: "Menucolcodice.it",
  openingHours: "Lun-Sab: 12:00/00:00 - Dom: Chiuso",
  footerText: " Menucolcodice.it © 2026 ",
};
```

### 2. `restaurant/contacts.ts`
```typescript
export const restaurantContacts = {
  phone: "+39 000 000000",
  email: "info@menucolcodice.com",
  website: "https://menucolcodice.it",
};
```

### 3. `restaurant/social.ts`
```typescript
export const restaurantSocial = {
  facebook: "https://www.facebook.com/Menucolcodice",
  instagram: "https://www.instagram.com/Menucolcodice",
  whatsapp: "+39 000 000000",
  glovo: "https://glovoapp.com/",
  deliveroo: "https://deliveroo.it/",
  justeat: "https://justeat.it/",
};
```

### 4. `menu/sections.ts`
```typescript
export const menuSections = [
  {
    name: "Primi Piatti",
    description: "le nostre specialità fatte in casa",
    order: 1,
  },
  // ...
];
```

### 5. `menu/products.ts`
```typescript
export const menuProducts = [
  {
    id: "0",
    name: "Spaghetti alle vongole",
    category: "Primi Piatti",
    // ...
  },
  // ...
];
```

### 6. `theme/colors.ts`
```typescript
export const themeColors = {
  layout: { /* ... */ },
  navbar: { /* ... */ },
  card: { /* ... */ },
  // ...
};
```

### 7. `theme/layout.ts`
```typescript
export const themeLayout = {
  logoType: "image",
  logoUrl: "/api/serve-image?filename=...",
  logoWidth: 150,
  logoHeight: 50,
  faviconUrl: "/api/serve-image?filename=...",
  homeBackgroundUrl: "/api/serve-image?filename=...",
  whatsappButtonColor: "#25D366",
  whatsappIconColor: "#ffffff",
};
```

### 8. `legal/iubenda.ts`
```typescript
export const iubendaConfig = {
  scriptUrl: "https://embeds.iubenda.com/widgets/...",
  privacyPolicyUrl: "https://www.iubenda.com/privacy-policy/...",
  cookiePolicyUrl: "https://www.iubenda.com/privacy-policy/.../cookie-policy",
};
```

### 9. `database/index.ts` (File principale)
```typescript
import { restaurantInfo } from './restaurant/info';
import { restaurantContacts } from './restaurant/contacts';
import { restaurantSocial } from './restaurant/social';
import { menuSections } from './menu/sections';
import { menuProducts } from './menu/products';
import { themeColors } from './theme/colors';
import { themeLayout } from './theme/layout';
import { iubendaConfig } from './legal/iubenda';

export const dishes: TRestaurant = {
  ...restaurantInfo,
  ...restaurantContacts,
  social: restaurantSocial,
  themeColors,
  ...themeLayout,
  ...iubendaConfig,
  sections: menuSections.map(section => ({
    ...section,
    items: menuProducts.filter(p => p.category === section.name),
  })),
};
```

## Vantaggi

1. **Separazione delle responsabilità**: Ogni file ha uno scopo specifico
2. **Sicurezza**: Configurazioni sensibili (admin, legal) separate
3. **Manutenibilità**: Più facile trovare e modificare dati specifici
4. **Scalabilità**: Facile aggiungere nuove sezioni senza toccare tutto
5. **Backup selettivo**: Possibile fare backup solo di sezioni specifiche
6. **Versioning**: Cambiamenti isolati per categoria

## Migrazione

1. Creare la nuova struttura di cartelle
2. Dividere `dishes.ts` nei nuovi file
3. Aggiornare le API per leggere/scrivere nei file corretti
4. Testare che tutto funzioni
5. Rimuovere il vecchio `dishes.ts`

## Note di Implementazione

- Le API dovranno essere aggiornate per scrivere nei file corretti
- `save-products.ts` → scrive in `menu/products.ts`
- `save-categories.ts` → scrive in `menu/sections.ts`
- `GeneralTab` → scrive in `restaurant/`, `theme/`, `legal/`
- Mantenere retrocompatibilità durante la migrazione
