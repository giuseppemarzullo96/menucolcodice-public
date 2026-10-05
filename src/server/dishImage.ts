import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

export function uploadsDir() {
  const dir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function dishImageUrl(filename: string) {
  return `/api/serve-image?filename=${encodeURIComponent(filename)}`;
}

export async function processDishImage(input: Buffer | string): Promise<{ filename: string; url: string }> {
  const source = typeof input === 'string' ? fs.readFileSync(input) : input;
  if (!source || source.length < 100) throw new Error('Foto non valida');

  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
  const dest = path.join(uploadsDir(), filename);
  await sharp(source)
    .rotate()
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 78, effort: 4 })
    .toFile(dest);
  try { fs.chmodSync(dest, 0o644); } catch { /* ignore */ }
  return { filename, url: dishImageUrl(filename) };
}

export async function processDishImageFromBase64(imageBase64: string) {
  const raw = String(imageBase64 || '').replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '');
  return processDishImage(Buffer.from(raw, 'base64'));
}

function fromBase64(imageBase64: string) {
  return Buffer.from(String(imageBase64 || '').replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, ''), 'base64');
}

export async function processBrandImage(
  input: Buffer | string,
  kind: 'logo' | 'background'
): Promise<{ filename: string; url: string; width: number; height: number }> {
  const source = typeof input === 'string' ? fs.readFileSync(input) : input;
  if (!source || source.length < 100) throw new Error('Immagine non valida');

  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
  const dest = path.join(uploadsDir(), filename);
  const pipeline = sharp(source).rotate();
  if (kind === 'background') {
    await pipeline
      .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .toFile(dest);
  } else {
    await pipeline
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toFile(dest);
  }
  try { fs.chmodSync(dest, 0o644); } catch { /* ignore */ }
  const meta = await sharp(dest).metadata();
  return {
    filename,
    url: dishImageUrl(filename),
    width: meta.width || 0,
    height: meta.height || 0,
  };
}

export async function processBrandImageFromBase64(imageBase64: string, kind: 'logo' | 'background') {
  return processBrandImage(fromBase64(imageBase64), kind);
}
