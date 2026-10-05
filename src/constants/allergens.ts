/** I 14 allergeni obbligatori secondo il Regolamento UE 1169/2011.
 * Unica fonte: usata da form admin, bot WhatsApp e scansione OCR del menu,
 * per evitare che le tre liste finiscano fuori sync.
 *
 * `icon` è il markup SVG interno (path/circle/...) in viewBox 24x24, stesso
 * stile delle icone categoria (public/brand/colori.css, stroke 1.75 arrotondato):
 * lo consuma AllergenIcon, che aggiunge il tag <svg> con stroke="currentColor".
 */
export const ALLERGENS: Array<{ short: string; full: string; icon: string }> = [
  {
    short: 'Glutine',
    full: 'Cereali contenenti glutine (grano, orzo, avena, ecc.)',
    icon:
      '<path d="M12 2v20"/><path d="M12 5c-2 0-3 1-3 2s1 2 3 2M12 5c2 0 3 1 3 2s-1 2-3 2"/><path d="M12 9c-2 0-3 1-3 2s1 2 3 2M12 9c2 0 3 1 3 2s-1 2-3 2"/><path d="M12 13c-2 0-3 1-3 2s1 2 3 2M12 13c2 0 3 1 3 2s-1 2-3 2"/>',
  },
  {
    short: 'Crostacei',
    full: 'Crostacei e derivati',
    icon:
      '<path d="M5 15c0-6 5-10 12-9-2 2-2 4 0 5-4 0-7 2-8 6"/><path d="M9 17l-2 2M9 17l-3 0"/>',
  },
  {
    short: 'Uova',
    full: 'Uova e prodotti a base di uova',
    icon: '<path d="M12 3c4 4 6 9 6 12a6 6 0 0 1-12 0c0-3 2-8 6-12Z"/>',
  },
  {
    short: 'Pesce',
    full: 'Pesce e derivati',
    icon:
      '<path d="M3 12c3-4 8-5 12-2-1 1-1 3 0 4-4 3-9 2-12-2Z"/><path d="M15 10l4-3v10l-4-3"/><circle cx="7" cy="11" r="0.8" fill="currentColor" stroke="none"/>',
  },
  {
    short: 'Arachidi',
    full: 'Arachidi e derivati',
    icon:
      '<path d="M9 4c3 0 5 2 5 4 0 1-1 2-2 2 1 0 2 1 2 2 0 2-2 4-5 4s-5-2-5-4c0-1 1-2 2-2-1 0-2-1-2-2 0-2 2-4 5-4Z"/>',
  },
  {
    short: 'Soia',
    full: 'Soia e derivati',
    icon:
      '<path d="M6 6c8-2 12 2 12 9-8 3-13-1-12-9Z"/><circle cx="10" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="13" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="10.5" cy="14" r="1" fill="currentColor" stroke="none"/>',
  },
  {
    short: 'Latte',
    full: 'Latte e lattosio',
    icon:
      '<path d="M7 4h10v3l-2 2v12H9V9L7 6Z"/><line x1="7" y1="4" x2="10" y2="1"/><line x1="17" y1="4" x2="14" y2="1"/><line x1="9" y1="9" x2="15" y2="9"/>',
  },
  {
    short: 'Frutta a guscio',
    full: 'Frutta a guscio (noci, mandorle, nocciole, ecc.)',
    icon: '<path d="M12 6c4 0 6 4 6 8a6 6 0 0 1-12 0c0-4 2-8 6-8Z"/><path d="M7 8c2-2 8-2 10 0"/>',
  },
  {
    short: 'Sedano',
    full: 'Sedano',
    icon:
      '<path d="M9 22V9M12 22V6M15 22V9"/><path d="M9 9c-1-2 0-4 0-4M15 9c1-2 0-4 0-4M12 6c-1-2 0-4-1-4M12 6c1-2 0-4 1-4"/>',
  },
  {
    short: 'Senape',
    full: 'Senape',
    icon:
      '<path d="M8 9h8v10a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2Z"/><path d="M9 9V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/><circle cx="10.5" cy="13" r="0.8" fill="currentColor" stroke="none"/><circle cx="13.5" cy="14.5" r="0.8" fill="currentColor" stroke="none"/><circle cx="11" cy="16.5" r="0.8" fill="currentColor" stroke="none"/>',
  },
  {
    short: 'Sesamo',
    full: 'Semi di sesamo',
    icon:
      '<ellipse cx="8" cy="9" rx="1.6" ry="1" transform="rotate(-20 8 9)"/><ellipse cx="14" cy="7" rx="1.6" ry="1" transform="rotate(15 14 7)"/><ellipse cx="17" cy="13" rx="1.6" ry="1" transform="rotate(-10 17 13)"/><ellipse cx="10" cy="15" rx="1.6" ry="1" transform="rotate(25 10 15)"/><ellipse cx="6" cy="16" rx="1.6" ry="1" transform="rotate(-30 6 16)"/>',
  },
  {
    short: 'Solfiti',
    full: 'Solfiti (sopra 10 mg/l)',
    icon:
      '<path d="M12 2v3"/><path d="M9 5c2-1 4-1 6 0"/><circle cx="9" cy="9" r="2"/><circle cx="13" cy="9" r="2"/><circle cx="11" cy="12" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="9" cy="15" r="2"/><circle cx="13" cy="15" r="2"/><circle cx="11" cy="18" r="2"/>',
  },
  {
    short: 'Lupini',
    full: 'Lupini',
    icon:
      '<path d="M5 12c0-4 3-7 7-7s7 3 7 7-3 7-7 7-7-3-7-7Z"/><circle cx="9" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.3" fill="currentColor" stroke="none"/>',
  },
  {
    short: 'Molluschi',
    full: 'Molluschi e derivati',
    icon:
      '<path d="M12 4c5 3 8 8 8 13H4c0-5 3-10 8-13Z"/><path d="M12 4v13M8.5 8c0 4 0 6-1 9M15.5 8c0 4 0 6 1 9"/>',
  },
];

/** Forma estesa, quella salvata sul piatto (dish.allergens: string[]). */
export const ALLERGEN_LABELS: string[] = ALLERGENS.map((a) => a.full);
