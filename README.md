# Menu col codice

SaaS italiano per menu digitali di ristoranti e bar: ogni locale ha un menu pubblico su un proprio sottodominio (`slug.menucolcodice.it`), aggiornabile dal pannello admin **o direttamente da WhatsApp**, anche durante il servizio.

Stack: Next.js 13 (Pages Router) · TypeScript · Ant Design · Tailwind CSS · multi-tenant.

---

## Indice

- [Cos'è](#cosè)
- [Menu pubblico](#menu-pubblico)
- [Bot WhatsApp](#bot-whatsapp)
- [OCR menu cartaceo e import automatico](#ocr-menu-cartaceo-e-import-automatico)
- [Pannello admin](#pannello-admin)
- [Piani e prezzi](#piani-e-prezzi)
- [Iscrizione e billing](#iscrizione-e-billing)
- [QR code](#qr-code)
- [Analytics](#analytics)
- [SEO e multi-tenant](#seo-e-multi-tenant)
- [Stack tecnico](#stack-tecnico)
- [Struttura del progetto](#struttura-del-progetto)
- [Deploy](#deploy)

---

## Cos'è

Ogni ristorante/bar è un **tenant** con il proprio sottodominio, il proprio piano, il proprio menu e i propri dati di brand. La piattaforma è gestita da un pannello "platform" separato (chiavi Stripe/PayPal/Google/AI, iscrizioni, promo code), invisibile ai singoli locali.

Nessuna internazionalizzazione: l'app è pensata e scritta per il mercato italiano.

## Menu pubblico

- **Due viste commutabili dal cliente**: elenco sobrio o carosello orizzontale, con filtro per categoria.
- **Dettaglio piatto**: nome, ingredienti, allergeni (14 allergeni ufficiali UE), badge "consigliato".
- **Modelli 3D dei piatti** (piano Pro): file `.glb`/`.gltf` mostrati con controlli di rotazione interattivi (Three.js), sia nelle card che nel dettaglio.
- **Grafica personalizzabile per locale**: logo, sfondo, palette colori, temi pronti.

## Bot WhatsApp

Disponibile sul piano Pro, fino a 3 numeri per locale, sessioni valide 24 ore.

- **Piatti**: `aggiungi` (guidato o in una riga: *"aggiungi Carbonara, primi, 12, uovo"*), `prezzo <piatto> <valore>`, `finito <piatto>` / `torna <piatto>`, `lista`, `cerca`, `modifica`, `elimina`, `copia`, `aumenta prezzi 5%`, `annulla ultima`.
- **Categorie**: `categorie`, `aggiungi categoria`, `nascondi`/`mostra` (stagionali).
- **Grafica e dati del locale**: `configura` avvia un wizard guidato; `colore verde`, `elenco`/`carosello`, import automatico da un link Google Maps o dal sito.
- **Vocali**: trascritti con Whisper, con pulizia degli intercalari e conferma quando il messaggio è lungo o ambiguo.
- **Extra**: `statistiche` (ultimi 7 giorni), `link`, `qr`. Ogni lunedì mattina un cron manda in automatico il report statistico ai numeri Pro autorizzati.
- Prima di ogni risposta il bot invia uno sticker WebP animato brandizzato.

## OCR menu cartaceo e import automatico

- **Foto del menu cartaceo** (piano Pro, fino a 100 scansioni/mese): un modello vision (OpenAI, con rifinitura opzionale via DeepSeek) legge nome, categoria, prezzo, ingredienti e allergeni di ogni piatto dalla foto, con anteprima di conferma prima dell'import.
- **Import da Google Maps**: dato il link della scheda del locale, **Google Places API** recupera nome, indirizzo, telefono, orari e foto in modo strutturato — molto più affidabile dello scraping della pagina. Chiave configurabile dal pannello platform, mai hardcoded.
- **Import da altre fonti**: sito ufficiale, TripAdvisor, TheFork, social, Glovo/Deliveroo/Just Eat — link riconosciuti e classificati automaticamente, dati raffinati con AI.

## Pannello admin

Ogni locale accede al proprio pannello (`/admin`), protetto da un codice di accesso dedicato:

- **Dati generali**: anagrafica, indirizzo, contatti, orari, social, link delivery, privacy/cookie.
- **Menu e categorie**: gestione piatti e categorie del menu.
- **Grafica**: logo, sfondo, temi pronti, editor colori per ogni area del menu (navbar, sidebar, card...).
- **Scansiona menu**: avvia l'OCR da foto (solo piano con OCR attivo).
- **QR**: generazione del QR code del menu.
- **Statistiche**: dashboard piatti più aperti, dispositivi, link in uscita (piani con analytics).
- **Abbonamento**: piano corrente, fatture, upgrade, disdetta a fine periodo.

Il pannello **platform**, separato e riservato al gestore della piattaforma, raggruppa: iscrizioni in attesa/attive, codici promo, analisi aggregate su tutti i locali, e la configurazione (mai visibile ai clienti) di Stripe, PayPal, Google (Analytics/Search Console/Places), chiavi AI (OpenAI/DeepSeek) e connessione WhatsApp.

## Piani e prezzi

| | Free | Media | Pro |
|---|---|---|---|
| Piatti / categorie | fino a 30 / 5 | illimitati | illimitati |
| Allergeni, QR in PDF, grafica personalizzata | ✅ | ✅ | ✅ |
| Statistiche | — | ✅ | ✅ |
| Gestione menu da WhatsApp | — | — | ✅ |
| OCR menu cartaceo | — | — | ✅ (100 scansioni/mese) |
| Modelli 3D dei piatti | — | — | ✅ |

## Iscrizione e billing

- Registrazione self-service (`/iscriviti`): nome locale, sottodominio, contatti, piano, codice promo opzionale.
- Piano Free attivato subito; Media/Pro richiedono pagamento — **Stripe o PayPal**, a scelta.
- Upgrade di piano, portale di gestione abbonamento e disdetta (a fine periodo di fatturazione) gestiti dal pannello admin del locale.

## QR code

Generazione del QR del menu (`qrcode.react`) con doppio download: **PNG** e **PDF** pronto per la stampa (impaginato su A4, con paginazione automatica se serve più di una pagina).

## Analytics

Per ogni locale: sessioni, visite, aperture piatto, scansioni QR, tempo di permanenza, profondità di scroll, tipo di dispositivo, distribuzione oraria, piatti più visti, viste per categoria, click verso delivery/social. Aggregabili anche a livello di piattaforma nel pannello platform.

## SEO e multi-tenant

- Meta tag, JSON-LD (Organization/SoftwareApplication), sitemap generate dinamicamente (inclusa una entry per ogni locale attivo).
- Ogni tenant è isolato per dati, piano e limiti (`PLAN_LIMITS`), risolto per sottodominio a livello di richiesta.

## Stack tecnico

- **Next.js 13** (Pages Router) · **React 18** · **TypeScript**
- **Ant Design** (menu pubblico) + **Tailwind CSS** (pannello admin)
- **Three.js** / `@react-three/fiber` / `@react-three/drei` — modelli 3D dei piatti
- **@tanstack/react-query** — data fetching lato admin
- **react-hook-form** + **yup** — form e validazione
- **Stripe** + **PayPal** — pagamenti e abbonamenti
- **sharp** — elaborazione immagini server-side
- **qrcode.react**, **jspdf** + **html2canvas** — QR code e PDF
- **formidable** — upload (immagini, modelli 3D, foto menu)
- **nodemailer** — email transazionali

## Struttura del progetto

```
src/
  pages/            route Next.js (menu pubblico, admin, API, marketing)
  components/       componenti React (menu pubblico, admin, marketing)
  server/           logica server: bot WhatsApp, OCR, import, billing, tenant, integrazioni
  seo/              meta tag, JSON-LD, sitemap
  utils/            utility condivise (piani, colori, orari, validazione link)
tenants/            dati per tenant (menu, tema, info locale) — <slug>/
platform/           configurazione piattaforma (chiavi, tenant, promo code) — non in git
docs/               guide di deploy e comandi WhatsApp
```

## Deploy

Deploy automatico su push a `main` via webhook GitHub (vedi [docs/DEPLOY.md](docs/DEPLOY.md)): pull, build, restart PM2.

```bash
npm install
npm run dev      # sviluppo
npm run build    # build di produzione
npm run deploy   # deploy manuale (pull + build + restart)
```
