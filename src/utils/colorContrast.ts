/**
 * Matematica di contrasto WCAG condivisa (client e server).
 *
 * La luminanza qui è la "relative luminance" WCAG con correzione gamma sRGB,
 * NON la somma pesata grezza (0.2126R+0.7152G+0.0722B su valori lineari 0-1):
 * quella sbaglia proprio nei casi borderline — un grigio medio #808080 vale
 * ~0.50 con la formula grezza ma ~0.22 con quella corretta — ed è il motivo
 * per cui certe combinazioni "passavano" i vecchi controlli restando illeggibili.
 */

export function isHexColor(value?: string): value is string {
  return typeof value === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
}

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const int = parseInt(full, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Rapporto di contrasto WCAG: da 1 (identici) a 21 (nero su bianco). */
export function contrastRatio(hexA: string, hexB: string): number {
  const la = relativeLuminance(hexA);
  const lb = relativeLuminance(hexB);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Fra due candidati, quello che contrasta di più con lo sfondo. */
export function bestTextOn(bgHex: string, lightHex: string, darkHex: string): string {
  return contrastRatio(bgHex, lightHex) >= contrastRatio(bgHex, darkHex) ? lightHex : darkHex;
}

/**
 * Tiene il colore preferito solo se regge il contrasto minimo richiesto contro
 * lo sfondo reale su cui verrà usato; altrimenti ripiega sulla coppia sicura.
 * minRatio: 4.5 = testo normale (AA), 3 = testo grande/elementi grafici.
 */
export function readableOr(
  bgHex: string,
  preferredHex: string | undefined | null,
  lightHex: string,
  darkHex: string,
  minRatio = 4.5
): string {
  if (isHexColor(preferredHex || undefined) && contrastRatio(preferredHex as string, bgHex) >= minRatio) {
    return preferredHex as string;
  }
  return bestTextOn(bgHex, lightHex, darkHex);
}
