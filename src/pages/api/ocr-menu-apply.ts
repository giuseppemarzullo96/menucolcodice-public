import type { NextApiRequest, NextApiResponse } from 'next';
import { isAdminAuthenticated } from '@/server/auth';
import { appendProducts } from '@/server/menuStore';
import { assertOcrAllowed, withTenantApi } from '@/server/tenant';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  if (!isAdminAuthenticated(req)) {
    return res.status(401).json({ message: 'Non autenticato' });
  }

  try {
    assertOcrAllowed();
    const products = Array.isArray(req.body?.products) ? req.body.products : [];
    if (products.length === 0) {
      return res.status(400).json({ message: 'Nessun piatto da importare' });
    }
    const added = appendProducts(products);
    return res.status(200).json({
      message: `Importati ${added.length} piatti`,
      added,
    });
  } catch (error) {
    console.error('OCR apply error:', error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'Errore nel salvataggio',
    });
  }
}

export default withTenantApi(handler);
