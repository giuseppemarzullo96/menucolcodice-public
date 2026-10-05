import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, { File } from 'formidable';
import fs from 'fs';
import path from 'path';
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
  
  // Ensure upload directory exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const form = formidable({
    uploadDir,
    keepExtensions: true,
    maxFileSize: 50 * 1024 * 1024, // 50MB max per video
    filename: (name, ext, part, form) => {
      // Generate unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      return `${uniqueSuffix}${ext}`;
    },
  });

  try {
    const [fields, files] = await form.parse(req);
    
    const file = files.file?.[0];
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Verifica che sia un video
    const allowedMimeTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (!file.mimetype || !allowedMimeTypes.includes(file.mimetype)) {
      return res.status(400).json({ error: 'File must be a video (mp4, webm, ogg, mov)' });
    }

    // Get the relative path for the URL
    const fileName = path.basename(file.filepath);
    const fileUrl = `/uploads/${fileName}`;

    return res.status(200).json({
      success: true,
      url: fileUrl,
      filename: fileName,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Upload failed' });
  }
}

export default withTenantApi(handler);
