import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { processDishImage } from '@/server/dishImage';
import { withTenantApi } from '@/server/tenant';

export const config = {
  api: {
    bodyParser: false,
  },
};

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
    maxFileSize: 20 * 1024 * 1024,
    maxTotalFileSize: 20 * 1024 * 1024,
    filename: (name, ext) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      return `${uniqueSuffix}${ext}`;
    },
  });

  try {
    const [fields, files] = await form.parse(req);
    const file = files.file?.[0];
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const kind = String(fields.kind?.[0] || fields.kind || '');
    const ext = path.extname(file.filepath || file.originalFilename || '').toLowerCase();
    const isDishRaster = kind === 'dish' && !['.svg', '.glb', '.gltf'].includes(ext);

    if (isDishRaster) {
      const processed = await processDishImage(file.filepath);
      try { fs.unlinkSync(file.filepath); } catch { /* ignore */ }
      return res.status(200).json({
        success: true,
        url: processed.url,
        filename: processed.filename,
      });
    }

    const fileName = path.basename(file.filepath);
    return res.status(200).json({
      success: true,
      url: `/api/serve-image?filename=${fileName}`,
      filename: fileName,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Upload failed' });
  }
}

export default withTenantApi(handler);
