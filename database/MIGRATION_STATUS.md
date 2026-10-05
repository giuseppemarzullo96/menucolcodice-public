# Stato Migrazione Database

## ✅ Completato

1. **Struttura cartelle creata**:
   - `restaurant/` - info.ts, contacts.ts, social.ts
   - `menu/` - sections.ts
   - `theme/` - colors.ts, layout.ts
   - `legal/` - iubenda.ts
   - `admin/` - config.json, redirects.json (già esistenti)

2. **File index.ts creato** - combina tutti i moduli

## ⚠️ In Progress

- Le API ancora leggono/scrivono da `dishes.ts`
- `menu/products.ts` non ancora creato (usa ancora dishes.ts come fonte)

## 📋 Prossimi Passi

1. **Creare menu/products.ts** con tutti i prodotti
2. **Aggiornare API di lettura** per usare `database/index.ts`:
   - `get-restaurant.ts`
   - `get-products.ts`
   - `get-categories.ts`
   - `get-menu.ts`
   - `pages/index.tsx`
   - `pages/dishes/index.tsx`
   - `pages/dishes/[id]/index.tsx`
   - `pages/_document.tsx`

3. **Aggiornare API di scrittura** per scrivere nei file separati:
   - `save-products.ts` → scrive in `menu/products.ts`
   - `save-categories.ts` → scrive in `menu/sections.ts`
   - `GeneralTab` → scrive in `restaurant/`, `theme/`, `legal/`

4. **Test completo** di tutte le funzionalità

5. **Rimuovere dishes.ts** (o mantenerlo come backup)

## Note

- `dishes.ts` è ancora il file principale per retrocompatibilità
- `index.ts` può essere usato per letture, ma le scritture vanno ancora in dishes.ts
- La migrazione può essere fatta gradualmente
