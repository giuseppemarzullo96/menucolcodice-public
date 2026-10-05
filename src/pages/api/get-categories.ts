import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { tenantDataDir, withTenantApi } from '@/server/tenant';
import { loadRestaurantData } from '@/utils/dataLoader';
import { normalizeCategoryIconId } from '@/constants/categoryIcons';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Imposta header per evitare cache
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Leggi le categorie da menu/sections.ts (nuova struttura)
    const sectionsPath = path.join(tenantDataDir(), 'menu', 'sections.ts');
    
    if (!fs.existsSync(sectionsPath)) {
      return res.status(500).json({ message: 'File database/menu/sections.ts non trovato' });
    }

    const tsContent = fs.readFileSync(sectionsPath, 'utf8');
    const jsContent = tsContent
      .replace(/^[ \t]*import[^;]+;\s*\n/gm, '')
      .replace(/export\s+const\s+menuSections\s*[:=]\s*/, 'exports.menuSections = ');
    
    const sandbox: any = { exports: {} };
    vm.createContext(sandbox);
    vm.runInContext(jsContent, sandbox, { filename: 'sections.ts' });
    const menuSections = sandbox.exports.menuSections || [];

    const menuPath = path.join(process.cwd(), 'src', 'utils', 'menuOptions.js');
    const menuContent = fs.existsSync(menuPath) ? fs.readFileSync(menuPath, 'utf8') : '';
    const names = Array.from(menuContent.matchAll(/name: "([^"]+)"/g)).map((m) => m[1]);
    const icons = Array.from(menuContent.matchAll(/icon: "([^"]+)"/g)).map((m) => m[1]);
    const iconByName = new Map<string, string>();
    names.forEach((name, index) => iconByName.set(name, icons[index] || ''));

    let sortedCategories = menuSections
      .map((section: any, index: number) => {
        const name = section.name || '';
        const description =
          section.description !== undefined && section.description !== null ? section.description : name;
        return {
          id: index + 1,
          key: String(name).toLowerCase(),
          name,
          description,
          order: section.order !== undefined ? section.order : index + 1,
          icon: normalizeCategoryIconId(section.icon || iconByName.get(name)),
        };
      })
      .sort((a: any, b: any) => {
        const orderA = a.order !== undefined ? a.order : 999;
        const orderB = b.order !== undefined ? b.order : 999;
        return orderA - orderB;
      });

    const hideEmpty =
      req.query.hideEmpty === '1' ||
      req.query.hideEmpty === 'true';
    if (hideEmpty) {
      const { menuProducts } = loadRestaurantData();
      const withItems = new Set(
        (menuProducts || [])
          .map((product: any) => String(product.category || '').trim())
          .filter(Boolean)
      );
      sortedCategories = sortedCategories.filter(
        (category) =>
          withItems.has(category.name) ||
          withItems.has(category.key)
      );
    }
    
    res.status(200).json({ categories: sortedCategories });
  } catch (error) {
    console.error('Errore nel leggere le categorie:', error);
    res.status(500).json({ message: 'Errore', error: String(error) });
  }
}

export default withTenantApi(handler);
