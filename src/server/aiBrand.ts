import { extractJson, hasOpenAiKey, openaiJson, deepseekJson } from './aiClient';
import { parseColor, paletteFromBrand, type ThemePalette } from './restaurantStore';
import {
  usableDeliveryUrl,
  usableProfileUrl,
  usableWhatsApp,
} from '@/utils/socialLinks';
import type { ImportedProfile } from './restaurantImport';
import { normalizeOpeningHours } from '@/utils/openingHours';

const TEXT_KEYS = [
  'name',
  'description',
  'street',
  'city',
  'postalCode',
  'phone',
  'email',
  'website',
  'openingHours',
  'instagram',
  'facebook',
  'whatsapp',
  'glovo',
  'deliveroo',
  'justeat',
] as const;

function usableHex(value: any) {
  const hex = parseColor(String(value || ''));
  if (!hex || /^#(fff{3}|ffffff|000|000000)$/i.test(hex)) return '';
  return hex;
}

function overlayHex(value: any, fallback: string) {
  return usableHex(value) || fallback;
}

function paletteFromAi(raw: any, fallbackBrand?: string): ThemePalette | null {
  if (!raw || typeof raw !== 'object') return null;
  const brand = usableHex(raw.brand || raw.primaryColor || fallbackBrand);
  if (!brand) return null;
  const base = paletteFromBrand(brand, usableHex(raw.page || raw.pageColor) || undefined);
  return {
    brand: base.brand,
    brandDark: overlayHex(raw.brandDark, base.brandDark),
    brandSoft: overlayHex(raw.brandSoft, base.brandSoft),
    page: base.page,
    surface: overlayHex(raw.surface, base.surface),
    chrome: overlayHex(raw.chrome, base.chrome),
    chromeText: overlayHex(raw.chromeText, base.chromeText),
    accent: overlayHex(raw.accent, base.accent),
    ink: overlayHex(raw.ink, base.ink),
    muted: overlayHex(raw.muted, base.muted),
    button: overlayHex(raw.button, base.button),
    buttonText: overlayHex(raw.buttonText, base.buttonText),
  };
}

async function designHarmonizedPalette(opts: {
  brand?: string;
  name?: string;
  description?: string;
  excerpt?: string;
}): Promise<ThemePalette | null> {
  if (!hasOpenAiKey()) return null;
  const system = `Sei un art director di menu digitali per ristoranti. Il tuo UNICO compito è armonizzare TUTTI i colori dell'interfaccia.
Non estrarre dati. Non inventare link. Progetta una palette coerente.

Restituisci SOLO JSON:
{
  "mood": "due parole",
  "brand": "#rrggbb",
  "brandDark": "#rrggbb",
  "brandSoft": "#rrggbb",
  "page": "#rrggbb",
  "surface": "#rrggbb",
  "chrome": "#rrggbb",
  "chromeText": "#rrggbb",
  "accent": "#rrggbb",
  "ink": "#rrggbb",
  "muted": "#rrggbb",
  "button": "#rrggbb",
  "buttonText": "#rrggbb"
}

Regole di armonia (obbligatorie):
- Una sola famiglia di tinta. Se il brand è oro/beige, tutto è caldo (crema, caffè, avorio). Niente rosa, rosso o verdini casuali.
- 60% page/surface, 30% chrome, 10% brand/accent.
- page: chiaro, ripososo, per testo scuro. surface: un filo più chiaro o più caldo di page, per le card.
- chrome: barra e footer. Se il brand è metallico/chiaro (oro, beige), chrome scuro espresso, non oro pieno.
- chromeText e icon/accent sulla chrome devono contrastare (chiaro su scuro).
- ink: testo principale sulle pagine, scuro e della stessa tinta di page.
- muted: grigio CALDO o FREDDO della stessa tinta di ink, mai un mix sporco col brand.
- button = brand o brandDark; buttonText deve contrastare (oro → testo scuro; verde scuro → testo chiaro).
- Mai bianco puro #ffffff o nero puro #000000. Mai page uguale a brand.
- Contrasto testo/sfondo almeno visivamente netto.`;

  const user = `Locale: ${opts.name || 'ristorante'}
Descrizione: ${opts.description || '—'}
Colore marca rilevato: ${opts.brand || 'sconosciuto'}
Contesto sito: ${(opts.excerpt || '').slice(0, 1800)}

Progetta la palette completa e armoniosa per navbar, sidebar, card, bottoni, testi e footer.`;

  const raw = await openaiJson(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { timeoutMs: 20000, temperature: 0.35 }
  );
  let parsed = extractJson(raw);
  try {
    const refined = await deepseekJson([
      { role: 'system', content: system },
      {
        role: 'user',
        content: `Rifinisci questa palette per massima armonia e contrasto. Stessa famiglia di tinta, nessun colore stonato.\n${raw}`,
      },
    ]);
    if (refined) parsed = extractJson(refined);
  } catch {
    /* keep openai */
  }
  return paletteFromAi(parsed, opts.brand);
}

function cleanStr(value: any) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export async function refineImportedProfile(opts: {
  profile: ImportedProfile;
  excerpts: string[];
  coverUrls: string[];
  searchSnippets?: string[];
}): Promise<{ profile: ImportedProfile; coverUrls: string[] }> {
  if (!hasOpenAiKey()) return { profile: opts.profile, coverUrls: opts.coverUrls };

  const heuristic = { ...opts.profile };
  delete (heuristic as any).coverChoices;
  delete (heuristic as any).logoUrl;
  delete (heuristic as any).notes;
  delete (heuristic as any).sources;

  const system = `Sei un art director e un estrattore di dati per menu digitali di ristoranti italiani.
Dal testo dei siti (footer, contatti, JSON-LD, link) scegli SOLO i dati veri del locale.
Non inventare. Se non sei sicuro, stringa vuota.

Restituisci SOLO JSON:
{
  "name": "",
  "description": "",
  "street": "",
  "city": "",
  "postalCode": "",
  "phone": "",
  "email": "",
  "website": "",
  "openingHours": "",
  "instagram": "",
  "facebook": "",
  "whatsapp": "",
  "glovo": "",
  "deliveroo": "",
  "justeat": "",
  "primaryColor": "#rrggbb",
  "coverPreferred": []
}

Regole:
- name: nome del ristorante, senza SEO ("home", "prenota", "shop").
- description: 1-2 frasi, tono del locale, max 180 caratteri. Niente "menu digitale".
- street: solo via/piazza/galleria e civico, senza città.
- city e postalCode separati. "Milan" → "Milano".
- email: info/prenotazioni/hello. MAI curriculum, privacy, pec, noreply.
- glovo/deliveroo/justeat: solo URL del ristorante (con slug), mai la homepage del servizio. Se non c'è, vuoto.
- instagram/facebook: solo profilo/pagina del locale indicato, non sharer. Se non appartiene a questo ristorante, vuoto.
- whatsapp: solo se c'è wa.me o whatsapp.com/send per questo locale. Non copiare il telefono generico.
- openingHours: righe brevi separate da ";", es. "Lun-Ven: 12:30-15:15, 19:00-23:00; Sab: 19:00-00:30". Non inventare. Se non presente, vuoto.
- primaryColor: colore di marca dal logo o dal sito. Mai bianco, nero o grigio neutro.
- coverPreferred: fino a 5 URL già nella lista, foto di sala/ambiente/cibo del locale. Niente loghi, icone, pixel, shop.`;

  const user = `JSON meccanico (può essere sbagliato):\n${JSON.stringify(heuristic)}\n\nFoto candidate:\n${opts.coverUrls.slice(0, 12).join('\n') || '(nessuna)'}\n\nTesto pagine:\n${opts.excerpts.join('\n---\n').slice(0, 12000) || '(nessun testo pagina)'}\n\nRisultati ricerca web:\n${(opts.searchSnippets || []).join('\n---\n').slice(0, 6000) || '(nessuno)'}`;

  try {
    const raw = await openaiJson(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { timeoutMs: 25000, temperature: 0.15 }
    );
    let parsed = extractJson(raw);
    try {
      const refined = await deepseekJson([
        { role: 'system', content: system },
        {
          role: 'user',
          content: `Normalizza questo JSON di un ristorante italiano. Non inventare dati assenti.\n${raw}`,
        },
      ]);
      if (refined) parsed = extractJson(refined);
    } catch {
      /* keep openai */
    }

    const next: ImportedProfile = { ...opts.profile };
    for (const key of TEXT_KEYS) {
      const value = cleanStr(parsed[key]);
      const existing = cleanStr((opts.profile as any)[key]);
      if (key === 'whatsapp') {
        const wa = usableWhatsApp(value);
        if (wa) next.whatsapp = wa;
      } else if (key === 'glovo') {
        const link = usableDeliveryUrl(value, 'glovo');
        if (link) next.glovo = link;
      } else if (key === 'deliveroo') {
        const link = usableDeliveryUrl(value, 'deliveroo');
        if (link) next.deliveroo = link;
      } else if (key === 'justeat') {
        const link = usableDeliveryUrl(value, 'justeat');
        if (link) next.justeat = link;
      } else if (key === 'instagram') {
        const link = usableProfileUrl(value, 'instagram');
        if (link) next.instagram = link;
      } else if (key === 'facebook') {
        const link = usableProfileUrl(value, 'facebook');
        if (link) next.facebook = link;
      } else if (value) (next as any)[key] = value;
      else if (existing) (next as any)[key] = existing;
    }
    // AI ha visto i link: se non c'è delivery/whatsapp, cancellali
    next.whatsapp = next.whatsapp || undefined;
    next.glovo = next.glovo || undefined;
    next.deliveroo = next.deliveroo || undefined;
    next.justeat = next.justeat || undefined;

    if (opts.profile.openingHours) {
      next.openingHours = normalizeOpeningHours(opts.profile.openingHours);
    } else if (next.openingHours) {
      next.openingHours = normalizeOpeningHours(next.openingHours);
    }

    const primary = usableHex(parsed.primaryColor);
    if (primary && !/^#(fff{3}|ffffff|000|000000)$/i.test(primary)) next.primaryColor = primary;

    try {
      const palette = await designHarmonizedPalette({
        brand: next.primaryColor,
        name: next.name,
        description: next.description,
        excerpt: opts.excerpts.join(' ').slice(0, 1800),
      });
      if (palette) {
        next.palette = palette;
      } else if (next.primaryColor) {
        next.palette = paletteFromBrand(next.primaryColor);
      }
      if (next.palette) {
        next.primaryColor = next.palette.brand;
        next.pageColor = next.palette.page;
        next.notes = [...(next.notes || []), 'AI: tutti i colori del tema sono armonizzati'];
      }
    } catch (error) {
      if (next.primaryColor && !next.palette) next.palette = paletteFromBrand(next.primaryColor);
      next.notes.push(`AI colori: ${error instanceof Error ? error.message : 'non applicata'}`);
    }

    const preferred = Array.isArray(parsed.coverPreferred)
      ? parsed.coverPreferred.map((item: any) => cleanStr(item)).filter((item: string) => /^https?:\/\//i.test(item))
      : [];
    const ranked = [
      ...preferred.filter((url: string) => opts.coverUrls.includes(url) || /^https?:\/\//i.test(url)),
      ...opts.coverUrls,
    ].filter((url, i, arr) => url && arr.indexOf(url) === i);

    next.notes = [...(next.notes || []), 'AI: dati e foto rivisti'];
    return { profile: next, coverUrls: ranked };
  } catch (error) {
    opts.profile.notes.push(`AI: non usata (${error instanceof Error ? error.message : 'errore'})`);
    return { profile: opts.profile, coverUrls: opts.coverUrls };
  }
}
