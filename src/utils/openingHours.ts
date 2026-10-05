const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'] as const;

const DAY_LOOKUP: Record<string, number> = {
  lu: 0,
  lun: 0,
  lunedì: 0,
  lunedi: 0,
  luned: 0,
  monday: 0,
  mo: 0,
  ma: 1,
  mar: 1,
  martedì: 1,
  martedi: 1,
  marted: 1,
  tuesday: 1,
  tu: 1,
  me: 2,
  mer: 2,
  mercoledì: 2,
  mercoledi: 2,
  mercoled: 2,
  wednesday: 2,
  we: 2,
  gi: 3,
  gio: 3,
  giovedì: 3,
  giovedi: 3,
  gioved: 3,
  thursday: 3,
  th: 3,
  ve: 4,
  ven: 4,
  venerdì: 4,
  venerdi: 4,
  venerd: 4,
  friday: 4,
  fr: 4,
  sa: 5,
  sab: 5,
  sabato: 5,
  saturday: 5,
  do: 6,
  dom: 6,
  domenica: 6,
  sunday: 6,
  su: 6,
};

function normalizeToken(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');
}

function lookupDay(token: string) {
  return DAY_LOOKUP[normalizeToken(token)];
}

function normalizeTimeSlot(slot: string) {
  return slot
    .replace(/\s*[-–/]\s*/g, '-')
    .replace(/(\d{1,2})[:.](\d{2})/g, (_, hour, minute) => `${hour.padStart(2, '0')}:${minute}`);
}

function expandDaysToken(token: string) {
  const cleaned = String(token || '')
    .trim()
    .replace(/^(pranzo|cena|colazione|aperitivo|apertura)\s+/i, '')
    .trim();
  if (!cleaned) return [] as number[];

  if (cleaned.includes(',')) {
    const days: number[] = [];
    for (const part of cleaned.split(',').map((piece) => piece.trim()).filter(Boolean)) {
      const idx = lookupDay(part);
      if (idx !== undefined) days.push(idx);
    }
    if (days.length) return Array.from(new Set(days)).sort((a, b) => a - b);
  }

  const parts = cleaned.split(/[-–/]/).map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return [];

  const allShort = parts.every((part) => part.length <= 2);
  if (allShort && parts.length === 2) {
    const start = lookupDay(parts[0]);
    const end = lookupDay(parts[1]);
    if (start !== undefined && end !== undefined) {
      const days: number[] = [];
      if (start <= end) {
        for (let day = start; day <= end; day += 1) days.push(day);
      } else {
        for (let day = start; day <= 6; day += 1) days.push(day);
        for (let day = 0; day <= end; day += 1) days.push(day);
      }
      return days;
    }
  }

  if (allShort && parts.length > 2) {
    const days: number[] = [];
    for (const part of parts) {
      const idx = lookupDay(part);
      if (idx !== undefined) days.push(idx);
    }
    return Array.from(new Set(days)).sort((a, b) => a - b);
  }

  if (parts.length >= 2) {
    const start = lookupDay(parts[0]);
    const end = lookupDay(parts[parts.length - 1]);
    if (start !== undefined && end !== undefined) {
      const days: number[] = [];
      if (start <= end) {
        for (let day = start; day <= end; day += 1) days.push(day);
      } else {
        for (let day = start; day <= 6; day += 1) days.push(day);
        for (let day = 0; day <= end; day += 1) days.push(day);
      }
      return days;
    }
  }

  const single = lookupDay(parts[0]);
  return single !== undefined ? [single] : [];
}

