import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { withTenantApi } from '@/server/tenant';

// Evita MaxListenersExceededWarning in dev quando la route viene richiamata spesso
if (typeof process !== 'undefined' && typeof process.setMaxListeners === 'function') {
  process.setMaxListeners(20);
}

function handler(req: NextApiRequest, res: NextApiResponse) {
  const { filename } = req.query;

  if (!filename || typeof filename !== 'string') {
    return res.status(400).json({ error: 'Filename required' });
  }

  const filePath = path.join(process.cwd(), 'public', 'uploads', filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  const stat = fs.statSync(filePath);
  const fileBuffer = fs.readFileSync(filePath);
  
  // Determine content type based on file extension
  const ext = path.extname(filename).toLowerCase();
  const contentTypes: Record<string, string> = {
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json',
  };

  const contentType = contentTypes[ext] || 'application/octet-stream';

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.send(fileBuffer);
}

export default withTenantApi(handler);
