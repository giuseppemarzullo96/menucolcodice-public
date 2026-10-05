import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { blogCoversDir } from '@/server/blogImage';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const slug = String(req.query.slug || '');
  if (!slug || /[^a-z0-9-]/i.test(slug)) {
    return res.status(400).json({ error: 'Slug non valido' });
  }

  const filePath = path.join(blogCoversDir(), `${slug}.png`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Immagine non trovata' });
  }

  const buffer = fs.readFileSync(filePath);
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Length', buffer.length);
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(buffer);
}
