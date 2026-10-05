import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { invalidateCache } from '@/utils/dataLoader';
import { assertModel3dAllowed, assertProductLimit, PlanLimitError, tenantDataDir, withTenantApi } from '@/server/tenant';
import { MCC_MENU_BACKGROUND } from '@/seo/site';

// Funzione per fare escape delle stringhe per il codice TypeScript
function escapeString(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')  // Escape backslash
    .replace(/"/g, '\\"')     // Escape virgolette
    .replace(/\n/g, '\\n')    // Escape newline
    .replace(/\r/g, '\\r')    // Escape carriage return
    .replace(/\t/g, '\\t');   // Escape tab
}

// Funzione per serializzare la struttura gerarchica dei colori
function serializeThemeColors(themeColors: any, indent: string = '    '): string {
  if (!themeColors || typeof themeColors !== 'object') return '{}';
  
  const lines: string[] = [];
  
  // Struttura gerarchica (solo questa)
  if (themeColors.layout) {
    lines.push(`${indent}layout: {`);
    if (themeColors.layout.background !== undefined) lines.push(`${indent}  background: "${escapeString(themeColors.layout.background)}",`);
    if (themeColors.layout.homeButtonColor !== undefined) lines.push(`${indent}  homeButtonColor: "${escapeString(themeColors.layout.homeButtonColor)}",`);
    if (themeColors.layout.homeButtonTextColor !== undefined) lines.push(`${indent}  homeButtonTextColor: "${escapeString(themeColors.layout.homeButtonTextColor)}",`);
    lines.push(`${indent}},`);
  }
  
  if (themeColors.navbar) {
    lines.push(`${indent}navbar: {`);
    if (themeColors.navbar.background !== undefined) lines.push(`${indent}  background: "${escapeString(themeColors.navbar.background)}",`);
    if (themeColors.navbar.logoColor !== undefined) lines.push(`${indent}  logoColor: "${escapeString(themeColors.navbar.logoColor)}",`);
    if (themeColors.navbar.textColor !== undefined) lines.push(`${indent}  textColor: "${escapeString(themeColors.navbar.textColor)}",`);
    if (themeColors.navbar.buttonBackground !== undefined) lines.push(`${indent}  buttonBackground: "${escapeString(themeColors.navbar.buttonBackground)}",`);
    if (themeColors.navbar.buttonText !== undefined) lines.push(`${indent}  buttonText: "${escapeString(themeColors.navbar.buttonText)}",`);
    if (themeColors.navbar.buttonHover !== undefined) lines.push(`${indent}  buttonHover: "${escapeString(themeColors.navbar.buttonHover)}",`);
    if (themeColors.navbar.iconColor !== undefined) lines.push(`${indent}  iconColor: "${escapeString(themeColors.navbar.iconColor)}",`);
    lines.push(`${indent}},`);
  }
  
  if (themeColors.sidebar) {
    lines.push(`${indent}sidebar: {`);
    if (themeColors.sidebar.background !== undefined) lines.push(`${indent}  background: "${escapeString(themeColors.sidebar.background)}",`);
    if (themeColors.sidebar.titleColor !== undefined) lines.push(`${indent}  titleColor: "${escapeString(themeColors.sidebar.titleColor)}",`);
    if (themeColors.sidebar.menuItemBackground !== undefined) lines.push(`${indent}  menuItemBackground: "${escapeString(themeColors.sidebar.menuItemBackground)}",`);
    if (themeColors.sidebar.menuItemColor !== undefined) lines.push(`${indent}  menuItemColor: "${escapeString(themeColors.sidebar.menuItemColor)}",`);
    if (themeColors.sidebar.menuItemActive !== undefined) lines.push(`${indent}  menuItemActive: "${escapeString(themeColors.sidebar.menuItemActive)}",`);
    if (themeColors.sidebar.menuItemHover !== undefined) lines.push(`${indent}  menuItemHover: "${escapeString(themeColors.sidebar.menuItemHover)}",`);
    if (themeColors.sidebar.iconColor !== undefined) lines.push(`${indent}  iconColor: "${escapeString(themeColors.sidebar.iconColor)}",`);
    lines.push(`${indent}},`);
  }
  
  if (themeColors.drawer) {
    lines.push(`${indent}drawer: {`);
    if (themeColors.drawer.background !== undefined) lines.push(`${indent}  background: "${escapeString(themeColors.drawer.background)}",`);
    if (themeColors.drawer.titleColor !== undefined) lines.push(`${indent}  titleColor: "${escapeString(themeColors.drawer.titleColor)}",`);
    if (themeColors.drawer.menuItemColor !== undefined) lines.push(`${indent}  menuItemColor: "${escapeString(themeColors.drawer.menuItemColor)}",`);
    if (themeColors.drawer.footerTextColor !== undefined) lines.push(`${indent}  footerTextColor: "${escapeString(themeColors.drawer.footerTextColor)}",`);
    lines.push(`${indent}},`);
  }
  
  if (themeColors.card) {
    lines.push(`${indent}card: {`);
    if (themeColors.card.backgroundImage !== undefined) lines.push(`${indent}  backgroundImage: "${escapeString(themeColors.card.backgroundImage)}",`);
    if (themeColors.card.backgroundOpacity !== undefined) lines.push(`${indent}  backgroundOpacity: ${themeColors.card.backgroundOpacity},`);
    if (themeColors.card.backgroundColor !== undefined) lines.push(`${indent}  backgroundColor: "${escapeString(themeColors.card.backgroundColor)}",`);
    if (themeColors.card.bestSellerTagColor !== undefined) lines.push(`${indent}  bestSellerTagColor: "${escapeString(themeColors.card.bestSellerTagColor)}",`);
    if (themeColors.card.productNameColor !== undefined) lines.push(`${indent}  productNameColor: "${escapeString(themeColors.card.productNameColor)}",`);
    if (themeColors.card.priceColor !== undefined) lines.push(`${indent}  priceColor: "${escapeString(themeColors.card.priceColor)}",`);
    if (themeColors.card.ingredientsColor !== undefined) lines.push(`${indent}  ingredientsColor: "${escapeString(themeColors.card.ingredientsColor)}",`);
    if (themeColors.card.detailsButtonBackground !== undefined) lines.push(`${indent}  detailsButtonBackground: "${escapeString(themeColors.card.detailsButtonBackground)}",`);
    if (themeColors.card.detailsButtonIcon !== undefined) lines.push(`${indent}  detailsButtonIcon: "${escapeString(themeColors.card.detailsButtonIcon)}",`);
    if (themeColors.card.subtitleColor !== undefined) lines.push(`${indent}  subtitleColor: "${escapeString(themeColors.card.subtitleColor)}",`);
    if (themeColors.card.detailsIngredientsColor !== undefined) lines.push(`${indent}  detailsIngredientsColor: "${escapeString(themeColors.card.detailsIngredientsColor)}",`);
    if (themeColors.card.descriptionTextColor !== undefined) lines.push(`${indent}  descriptionTextColor: "${escapeString(themeColors.card.descriptionTextColor)}",`);
    if (themeColors.card.shadowColor !== undefined) lines.push(`${indent}  shadowColor: "${escapeString(themeColors.card.shadowColor)}",`);
    if (themeColors.card.shadowOpacity !== undefined) lines.push(`${indent}  shadowOpacity: ${themeColors.card.shadowOpacity},`);
    if (themeColors.card.hoverShadowOpacity !== undefined) lines.push(`${indent}  hoverShadowOpacity: ${themeColors.card.hoverShadowOpacity},`);
    if (themeColors.card.borderRadius !== undefined) lines.push(`${indent}  borderRadius: ${themeColors.card.borderRadius},`);
    if (themeColors.card.borderColor !== undefined) lines.push(`${indent}  borderColor: "${escapeString(themeColors.card.borderColor)}",`);
    if (themeColors.card.borderWidth !== undefined) lines.push(`${indent}  borderWidth: ${themeColors.card.borderWidth},`);
    if (themeColors.card.detailsBorderColor !== undefined) lines.push(`${indent}  detailsBorderColor: "${escapeString(themeColors.card.detailsBorderColor)}",`);
    if (themeColors.card.detailsBorderWidth !== undefined) lines.push(`${indent}  detailsBorderWidth: ${themeColors.card.detailsBorderWidth},`);
    if (themeColors.card.allergenTagColor !== undefined) lines.push(`${indent}  allergenTagColor: "${escapeString(themeColors.card.allergenTagColor)}",`);
    if (themeColors.card.allergenTextColor !== undefined) lines.push(`${indent}  allergenTextColor: "${escapeString(themeColors.card.allergenTextColor)}",`);
    if (themeColors.card.viewMode !== undefined) lines.push(`${indent}  viewMode: "${escapeString(themeColors.card.viewMode)}",`);
    lines.push(`${indent}},`);
  }
  
  if (themeColors.sections) {
    lines.push(`${indent}sections: {`);
    if (themeColors.sections.titleColor !== undefined) lines.push(`${indent}  titleColor: "${escapeString(themeColors.sections.titleColor)}",`);
    if (themeColors.sections.descriptionColor !== undefined) lines.push(`${indent}  descriptionColor: "${escapeString(themeColors.sections.descriptionColor)}",`);
    lines.push(`${indent}},`);
  }
  
  if (themeColors.footer) {
    lines.push(`${indent}footer: {`);
    if (themeColors.footer.background !== undefined) lines.push(`${indent}  background: "${escapeString(themeColors.footer.background)}",`);
    if (themeColors.footer.textColor !== undefined) lines.push(`${indent}  textColor: "${escapeString(themeColors.footer.textColor)}",`);
    if (themeColors.footer.linkHoverOpacity !== undefined) lines.push(`${indent}  linkHoverOpacity: ${themeColors.footer.linkHoverOpacity},`);
    lines.push(`${indent}},`);
  }

  if (themeColors.modelViewer) {
    const mv = themeColors.modelViewer;
    lines.push(`${indent}modelViewer: {`);
    if (mv.ambientIntensity !== undefined) lines.push(`${indent}  ambientIntensity: ${mv.ambientIntensity},`);
    if (mv.directional1Position && Array.isArray(mv.directional1Position)) lines.push(`${indent}  directional1Position: [${mv.directional1Position.join(', ')}],`);
    if (mv.directional1Intensity !== undefined) lines.push(`${indent}  directional1Intensity: ${mv.directional1Intensity},`);
    if (mv.directional2Position && Array.isArray(mv.directional2Position)) lines.push(`${indent}  directional2Position: [${mv.directional2Position.join(', ')}],`);
    if (mv.directional2Intensity !== undefined) lines.push(`${indent}  directional2Intensity: ${mv.directional2Intensity},`);
    lines.push(`${indent}},`);
  }

  return lines.join('\n');
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('=== SAVE-PRODUCTS API CHIAMATA ===');
  console.log('Method:', req.method);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { products, restaurantInfo, siteInfo } = req.body;
    
    // Debug: log completo del body ricevuto
    console.log('=== SAVE-PRODUCTS REQUEST BODY ===');
    console.log('restaurantInfo completo:', JSON.stringify(restaurantInfo, null, 2));
    console.log('restaurantInfo.menuPageTitle:', restaurantInfo?.menuPageTitle);
    
    console.log('Products count:', products?.length);
    console.log('Restaurant info:', restaurantInfo?.name);
    console.log('Site info:', siteInfo);

    if (Array.isArray(products)) {
      assertProductLimit(products.length);
      if (products.some((p: any) => p.mediaType === 'model3d')) {
        assertModel3dAllowed();
      }
    }

    // LEGGI I DATI ESISTENTI DAL FILE PER PRESERVARE I COLORI
    const dishesPath = path.join(tenantDataDir(), 'dishes.ts');
    let existingThemeColors: any = {};
    let existingMenuPageTitle = "";
    let dishes: any = null;
    
    if (fs.existsSync(dishesPath)) {
      try {
        const tsContent = fs.readFileSync(dishesPath, 'utf8');
        const jsContent = tsContent
          .replace(/^[ \t]*import[^;]+;\s*\n/gm, '')
          .replace(/export\s+const\s+dishes\s*:\s*TRestaurant\s*=\s*/m, 'exports.dishes = ')
          .replace(/PriceNameType\.([A-Z_]+)/g, '"$1"');
        
        const sandbox: any = { exports: {} };
        vm.createContext(sandbox);
        vm.runInContext(jsContent, sandbox, { filename: 'dishes.ts' });
        
        dishes = sandbox.exports.dishes;
        existingThemeColors = dishes?.themeColors || {};
        existingMenuPageTitle = dishes?.menuPageTitle || "";
      } catch (e) {
        console.warn('Errore nel leggere i dati esistenti:', e);
      }
    }

    // Usa restaurantInfo come sorgente primaria, poi siteInfo come fallback
    const phone = restaurantInfo?.phone || siteInfo?.phone || "";
    const email = restaurantInfo?.email || siteInfo?.email || "";
    const website = restaurantInfo?.website || siteInfo?.website || "";
    const footerText = restaurantInfo?.footerText || siteInfo?.footerText || "";
    const openingHours = restaurantInfo?.openingHours || siteInfo?.openingHours || "";
    const facebook = restaurantInfo?.social?.facebook || siteInfo?.facebook || "";
    const instagram = restaurantInfo?.social?.instagram || siteInfo?.instagram || "";
    const whatsapp = restaurantInfo?.social?.whatsapp || siteInfo?.whatsapp || "";
    const glovo = restaurantInfo?.social?.glovo || siteInfo?.glovo || "";
    const deliveroo = restaurantInfo?.social?.deliveroo || siteInfo?.deliveroo || "";
    const justeat = restaurantInfo?.social?.justeat || siteInfo?.justeat || "";
    
    // Logo fields
    const logoType = restaurantInfo?.logoType || "text";
    const logoUrl = restaurantInfo?.logoUrl || "";
    const logoWidth = restaurantInfo?.logoWidth || 150;
    const logoHeight = restaurantInfo?.logoHeight || 50;
    const faviconUrl = restaurantInfo?.faviconUrl || "";
    const homeBackgroundUrl = restaurantInfo?.homeBackgroundUrl || MCC_MENU_BACKGROUND;
    const homeBackgroundType = restaurantInfo?.homeBackgroundType || "image";
    const homeBackgroundVideoUrl = restaurantInfo?.homeBackgroundVideoUrl || "";
    const whatsappButtonColor = restaurantInfo?.whatsappButtonColor || "#25D366";
    const whatsappIconColor = restaurantInfo?.whatsappIconColor || "#ffffff";
    const socialButtonColor = restaurantInfo?.socialButtonColor || "#6366f1";
    const socialIconColor = restaurantInfo?.socialIconColor || "#ffffff";
    const iubendaScriptUrl = "";
    const iubendaPrivacyPolicyUrl = "";
    const iubendaCookiePolicyUrl = "";
    
    // MERGE dei themeColors: preserva quelli esistenti e aggiorna solo quelli nuovi dal form
    const newThemeColors = restaurantInfo?.themeColors || {};
    const themeColors = {
      ...existingThemeColors,
      ...newThemeColors,
      // Merge profondo per ogni sezione
      layout: { ...existingThemeColors?.layout, ...newThemeColors?.layout },
      navbar: { ...existingThemeColors?.navbar, ...newThemeColors?.navbar },
      sidebar: { ...existingThemeColors?.sidebar, ...newThemeColors?.sidebar },
      drawer: { ...existingThemeColors?.drawer, ...newThemeColors?.drawer },
      card: { ...existingThemeColors?.card, ...newThemeColors?.card },
      sections: { ...existingThemeColors?.sections, ...newThemeColors?.sections },
      footer: { ...existingThemeColors?.footer, ...newThemeColors?.footer },
    };
    
    // Usa menuPageTitle dal form se presente (anche se vuoto, per permettere di cancellare)
    // Se restaurantInfo.menuPageTitle è undefined, usa existingMenuPageTitle
    // Altrimenti usa il valore dal form (anche se è stringa vuota)
    const menuPageTitle = restaurantInfo?.menuPageTitle !== undefined 
      ? (restaurantInfo.menuPageTitle || "") 
      : (existingMenuPageTitle || "");
    
    // Debug: log per verificare il valore salvato
    console.log('save-products - restaurantInfo.menuPageTitle:', restaurantInfo?.menuPageTitle);
    console.log('save-products - restaurantInfo.menuPageTitle type:', typeof restaurantInfo?.menuPageTitle);
    console.log('save-products - existingMenuPageTitle:', existingMenuPageTitle);
    console.log('save-products - final menuPageTitle:', menuPageTitle);

    // Estrai le descrizioni e gli ordini esistenti dalle sezioni
    const existingSectionData: any = {};
    if (dishes?.sections && Array.isArray(dishes.sections)) {
      dishes.sections.forEach((section: any) => {
        if (section.name) {
          existingSectionData[section.name] = {
            description: section.description || section.name,
            order: section.order !== undefined ? section.order : 999, // Default a 999 se non specificato
          };
        }
      });
    }

    // Verifica e correggi ID duplicati
    const seenIds = new Set<string>();
    const idMap = new Map<string, number>();
    let maxId = -1;
    
    // Prima passata: trova il max ID e identifica duplicati
    products.forEach((product: any) => {
      const idNum = parseInt(product.id, 10);
      if (!isNaN(idNum) && idNum > maxId) {
        maxId = idNum;
      }
      if (seenIds.has(product.id)) {
        // ID duplicato trovato, assegna un nuovo ID
        maxId++;
        idMap.set(product.id, maxId);
        console.warn(`ID duplicato trovato: ${product.id}, assegnato nuovo ID: ${maxId}`);
      } else {
        seenIds.add(product.id);
      }
    });
    
    // Raggruppa i prodotti per categoria
    const sections: any = {};
    products.forEach((product: any) => {
      if (!sections[product.category]) {
        sections[product.category] = [];
      }
      
      // Usa l'ID corretto (corretto se duplicato)
      const productId = idMap.has(product.id) ? String(idMap.get(product.id)) : product.id;
      
      // Normalizza imageUrl: assicurati che sia sempre una stringa
      let imageUrl = product.imageUrl;
      if (typeof imageUrl !== 'string') {
        console.warn('imageUrl non è una stringa, conversione:', imageUrl);
        imageUrl = imageUrl?.url || imageUrl?.response?.url || '';
      }
      
      const mediaType = product.mediaType === 'model3d' ? 'model3d' : 'image';
      sections[product.category].push({
        id: productId,
        name: product.name,
        ingredients: product.ingredients,
        description: product.description,
        prices: [{ name: 'standard', price: product.price }],
        imageUrl: imageUrl,
        mediaType,
        bestSeller: product.bestSeller || false,
        allergens: product.allergens || [],
        cardBackground: product.cardBackground || undefined,
        cardBackgroundOpacity: product.cardBackgroundOpacity !== undefined ? product.cardBackgroundOpacity : undefined,
      });
    });

    // IMPORTANTE: Preserva anche le categorie senza prodotti (con descrizione e ordine)
    // Aggiungi tutte le categorie esistenti che non hanno prodotti
    if (dishes?.sections && Array.isArray(dishes.sections)) {
      dishes.sections.forEach((section: any) => {
        if (section.name && !sections[section.name]) {
          // Categoria senza prodotti: preservala con descrizione e ordine
          sections[section.name] = [];
          // existingSectionData è già stato popolato sopra, quindi la descrizione e l'ordine sono già salvati
        }
      });
    }

    // Crea il nuovo contenuto del file
    let newContent = `import { TRestaurant, PriceNameType } from "@/types/dish";

//*** Mock data ***
export const dishes: TRestaurant = {
  name: "${escapeString(restaurantInfo.name || '')}",
  description: "${escapeString(restaurantInfo.description || '')}",
  address: {
    street: "${escapeString(restaurantInfo.address?.street || '')}",
    city: "${escapeString(restaurantInfo.address?.city || '')}",
    state: "${escapeString(restaurantInfo.address?.state || '')}",
    postalCode: "${escapeString(restaurantInfo.address?.postalCode || '')}",
    country: "Italia",
  },
  phone: "${escapeString(phone)}",
  email: "${escapeString(email)}",
  website: "${escapeString(website)}",
  menuPageTitle: "${escapeString(menuPageTitle)}",
  openingHours: "${escapeString(openingHours)}",
  footerText: "${escapeString(footerText)}",
  social: {
    facebook: "${escapeString(facebook)}",
    instagram: "${escapeString(instagram)}",
    whatsapp: "${escapeString(whatsapp)}",
    glovo: "${escapeString(glovo)}",
    deliveroo: "${escapeString(deliveroo)}",
    justeat: "${escapeString(justeat)}",
  },
  logoType: "${escapeString(logoType)}",
  logoUrl: "${escapeString(logoUrl)}",
  logoWidth: ${logoWidth},
  logoHeight: ${logoHeight},
  faviconUrl: "${escapeString(faviconUrl)}",
  homeBackgroundUrl: "${escapeString(homeBackgroundUrl)}",
  homeBackgroundType: "${escapeString(homeBackgroundType)}",
  homeBackgroundVideoUrl: "${escapeString(homeBackgroundVideoUrl)}",
  whatsappButtonColor: "${escapeString(whatsappButtonColor)}",
  whatsappIconColor: "${escapeString(whatsappIconColor)}",
  socialButtonColor: "${escapeString(socialButtonColor)}",
  socialIconColor: "${escapeString(socialIconColor)}",
  iubendaScriptUrl: "${escapeString(iubendaScriptUrl)}",
  iubendaPrivacyPolicyUrl: "${escapeString(iubendaPrivacyPolicyUrl)}",
  iubendaCookiePolicyUrl: "${escapeString(iubendaCookiePolicyUrl)}",
  themeColors: {
${serializeThemeColors(themeColors)}
  },
  sections: [
`;

    // Ordina le categorie per order (se esiste) prima di scriverle
    const sortedCategoryNames = Object.keys(sections).sort((a, b) => {
      const orderA = existingSectionData[a]?.order !== undefined ? existingSectionData[a].order : 999;
      const orderB = existingSectionData[b]?.order !== undefined ? existingSectionData[b].order : 999;
      return orderA - orderB;
    });

    // Aggiungi ogni sezione nell'ordine corretto
    sortedCategoryNames.forEach((categoryName, index) => {
      // Usa la descrizione esistente se disponibile, altrimenti il nome della categoria
      const sectionDescription = existingSectionData[categoryName]?.description || categoryName;
      const sectionOrder = existingSectionData[categoryName]?.order !== undefined ? existingSectionData[categoryName].order : undefined;
      
      newContent += `    {
      name: "${escapeString(categoryName)}",
      description: "${escapeString(sectionDescription)}",${sectionOrder !== undefined ? `\n      order: ${sectionOrder},` : ''}
      items: [
`;
      sections[categoryName].forEach((item: any, itemIndex: number) => {
        const cardBackground = item.cardBackground ? `cardBackground: "${escapeString(item.cardBackground)}",` : '';
        const cardBackgroundOpacity = item.cardBackgroundOpacity !== undefined ? `cardBackgroundOpacity: ${item.cardBackgroundOpacity},` : '';
        const allergensArray = item.allergens && Array.isArray(item.allergens) && item.allergens.length > 0
          ? `allergens: [${item.allergens.map((a: string) => `"${escapeString(a)}"`).join(', ')}],`
          : '';
        const mediaTypeStr = item.mediaType === 'model3d' ? ', mediaType: "model3d"' : '';
        newContent += `        {
          id: "${escapeString(String(item.id))}",
          name: "${escapeString(item.name || '')}",
          ingredients: "${escapeString(item.ingredients || '')}",
          description: "${escapeString(item.description || '')}",
          prices: [{ name: PriceNameType.STANDARD, price: ${item.prices?.[0]?.price || 0} }],
          imageUrl: "${escapeString(item.imageUrl || '')}",
          bestSeller: ${item.bestSeller || false}${mediaTypeStr}${allergensArray ? ',\n          ' + allergensArray : ''}${cardBackground ? '\n          ' + cardBackground : ''}${cardBackgroundOpacity ? '\n          ' + cardBackgroundOpacity : ''}
        }${itemIndex < sections[categoryName].length - 1 ? ',' : ''}
`;
      });
      newContent += `      ],
    }${index < Object.keys(sections).length - 1 ? ',' : ''}
`;
    });

    newContent += `  ],
};
`;

    // Scrivi il nuovo file (dishesPath già dichiarato sopra) - per retrocompatibilità
    fs.writeFileSync(dishesPath, newContent, 'utf8');
    
    // Forza il flush del filesystem per assicurarsi che il file sia scritto
    const fd = fs.openSync(dishesPath, 'r+');
    fs.fsyncSync(fd);
    fs.closeSync(fd);

    // SCRIVI ANCHE IN menu/products.ts (nuova struttura)
    const productsPath = path.join(tenantDataDir(), 'menu', 'products.ts');
    
    // Converti i prodotti in formato array con campo category
    const productsArray: any[] = [];
    sortedCategoryNames.forEach((categoryName) => {
      sections[categoryName].forEach((item: any) => {
        const product: any = {
          id: String(item.id),
          name: item.name || '',
          category: categoryName,
          ingredients: item.ingredients || '',
          description: item.description || '',
          prices: [{ name: 'STANDARD', price: item.prices?.[0]?.price || 0 }],
          imageUrl: item.imageUrl || '',
          mediaType: item.mediaType === 'model3d' ? 'model3d' : 'image',
          bestSeller: item.bestSeller || false,
        };
        if (item.allergens && Array.isArray(item.allergens) && item.allergens.length > 0) {
          product.allergens = item.allergens;
        }
        productsArray.push(product);
      });
    });

    // Genera il contenuto per menu/products.ts
    let productsContent = `import { PriceNameType } from "@/types/dish";

export const menuProducts = [
`;
    productsArray.forEach((product, index) => {
      const allergensStr = product.allergens && product.allergens.length > 0
        ? `, allergens: [${product.allergens.map((a: string) => `"${escapeString(a)}"`).join(', ')}]`
        : '';
      const mediaTypeStr = product.mediaType === 'model3d' ? ', mediaType: "model3d"' : '';
      productsContent += `  { id: "${escapeString(product.id)}", name: "${escapeString(product.name)}", category: "${escapeString(product.category)}", ingredients: "${escapeString(product.ingredients)}", description: "${escapeString(product.description)}", prices: [{ name: PriceNameType.STANDARD, price: ${product.prices[0].price} }], imageUrl: "${escapeString(product.imageUrl)}", bestSeller: ${product.bestSeller}${mediaTypeStr}${allergensStr} }${index < productsArray.length - 1 ? ',' : ''}
`;
    });
    productsContent += `];
`;

    fs.writeFileSync(productsPath, productsContent, 'utf8');
    const productsFd = fs.openSync(productsPath, 'r+');
    fs.fsyncSync(productsFd);
    fs.closeSync(productsFd);

    // SCRIVI ANCHE NEI FILE SEPARATI (nuova struttura)
    // Leggi i dati esistenti dai file separati per preservare valori non modificati
    let existingRestaurantInfo: any = {};
    let existingRestaurantContacts: any = {};
    let existingRestaurantSocial: any = {};
    let existingThemeLayout: any = {};
    let existingThemeColorsFromFiles: any = {};
    let existingIubendaConfig: any = {};

    // Prova a leggere dai file separati
    try {
      const infoPath = path.join(tenantDataDir(), 'restaurant', 'info.ts');
      if (fs.existsSync(infoPath)) {
        const infoContent = fs.readFileSync(infoPath, 'utf8');
        const infoJs = infoContent.replace(/^[ \t]*export[^=]+=\s*/m, 'exports.restaurantInfo = ').replace(/^[ \t]*import[^;]+;\s*\n/gm, '');
        const infoSandbox: any = { exports: {} };
        vm.createContext(infoSandbox);
        vm.runInContext(infoJs, infoSandbox, { filename: 'info.ts' });
        existingRestaurantInfo = infoSandbox.exports.restaurantInfo || {};
      }
    } catch (e) {
      console.warn('Errore nel leggere restaurant/info.ts:', e);
    }

    try {
      const iubendaPath = path.join(tenantDataDir(), 'legal', 'iubenda.ts');
      if (fs.existsSync(iubendaPath)) {
        const iubendaContent = fs.readFileSync(iubendaPath, 'utf8');
        const iubendaJs = iubendaContent
          .replace(/^[ \t]*export[^=]+=\s*/m, 'exports.iubendaConfig = ')
          .replace(/^[ \t]*import[^;]+;\s*\n/gm, '');
        const iubendaSandbox: any = { exports: {} };
        vm.createContext(iubendaSandbox);
        vm.runInContext(iubendaJs, iubendaSandbox, { filename: 'iubenda.ts' });
        existingIubendaConfig = iubendaSandbox.exports.iubendaConfig || {};
      }
    } catch (e) {
      console.warn('Errore nel leggere legal/iubenda.ts:', e);
    }

    // Usa i dati da dishes come fallback se i file separati non esistono
    if (dishes) {
      if (!existingRestaurantInfo.name) existingRestaurantInfo = {
        name: dishes.name || restaurantInfo.name || '',
        description: dishes.description || restaurantInfo.description || '',
        address: dishes.address || restaurantInfo.address || { street: '', city: '', state: '', postalCode: '', country: 'Italia' },
        menuPageTitle: dishes.menuPageTitle || menuPageTitle || '',
        openingHours: dishes.openingHours || openingHours || '',
        footerText: dishes.footerText || footerText || '',
      };
      if (!existingRestaurantContacts.phone) existingRestaurantContacts = {
        phone: phone || '',
        email: email || '',
        website: website || '',
      };
      if (!existingRestaurantSocial.facebook) existingRestaurantSocial = {
        facebook: facebook || '',
        instagram: instagram || '',
        whatsapp: whatsapp || '',
        glovo: glovo || '',
        deliveroo: deliveroo || '',
        justeat: justeat || '',
      };
      if (!existingThemeLayout.logoType) existingThemeLayout = {
        logoType: logoType || 'text',
        logoUrl: logoUrl || '',
        logoWidth: logoWidth || 150,
        logoHeight: logoHeight || 50,
        faviconUrl: faviconUrl || '',
        homeBackgroundUrl: homeBackgroundUrl || '',
        homeBackgroundType: homeBackgroundType || 'image',
        homeBackgroundVideoUrl: homeBackgroundVideoUrl || '',
        whatsappButtonColor: whatsappButtonColor || '#25D366',
        whatsappIconColor: whatsappIconColor || '#ffffff',
        socialButtonColor: socialButtonColor || '#6366f1',
        socialIconColor: socialIconColor || '#ffffff',
      };
      if (!existingThemeColorsFromFiles.layout) existingThemeColorsFromFiles = themeColors;
      if (!existingIubendaConfig.scriptUrl && (iubendaScriptUrl !== undefined || iubendaPrivacyPolicyUrl !== undefined || iubendaCookiePolicyUrl !== undefined)) {
        existingIubendaConfig = {
          scriptUrl: iubendaScriptUrl ?? '',
          privacyPolicyUrl: iubendaPrivacyPolicyUrl ?? '',
          cookiePolicyUrl: iubendaCookiePolicyUrl ?? '',
        };
      }
    }

    // Merge con i nuovi dati da restaurantInfo
    const finalRestaurantInfo = {
      name: restaurantInfo?.name !== undefined ? restaurantInfo.name : existingRestaurantInfo.name || '',
      description: restaurantInfo?.description !== undefined ? restaurantInfo.description : existingRestaurantInfo.description || '',
      address: restaurantInfo?.address || existingRestaurantInfo.address || { street: '', city: '', state: '', postalCode: '', country: 'Italia' },
      menuPageTitle: menuPageTitle || existingRestaurantInfo.menuPageTitle || '',
      pageDescription: restaurantInfo?.pageDescription !== undefined ? restaurantInfo.pageDescription : (existingRestaurantInfo.pageDescription ?? ''),
      menuShareImageUrl: restaurantInfo?.menuShareImageUrl !== undefined ? restaurantInfo.menuShareImageUrl : (existingRestaurantInfo.menuShareImageUrl ?? ''),
      openingHours: openingHours || existingRestaurantInfo.openingHours || '',
      footerText: footerText || existingRestaurantInfo.footerText || '',
    };

    const finalRestaurantContacts = {
      phone: phone || existingRestaurantContacts.phone || '',
      email: email || existingRestaurantContacts.email || '',
      website: website || existingRestaurantContacts.website || '',
    };

    const finalRestaurantSocial = {
      facebook: facebook || existingRestaurantSocial.facebook || '',
      instagram: instagram || existingRestaurantSocial.instagram || '',
      whatsapp: whatsapp || existingRestaurantSocial.whatsapp || '',
      glovo: glovo || existingRestaurantSocial.glovo || '',
      deliveroo: deliveroo || existingRestaurantSocial.deliveroo || '',
      justeat: justeat || existingRestaurantSocial.justeat || '',
    };

    const finalThemeLayout = {
      logoType: logoType || existingThemeLayout.logoType || 'text',
      logoUrl: logoUrl !== undefined ? logoUrl : (existingThemeLayout.logoUrl || ''),
      logoWidth: logoWidth || existingThemeLayout.logoWidth || 150,
      logoHeight: logoHeight || existingThemeLayout.logoHeight || 50,
      faviconUrl: faviconUrl !== undefined ? faviconUrl : (existingThemeLayout.faviconUrl || ''),
      homeBackgroundUrl: homeBackgroundUrl !== undefined ? homeBackgroundUrl : (existingThemeLayout.homeBackgroundUrl || ''),
      homeBackgroundType: homeBackgroundType !== undefined ? homeBackgroundType : (existingThemeLayout.homeBackgroundType || 'image'),
      homeBackgroundVideoUrl: homeBackgroundVideoUrl !== undefined ? homeBackgroundVideoUrl : (existingThemeLayout.homeBackgroundVideoUrl || ''),
      whatsappButtonColor: whatsappButtonColor || existingThemeLayout.whatsappButtonColor || '#25D366',
      whatsappIconColor: whatsappIconColor || existingThemeLayout.whatsappIconColor || '#ffffff',
      socialButtonColor: socialButtonColor || existingThemeLayout.socialButtonColor || '#6366f1',
      socialIconColor: socialIconColor || existingThemeLayout.socialIconColor || '#ffffff',
    };

    const finalIubendaConfig = {
      scriptUrl: '',
      privacyPolicyUrl: '',
      cookiePolicyUrl: '',
    };

    // Scrivi restaurant/info.ts
    const infoPath = path.join(tenantDataDir(), 'restaurant', 'info.ts');
    const infoContent = `export const restaurantInfo = {
  name: "${escapeString(finalRestaurantInfo.name)}",
  description: "${escapeString(finalRestaurantInfo.description)}",
  address: {
    street: "${escapeString(finalRestaurantInfo.address.street)}",
    city: "${escapeString(finalRestaurantInfo.address.city)}",
    state: "${escapeString(finalRestaurantInfo.address.state)}",
    postalCode: "${escapeString(finalRestaurantInfo.address.postalCode)}",
    country: "Italia",
  },
  menuPageTitle: "${escapeString(finalRestaurantInfo.menuPageTitle)}",
  pageDescription: "${escapeString(finalRestaurantInfo.pageDescription)}",
  menuShareImageUrl: "${escapeString(finalRestaurantInfo.menuShareImageUrl)}",
  openingHours: "${escapeString(finalRestaurantInfo.openingHours)}",
  footerText: "${escapeString(finalRestaurantInfo.footerText)}",
};
`;
    fs.writeFileSync(infoPath, infoContent, 'utf8');

    // Scrivi restaurant/contacts.ts
    const contactsPath = path.join(tenantDataDir(), 'restaurant', 'contacts.ts');
    const contactsContent = `export const restaurantContacts = {
  phone: "${escapeString(finalRestaurantContacts.phone)}",
  email: "${escapeString(finalRestaurantContacts.email)}",
  website: "${escapeString(finalRestaurantContacts.website)}",
};
`;
    fs.writeFileSync(contactsPath, contactsContent, 'utf8');

    // Scrivi restaurant/social.ts
    const socialPath = path.join(tenantDataDir(), 'restaurant', 'social.ts');
    const socialContent = `export const restaurantSocial = {
  facebook: "${escapeString(finalRestaurantSocial.facebook)}",
  instagram: "${escapeString(finalRestaurantSocial.instagram)}",
  whatsapp: "${escapeString(finalRestaurantSocial.whatsapp)}",
  glovo: "${escapeString(finalRestaurantSocial.glovo)}",
  deliveroo: "${escapeString(finalRestaurantSocial.deliveroo)}",
  justeat: "${escapeString(finalRestaurantSocial.justeat)}",
};
`;
    fs.writeFileSync(socialPath, socialContent, 'utf8');

    // Scrivi theme/layout.ts
    const layoutPath = path.join(tenantDataDir(), 'theme', 'layout.ts');
    const layoutContent = `export const themeLayout = {
  logoType: "${escapeString(finalThemeLayout.logoType)}",
  logoUrl: "${escapeString(finalThemeLayout.logoUrl)}",
  logoWidth: ${finalThemeLayout.logoWidth},
  logoHeight: ${finalThemeLayout.logoHeight},
  faviconUrl: "${escapeString(finalThemeLayout.faviconUrl)}",
  homeBackgroundUrl: "${escapeString(finalThemeLayout.homeBackgroundUrl)}",
  homeBackgroundType: "${escapeString(finalThemeLayout.homeBackgroundType || 'image')}",
  homeBackgroundVideoUrl: "${escapeString(finalThemeLayout.homeBackgroundVideoUrl || '')}",
  whatsappButtonColor: "${escapeString(finalThemeLayout.whatsappButtonColor)}",
  whatsappIconColor: "${escapeString(finalThemeLayout.whatsappIconColor)}",
  socialButtonColor: "${escapeString(finalThemeLayout.socialButtonColor)}",
  socialIconColor: "${escapeString(finalThemeLayout.socialIconColor)}",
};
`;
    fs.writeFileSync(layoutPath, layoutContent, 'utf8');

    // Scrivi theme/colors.ts
    const colorsPath = path.join(tenantDataDir(), 'theme', 'colors.ts');
    const colorsContent = `export const themeColors = {
${serializeThemeColors(themeColors, '  ')}
};
`;
    fs.writeFileSync(colorsPath, colorsContent, 'utf8');

    // Scrivi legal/iubenda.ts
    const iubendaPath = path.join(tenantDataDir(), 'legal', 'iubenda.ts');
    const iubendaContent = `export const iubendaConfig = {
  scriptUrl: "${escapeString(finalIubendaConfig.scriptUrl)}",
  privacyPolicyUrl: "${escapeString(finalIubendaConfig.privacyPolicyUrl)}",
  cookiePolicyUrl: "${escapeString(finalIubendaConfig.cookiePolicyUrl)}",
};
`;
    fs.writeFileSync(iubendaPath, iubendaContent, 'utf8');

    // Invalida la cache del dataLoader così home/dishes vedono subito i nuovi dati (sfondo, tema, ecc.)
    invalidateCache(tenantDataDir());

    console.log('File dishes.ts, menu/products.ts e tutti i file separati aggiornati con successo');
    res.status(200).json({ message: 'Prodotti salvati con successo!' });
  } catch (error) {
    console.error('Errore nel salvare i prodotti:', error);
    const status = error instanceof PlanLimitError ? 403 : 500;
    res.status(status).json({ message: error instanceof Error ? error.message : 'Errore nel salvare i prodotti', error: String(error) });
  }
}

export default withTenantApi(handler);
