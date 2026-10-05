import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { sanitizeSocial } from '@/utils/socialLinks';
import { tenantDataDir, tenantPublic, withTenantApi } from '@/server/tenant';

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

    // Leggi i file separati e combinali (nuova struttura)
    const readModule = (filePath: string, exportName: string) => {
      if (!fs.existsSync(filePath)) return null;
      try {
        const tsContent = fs.readFileSync(filePath, 'utf8');
        const jsContent = tsContent
          .replace(/^[ \t]*import[^;]+;\s*\n/gm, '')
          .replace(new RegExp(`export\\s+const\\s+${exportName}\\s*[:=]\\s*`), `exports.${exportName} = `)
          .replace(/PriceNameType\.([A-Z_]+)/g, '"$1"')
          .replace(/as\s+"text"\s*\|\s+"image"/g, '');
        const sandbox: any = { exports: {} };
        vm.createContext(sandbox);
        vm.runInContext(jsContent, sandbox, { filename: filePath });
        return sandbox.exports[exportName];
      } catch (e) {
        console.warn(`Errore nel leggere ${filePath}:`, e);
        return null;
      }
    };

    const basePath = tenantDataDir();
    const restaurantInfo = readModule(path.join(basePath, 'restaurant', 'info.ts'), 'restaurantInfo') || {};
    const restaurantContacts = readModule(path.join(basePath, 'restaurant', 'contacts.ts'), 'restaurantContacts') || {};
    const restaurantSocial = sanitizeSocial(readModule(path.join(basePath, 'restaurant', 'social.ts'), 'restaurantSocial') || {});
    const themeLayout = readModule(path.join(basePath, 'theme', 'layout.ts'), 'themeLayout') || {};
    const themeColors = readModule(path.join(basePath, 'theme', 'colors.ts'), 'themeColors') || {};

    // Combina tutto come fa index.ts
    const dishes: any = {
      ...restaurantInfo,
      ...restaurantContacts,
      social: restaurantSocial,
      ...themeLayout,
      themeColors,
      sections: [], // Le sezioni verranno lette separatamente se necessario
    };
    
    // Estrai tutti i dati dall'oggetto dishes
    const restaurantData = {
      name: dishes?.name || "menucolcodice.it",
      description: dishes?.description || "",
      address: dishes?.address || {
        street: "",
        city: "",
        state: "",
        postalCode: "",
      },
      phone: dishes?.phone || "",
      email: dishes?.email || "",
      website: dishes?.website || "",
      openingHours: dishes?.openingHours || "",
      footerText: dishes?.footerText || "",
      social: dishes?.social || {
        facebook: "",
        instagram: "",
        whatsapp: "",
        glovo: "",
        deliveroo: "",
        justeat: "",
      },
      logoType: dishes?.logoType || "text",
      logoUrl: dishes?.logoUrl || "",
      logoWidth: dishes?.logoWidth || 150,
      logoHeight: dishes?.logoHeight || 50,
      faviconUrl: dishes?.faviconUrl || "",
      homeBackgroundUrl: dishes?.homeBackgroundUrl || "",
      homeBackgroundType: dishes?.homeBackgroundType || "image",
      homeBackgroundVideoUrl: dishes?.homeBackgroundVideoUrl || "",
      whatsappButtonColor: dishes?.whatsappButtonColor || "#25D366",
      whatsappIconColor: dishes?.whatsappIconColor || "#ffffff",
      socialButtonColor: dishes?.socialButtonColor || "#6366f1",
      socialIconColor: dishes?.socialIconColor || "#ffffff",
      menuPageTitle: dishes?.menuPageTitle || "",
      pageDescription: dishes?.pageDescription || "",
      menuShareImageUrl: dishes?.menuShareImageUrl || "",
      themeColors: dishes?.themeColors || {
        primary: "#FFB800",
        secondary: "#FF6B00",
        background: "#141414",
        textPrimary: "#ffffff",
        textSecondary: "#d9d9d9",
        tagColor: "#fcbe00",
        layoutBackground: "#000000",
        sidebarBackground: "#ffffff",
        cardBackground: "#1a1a1a",
        buttonBackground: "#303030",
      },
      tenant: tenantPublic(),
    };

    res.status(200).json(restaurantData);
  } catch (error) {
    console.error('Errore nel leggere i dati del ristorante:', error);
    res.status(500).json({ message: 'Errore nel leggere i dati', error: String(error) });
  }
}

export default withTenantApi(handler);
