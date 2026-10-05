import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { withTenantApi } from '@/server/tenant';

export const config = {
  api: {
    bodyParser: false,
  },
};

const ALLOWED_EXT = ['.glb', '.gltf'];

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const uploadDir = path.join(process.cwd(), 'public', 'uploads');

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const form = formidable({
    uploadDir,
    keepExtensions: true,
    maxFileSize: 50 * 1024 * 1024, // 50MB per modelli 3D
    maxTotalFileSize: 50 * 1024 * 1024,
    filename: (name, ext, part, form) => {
      const extLower = (ext || '').toLowerCase();
      if (!ALLOWED_EXT.includes(extLower)) {
        return `${Date.now()}-${Math.round(Math.random() * 1e9)}.glb`;
      }
      return `${Date.now()}-${Math.round(Math.random() * 1e9)}${extLower}`;
    },
  });

  try {
    const [fields, files] = await form.parse(req);

    const file = files.file?.[0];

    if (!file) {
      return res.status(400).json({ error: 'Nessun file caricato' });
    }

    const ext = path.extname(file.originalFilename || file.newFilename || '').toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      if (file.filepath && fs.existsSync(file.filepath)) {
        fs.unlinkSync(file.filepath);
      }
      return res.status(400).json({
        error: 'Formato non consentito. Usa file .glb o .gltf',
      });
    }

    const fileName = path.basename(file.filepath);
    const fileUrl = `/api/serve-image?filename=${fileName}`;

    return res.status(200).json({
      success: true,
      url: fileUrl,
      filename: fileName,
    });
  } catch (error) {
    console.error('Upload modello 3D:', error);
    return res.status(500).json({ error: 'Caricamento fallito' });
  }
}

export default withTenantApi(handler);
