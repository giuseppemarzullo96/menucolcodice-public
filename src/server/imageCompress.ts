import sharp from 'sharp';

/**
 * Comprime una foto menu prima di mandarla a OpenAI vision.
 * Max lato lungo 1600px, JPEG qualità 78 → meno token e meno spesa.
 */
export async function compressMenuImageBase64(imageBase64: string): Promise<string> {
  const raw = String(imageBase64 || '').trim();
  if (!raw) return raw;
  const match = raw.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
  const b64 = match ? match[2] : raw.replace(/^data:[^;]+;base64,/, '');
  const input = Buffer.from(b64, 'base64');
  if (input.length < 40_000) {
    // già piccola: evita ricompressione inutile
    return match ? raw : `data:image/jpeg;base64,${b64}`;
  }

  try {
    const out = await sharp(input, { failOn: 'none' })
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 78, mozjpeg: true })
      .toBuffer();
    return `data:image/jpeg;base64,${out.toString('base64')}`;
  } catch (error) {
    console.error('compressMenuImageBase64 fallback:', error instanceof Error ? error.message : error);
    return match ? raw : `data:image/jpeg;base64,${b64}`;
  }
}
