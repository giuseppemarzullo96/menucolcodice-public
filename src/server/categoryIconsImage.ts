import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { CATEGORY_ICONS } from '@/constants/categoryIcons';

/**
 * Collage con tutte le icone categoria disponibili, numerate, da mandare come
 * unica immagine WhatsApp (vedi sendCategoryIconChoices in whatsappCommands.ts):
 * l'utente risponde con il numero invece di indovinare una parola a caso.
 * Stessa tecnica di src/server/blogImage.ts (SVG dal brand kit + rasterizzazione
 * sharp), font di sistema per lo stesso motivo lì documentato.
 */

const INK = '#1A1A17';
const CREAM = '#FAF7F0';
const CREAM_DARK = '#EFE9DC';
const MUSTARD = '#E0A32E';
const MUSTARD_DARK = '#B0770F';

const COLS = 4;
const CELL_W = 210;
const CELL_H = 190;
const PADDING = 36;
const HEADER_H = 96;

function escapeXml(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function iconCell(icon: (typeof CATEGORY_ICONS)[number], index: number): string {
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  const x = PADDING + col * CELL_W;
  const y = HEADER_H + row * CELL_H;
  const cardW = CELL_W - 16;
  const cardH = CELL_H - 16;
  const iconScale = 2;
  const iconSize = 24 * iconScale;
  const iconX = x + (cardW - iconSize) / 2;
  const iconY = y + 20;

  return `
    <g>
      <rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="14" fill="${CREAM_DARK}"/>
      <circle cx="${x + 22}" cy="${y + 22}" r="14" fill="${MUSTARD}"/>
      <text x="${x + 22}" y="${y + 27}" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="16" fill="${INK}" text-anchor="middle">${index + 1}</text>
      <g transform="translate(${iconX}, ${iconY}) scale(${iconScale})" color="${INK}" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" fill="none">
        ${icon.svgPath}
      </g>
      <text x="${x + cardW / 2}" y="${y + cardH - 16}" font-family="Arial, Helvetica, sans-serif" font-weight="600" font-size="15" fill="${MUSTARD_DARK}" text-anchor="middle">${escapeXml(icon.label)}</text>
    </g>`;
}

function buildSvg(): string {
  const rows = Math.ceil(CATEGORY_ICONS.length / COLS);
  const width = PADDING * 2 + COLS * CELL_W;
  const height = HEADER_H + rows * CELL_H + PADDING;
  const cells = CATEGORY_ICONS.map((icon, index) => iconCell(icon, index)).join('');

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${height}" fill="${CREAM}"/>
    <rect x="0" y="0" width="${width}" height="8" fill="${MUSTARD}"/>
    <text x="${PADDING}" y="56" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="30" fill="${INK}">Scegli l'icona</text>
    <text x="${PADDING}" y="82" font-family="Arial, Helvetica, sans-serif" font-size="17" fill="${MUSTARD_DARK}">Rispondi con il numero dell'icona che preferisci</text>
    ${cells}
  </svg>`;
}

/** Salvato fuori da /public per lo stesso motivo di blogImage.ts (Next.js in
 * produzione non serve i file nuovi in /public senza riavvio); qui non serve
 * neanche un endpoint API, perché sendWhatsAppImage legge il file dal disco. */
export function categoryIconsImageDir() {
  return path.join(process.cwd(), 'platform', 'whatsapp');
}

function categoryIconsImagePath() {
  return path.join(categoryIconsImageDir(), 'category-icons-collage.png');
}

/** Immagine statica (il set di icone non cambia a runtime): generata una sola
 * volta e riusata da tutte le richieste successive. */
export async function generateCategoryIconsCollage(): Promise<string> {
  const outPath = categoryIconsImagePath();
  if (fs.existsSync(outPath)) return outPath;
  const svg = buildSvg();
  fs.mkdirSync(categoryIconsImageDir(), { recursive: true });
  await sharp(Buffer.from(svg)).png({ quality: 90 }).toFile(outPath);
  return outPath;
}
