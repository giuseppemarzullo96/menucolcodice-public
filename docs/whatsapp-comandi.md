# WhatsApp — Comandi (aggiornato)

Piano **Pro**. Fino a **3 numeri** per locale. Sessioni tenute **24 ore**. Vocali trascritti con Whisper (prompt anti-esitazioni + pulizia intercalari; conferma solo se lunghi/ambigui).

---

## Primo contatto

| Scrivi | Risposta |
|--------|----------|
| `ciao` / `buongiorno` / `salve` | **Benvenuto** (una sola azione: prova `lista`) |
| `aiuto` / `help` / `comandi` | Aiuto **breve** (~9 righe): aggiungi, prezzo, finito, lista |
| `tutto` | Menu: `comandi piatti` / `comandi categorie` / `comandi grafica` |

---

## Tutti i giorni

| Comando | Effetto |
|---------|---------|
| `aggiungi` | Flusso guidato (o in una riga: `aggiungi Carbonara, primi, 12, uovo`) |
| `prezzo carbonara 9,50` | Cambia prezzo subito (con *annulla ultima*) |
| `finito carbonara` | Non disponibile sul menu (resta visibile, barrato) |
| `finito carbonara oggi` | Torna da solo domani mattina |
| `torna carbonara` | Di nuovo disponibile (anche: c’è, disponibile, di nuovo) |
| `lista` / `cerca …` | Elenco / ricerca |
| `annulla ultima` | Disfa l’ultima modifica (elimina, prezzo, finito, add, bulk) |
| `annulla` | Chiude il flusso in corso |

Sinonimi **finito**: esaurito, finita, non c’è, terminato, manca.

---

## Piatti

- `modifica` / `modifica carbonara`
- `foto carbonara`
- `elimina` → lista da spuntare → **`cancella`** (anche conferma/vai)
- `elimina carbonara` → chiede **sì** prima di cancellare
- `copia margherita` → duplica
- `aumenta prezzi 5%` / `aumenta prezzi primi 1 euro` → anteprima → sì
- Vocali: «aggiungi carbonara dodici euro» → stesso flusso
  - Intercalari (`ehm`, `allora`, `cioè`…) vengono tolti
  - Se correggi a metà («finito carbonara anzi amatriciana») tiene l’intenzione finale
  - Se il vocale è lungo/ambiguo: «Ho capito: *…*. Va bene?» → *sì* / *no*

---

## Categorie

- `categorie`, `aggiungi categoria`, `modifica categoria`, …
- `nascondi gelati` / `mostra gelati` (stagionali, senza cancellare)
- `elimina categoria` → poi `cancella`

---

## Grafica / locale

- `configura` (anche `setup`), `locale`, `dati`, `logo`, `sfondo`, `colori`
- `colore verde` / `colore #0c5648`
- `elenco` / `carosello`
- URL Google/sito → import automatico

---

## Extra

| Comando | Effetto |
|---------|---------|
| `statistiche` | Ultimi 7 giorni (aperture, QR, permanenza, piatto più visto) |
| `link` | URL menu da inoltrare |
| `qr` | Link alla pagina QR da stampare |
| foto menu cartaceo | OCR → anteprima → `sì` (max **100 scansioni/mese** per locale; foto compresse) |

**Report automatico:** ogni lunedì mattina (cron) manda le statistiche ai numeri Pro autorizzati.

---

## Menu pubblico

- Piatto **finito**: visibile, grigio/barrato, badge «Finito»
- Categoria **nascosta**: non compare sul menu clienti
- Badge consigliato = campo `bestSeller` (in chat si dice «Consigliato»)

---

## Microcopy chiave

- Dopo una modifica: «È già così sul menu del locale.»
- Timeout: «Non ci sentiamo da un po’…»
- Annulla: «Ok, lasciamo stare. Non ho cambiato niente.»

Dettaglio storico: vedi conversazione prodotto / codice in `whatsappCommands.ts`, `whatsappHelp.ts`.

---

## Sticker animati (conferme ed errori)

Prima del testo di risposta, il bot manda uno **sticker WebP animato** (512×512, brand Menu col codice). File in `public/stickers/`, serviti con cache lunga.

| Sticker | Quando |
|---------|--------|
| `aggiunto` | piatto creato |
| `modificato` | campo modificato |
| `prezzo` | prezzo aggiornato |
| `eliminato` | piatti cancellati |
| `foto` | foto piatto salvata |
| `finito` / `tornato` | disponibilità |
| `importato` | OCR confermato |
| `grafica` | setup locale completato |
| `qr` | comando `qr` |
| `illeggibile` / `noncapito` / `scaduta` | errori |
