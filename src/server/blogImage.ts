import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

/**
 * Copertina generata dal brand kit reale (public/brand/colori.css + il simbolo
 * "angoli QR" di public/brand/simbolo-negativo.svg), non da un template generico.
 * Font: Georgia/Arial di sistema come approssimazione di Cormorant Garamond/Manrope
 * (quei due non sono installati come font di sistema sul server, ed embeddarli nel
 * SVG per la rasterizzazione via sharp/librsvg è fragile con file .woff2) — stessa
 * palette e stesso simbolo del sito, non è pixel-identico alla tipografia del sito.
 */

const INK = '#1A1A17';
const CREAM = '#FAF7F0';
const MUSTARD = '#E0A32E';
const MUSTARD_LIGHT = '#F2D08A';

const WIDTH = 1200;
const HEIGHT = 630;

function escapeXml(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Spezza il titolo su più righe stimando la larghezza in caratteri (SVG non fa wrap da solo). */
function wrapTitle(title: string, maxCharsPerLine: number): string[] {
  const words = title.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 4);
}

/** Il simbolo "angoli QR" del brand kit (public/brand/simbolo-negativo.svg), riscalato. */
function cornerMark(x: number, y: number, scale: number, color: string) {
  return `<g transform="translate(${x}, ${y}) scale(${scale})" fill="${color}">
    <rect x="13.4" y="13.4" width="21.2" height="21.2" rx="5.6" fill="none" stroke="${color}" stroke-width="6.8"/>
    <rect x="19.52" y="19.52" width="8.96" height="8.96" rx="2.69"/>
    <rect x="93.4" y="13.4" width="21.2" height="21.2" rx="5.6" fill="none" stroke="${color}" stroke-width="6.8"/>
    <rect x="99.52" y="19.52" width="8.96" height="8.96" rx="2.69"/>
    <rect x="13.4" y="93.4" width="21.2" height="21.2" rx="5.6" fill="none" stroke="${color}" stroke-width="6.8"/>
    <rect x="19.52" y="99.52" width="8.96" height="8.96" rx="2.69"/>
  </g>`;
}

function buildSvg(title: string): string {
  const lines = wrapTitle(title, 26);
  const lineHeight = 78;
  const startY = HEIGHT / 2 - ((lines.length - 1) * lineHeight) / 2;

  const titleTspans = lines
    .map((line, i) => `<tspan x="90" y="${startY + i * lineHeight}">${escapeXml(line)}</tspan>`)
    .join('');

  return `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${WIDTH}" height="${HEIGHT}" fill="${INK}"/>
    <rect x="0" y="0" width="${WIDTH}" height="10" fill="${MUSTARD}"/>
    ${cornerMark(WIDTH - 200, HEIGHT - 200, 1.1, MUSTARD_LIGHT)}
    <text font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="58" fill="${CREAM}" letter-spacing="-0.5">${titleTspans}</text>
    <text x="90" y="${HEIGHT - 70}" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="28" fill="${MUSTARD}" letter-spacing="1">MENU COL CODICE</text>
  </svg>`;
}

/**
 * Salvate fuori da /public e servite da un endpoint API dinamico
 * (/api/blog-cover/[slug]), non tramite passthrough statico: in questo setup di
 * produzione Next.js non serve i file aggiunti a /public dopo l'ultimo build finché
 * il processo non viene riavviato — inaccettabile per immagini generate a runtime
 * dal cron. Stesso pattern già usato dal progetto per le immagini dei piatti
 * (src/pages/api/serve-image.ts).
 */
export function blogCoversDir() {
  return path.join(process.cwd(), 'platform', 'blog', 'covers');
}

export async function generateBlogCoverImage(slug: string, title: string): Promise<string> {
  const svg = buildSvg(title);
  const outDir = blogCoversDir();
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${slug}.png`);
  await sharp(Buffer.from(svg)).png({ quality: 90 }).toFile(outPath);
  return `/api/blog-cover/${slug}`;
}
