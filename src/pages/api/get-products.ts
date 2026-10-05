import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { tenantDataDir, withTenantApi } from '@/server/tenant';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Imposta header per evitare cache
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Invalida la cache del modulo se esiste
    try {
      const dishesModulePath = require.resolve('../../../database/index');
      if (require.cache[dishesModulePath]) {
        delete require.cache[dishesModulePath];
      }
    } catch (e) {
      // Il modulo potrebbe non essere ancora caricato, va bene
    }

    // Leggi menu/products.ts direttamente (nuova struttura)
    const productsPath = path.join(tenantDataDir(), 'menu', 'products.ts');
    
    if (!fs.existsSync(productsPath)) {
      return res.status(500).json({ message: 'File database/menu/products.ts non trovato' });
    }

    const tsContent = fs.readFileSync(productsPath, 'utf8');

    // Trasformazione minimale TS -> JS
    const jsContent = tsContent
      .replace(/^[ \t]*import[^;]+;\s*\n/gm, '')
      .replace(/export\s+const\s+menuProducts\s*[:=]\s*/, 'exports.menuProducts = ')
      .replace(/PriceNameType\.([A-Z_]+)/g, '"$1"');

    const sandbox: any = { exports: {} };
    vm.createContext(sandbox);
    vm.runInContext(jsContent, sandbox, { filename: 'products.ts' });

    const menuProducts = sandbox.exports.menuProducts || [];
    
    // Converti i prodotti nel formato atteso dall'API
    const allProducts = menuProducts.map((item: any) => ({
      id: item.id,
      name: item.name || '',
      category: item.category || '',
      ingredients: item.ingredients || '',
      description: item.description || '',
      price: item.prices?.[0]?.price || 0,
      imageUrl: item.imageUrl || '',
      mediaType: item.mediaType === 'model3d' ? 'model3d' : 'image',
      bestSeller: item.bestSeller || false,
      allergens: item.allergens || [],
    }));

    res.status(200).json(allProducts);
  } catch (error) {
    console.error('Errore nel leggere i prodotti:', error);
    res.status(500).json({ message: 'Errore nel leggere i prodotti', error: String(error) });
  }
}

export default withTenantApi(handler);