function preprocessOpeningHoursRaw(raw: string) {
  return String(raw || '')
    .replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su)\b/gi, (match) => {
      const map: Record<string, string> = {
        mo: 'Monday',
        tu: 'Tuesday',
        we: 'Wednesday',
        th: 'Thursday',
        fr: 'Friday',
        sa: 'Saturday',
        su: 'Sunday',
      };
      return map[match.toLowerCase()] || match;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

const DAY_TOKEN_ALTERNATION = Object.keys(DAY_LOOKUP)
  .sort((a, b) => b.length - a.length)
  .join('|');

/**
 * Separa un blocco "giorni orario" dal successivo quando, subito dopo un orario
 * completo, segue un nuovo gruppo che inizia con un giorno riconosciuto (es.
 * "Lun-Ven 12:00-15:00, Sab-Dom 10:00-14:00", ma anche senza virgola esplicita:
 * "Lun-Gio 09:00-00:00 — Ven-Sab 09:00-02:00" o su righe separate). Il
 * separatore fra i due blocchi (virgola, trattino, em-dash, semplice spazio/a
 * capo) è opzionale: quello che conta è "orario completo" seguito da "giorno
 * noto". Non tocca le virgole che elencano più giorni ("Lun, Mer, Ven
 * 12:00-15:00") né quelle fra due orari dello stesso giorno ("12:00-15:00,
 * 19:00-23:00"), perché lì dopo la virgola non c'è un giorno ma una cifra.
 */
function splitDayTimeGroups(segment: string) {
  const boundary = new RegExp(
    `(?<=\\d{1,2}[:.]\\d{2})\\s*[-–—,]?\\s*(?=(?:${DAY_TOKEN_ALTERNATION})(?![a-zà-ÿ]))`,
    'i'
  );
  return segment
    .split(boundary)
    .map((part) => part.trim())
    .filter(Boolean);
}

function splitSegments(raw: string) {
  const normalized = preprocessOpeningHoursRaw(raw);
  return normalized
    .split(/\s*[·|;]\s*|\s*;\s*|\s*\|\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap((part) => splitDayTimeGroups(part));
}

function parseStructuredSegment(segment: string) {
  const closed = /chius[oa]|closed|riposo|festivo/i.test(segment);
  if (closed) {
    const cleaned = segment.replace(/chius[oa]|closed|riposo|festivo/gi, ' ').replace(/\s+/g, ' ').trim();
    const days = cleaned ? expandDaysToken(cleaned) : [];
    return { days, slots: [] as string[], closed: true };
  }

  // Separatore DENTRO un singolo orario (inizio-fine): solo "-"/"–", mai "/", per non
  // confonderlo con "/" usato per separare due orari diversi dello stesso giorno
  // (es. "12:00-15:00 / 19:00-23:00" per pausa pranzo/cena, come nell'esempio guidato).
  const match = segment.match(
    /^(.+?)\s+(\d{1,2}[:.]\d{2}\s*[-–]\s*\d{1,2}[:.]\d{2}(?:\s*[,/]\s*\d{1,2}[:.]\d{2}\s*[-–]\s*\d{1,2}[:.]\d{2})*)$/i
  );
  if (!match) return null;

  const days = expandDaysToken(match[1]);
  if (!days.length) return null;

  const slots = match[2]
    .split(/\s*[,/]\s*/)
    .map((slot) => normalizeTimeSlot(slot))
    .filter(Boolean);

  return { days, slots, closed: false };
}

function slotsKey(slots: string[]) {
  return slots.join('|');
}

function formatDayRange(start: number, end: number) {
  if (start === end) return DAY_LABELS[start];
  return `${DAY_LABELS[start]}-${DAY_LABELS[end]}`;
}

function buildStructuredLines(raw: string) {
  const daySlots: string[][] = Array.from({ length: 7 }, () => []);
  const closedDays = new Set<number>();
  let parsedAny = false;

  for (const segment of splitSegments(raw)) {
    const parsed = parseStructuredSegment(segment);
    if (!parsed) continue;
    parsedAny = true;
    if (parsed.closed) {
      parsed.days.forEach((day) => closedDays.add(day));
      continue;
    }
    for (const day of parsed.days) {
      for (const slot of parsed.slots) {
        if (!daySlots[day].includes(slot)) daySlots[day].push(slot);
      }
      daySlots[day].sort();
    }
  }

  if (!parsedAny) return null;

  const lines: string[] = [];
  let day = 0;
  while (day < 7) {
    if (closedDays.has(day) && !daySlots[day].length) {
      let end = day;
      while (end + 1 < 7 && closedDays.has(end + 1) && !daySlots[end + 1].length) end += 1;
      lines.push(`${formatDayRange(day, end)}: chiuso`);
      day = end + 1;
      continue;
    }

    const slots = daySlots[day];
    if (!slots.length) {
      day += 1;
      continue;
    }

    const key = slotsKey(slots);
    let end = day;
    while (end + 1 < 7 && slotsKey(daySlots[end + 1]) === key && !closedDays.has(end + 1)) end += 1;
    lines.push(`${formatDayRange(day, end)}: ${slots.join(', ')}`);
    day = end + 1;
  }

  return lines.length ? lines : null;
}

function fallbackLines(raw: string) {
  const translated = preprocessOpeningHoursRaw(raw)
    .replace(/\bMonday\b/gi, 'Lunedì')
    .replace(/\bTuesday\b/gi, 'Martedì')
    .replace(/\bWednesday\b/gi, 'Mercoledì')
    .replace(/\bThursday\b/gi, 'Giovedì')
    .replace(/\bFriday\b/gi, 'Venerdì')
    .replace(/\bSaturday\b/gi, 'Sabato')
    .replace(/\bSunday\b/gi, 'Domenica');
  return splitSegments(translated).map((line) =>
    line
      .replace(/\s+/g, ' ')
      .replace(/(\d{1,2})[:.](\d{2})/g, (_, hour, minute) => `${hour.padStart(2, '0')}:${minute}`)
      .trim()
  );
}

export function formatOpeningHoursLines(raw?: string) {
  const text = String(raw || '').trim();
  if (!text) return [];
  return buildStructuredLines(text) || fallbackLines(text);
}

/** true se il parser deterministico ha capito la struttura giorni/orari (niente fallback cosmetico). */
export function parsesAsStructuredOpeningHours(raw?: string): boolean {
  const text = String(raw || '').trim();
  if (!text) return false;
  return buildStructuredLines(text) !== null;
}

export function normalizeOpeningHours(raw?: string) {
  return formatOpeningHoursLines(raw).join('; ');
}

export function formatOpeningHoursDisplay(raw?: string) {
  return formatOpeningHoursLines(raw).join('\n');
}
