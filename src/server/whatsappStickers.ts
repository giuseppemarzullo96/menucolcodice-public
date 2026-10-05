/** Sticker animati WebP 512×512 — vedi docs/whatsapp-comandi.md */
export const STICKER_IDS = [
  'aggiunto',
  'modificato',
  'prezzo',
  'eliminato',
  'foto',
  'finito',
  'tornato',
  'importato',
  'grafica',
  'qr',
  'attesa',
  'illeggibile',
  'noncapito',
  'scaduta',
] as const;

export type StickerId = (typeof STICKER_IDS)[number];

export function stickerPublicUrl(id: StickerId): string {
  const base = (process.env.STICKER_BASE_URL || process.env.MARKETING_ORIGIN || 'https://menucolcodice.it')
    .trim()
    .replace(/\/$/, '');
  return `${base}/stickers/${id}.webp`;
}
