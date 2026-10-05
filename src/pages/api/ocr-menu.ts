import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import { isAdminAuthenticated } from '@/server/auth';
import { parseMenuImages } from '@/server/visionOcr';
import { assertOcrScanQuota, PlanLimitError, withTenantApi } from '@/server/tenant';

export const config = {
  api: {
    bodyParser: false,
  },
};

function fileToDataUrl(file: formidable.File) {
  const mime = file.mimetype || 'image/jpeg';
  const b64 = fs.readFileSync(file.filepath).toString('base64');
  return `data:${mime};base64,${b64}`;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  if (!isAdminAuthenticated(req)) {
    return res.status(401).json({ message: 'Non autenticato' });
  }
  try {
    assertOcrScanQuota(1);
  } catch (error) {
    return res.status(403).json({ message: error instanceof Error ? error.message : 'Piano non sufficiente' });
  }

  const form = formidable({
    multiples: true,
    maxFileSize: 8 * 1024 * 1024,
    maxTotalFileSize: 32 * 1024 * 1024,
    keepExtensions: true,
  });

  try {
    const [, files] = await form.parse(req);
    const uploaded = ([] as formidable.File[])
      .concat((files.file as formidable.File[]) || [])
      .concat((files.files as formidable.File[]) || [])
      .filter(Boolean);

    if (uploaded.length === 0) {
      return res.status(400).json({ message: 'Carica almeno una foto del menu' });
    }

    try {
      assertOcrScanQuota(uploaded.length);
    } catch (error) {
      uploaded.forEach((file) => {
        try {
          fs.unlinkSync(file.filepath);
        } catch {
          /* ignore */
        }
      });
      return res.status(403).json({
        message: error instanceof PlanLimitError || error instanceof Error ? error.message : 'Limite scansioni',
      });
    }

    const images = uploaded.map((file) => fileToDataUrl(file));
    uploaded.forEach((file) => {
      try {
        fs.unlinkSync(file.filepath);
      } catch {
        /* ignore */
      }
    });

    const products = await parseMenuImages(images);
    return res.status(200).json({
      products,
      count: products.length,
    });
  } catch (error) {
    console.error('OCR menu error:', error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'Errore nel riconoscimento',
    });
  }
}

export default withTenantApi(handler);
