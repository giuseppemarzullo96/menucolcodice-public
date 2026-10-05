import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { assertCategoryLimit, PlanLimitError, tenantDataDir, withTenantApi } from '@/server/tenant';
import { normalizeCategoryIconId } from '@/constants/categoryIcons';

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
    if (themeColors.card.detailsButtonGlobalBg !== undefined) lines.push(`${indent}  detailsButtonGlobalBg: "${escapeString(themeColors.card.detailsButtonGlobalBg)}",`);
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
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { categories } = req.body;

    console.log('=== SAVE-CATEGORIES DEBUG ===');
    console.log('Categorie ricevute:', JSON.stringify(categories, null, 2));

    if (!categories || !Array.isArray(categories)) {
      throw new Error('Categories non valido: deve essere un array');
    }
    assertCategoryLimit(categories.length);

    // Leggi il file dishes.ts attuale per estrarre i dati esistenti
    const dishesPath = path.join(tenantDataDir(), 'dishes.ts');
    const currentContent = fs.readFileSync(dishesPath, 'utf8');
    
    // Esegui il file per estrarre i dati
    const jsContent = currentContent
      .replace(/^[ \t]*import[^;]+;\s*\n/gm, '')
      .replace(/export\s+const\s+dishes\s*:\s*TRestaurant\s*=\s*/m, 'exports.dishes = ')
      .replace(/PriceNameType\.([A-Z_]+)/g, '"$1"');

    const sandbox: any = { exports: {} };
    vm.createContext(sandbox);
    vm.runInContext(jsContent, sandbox, { filename: 'dishes.ts' });
    const dishes = sandbox.exports.dishes;

    // Estrai i dati del ristorante - PRESERVA ESATTAMENTE i valori esistenti
    // Usa i valori esistenti se presenti, altrimenti usa valori di default solo per campi obbligatori
    // IMPORTANTE: Non sovrascrivere i valori impostati dall'admin (logo, colori, favicon, ecc.)
    const restaurantInfo = {
      name: typeof dishes.name !== 'undefined' ? dishes.name : "menucolcodice.it",
      description: typeof dishes.description !== 'undefined' ? dishes.description : "",
      address: dishes.address || { street: "", city: "", state: "", postalCode: "" },
      phone: typeof dishes.phone !== 'undefined' ? dishes.phone : "",
      email: typeof dishes.email !== 'undefined' ? dishes.email : "",
      website: typeof dishes.website !== 'undefined' ? dishes.website : "",
      menuPageTitle: typeof dishes.menuPageTitle !== 'undefined' ? dishes.menuPageTitle : "",
      openingHours: typeof dishes.openingHours !== 'undefined' ? dishes.openingHours : "",
      footerText: typeof dishes.footerText !== 'undefined' ? dishes.footerText : "",
      social: dishes.social || { facebook: "", instagram: "", whatsapp: "", glovo: "", deliveroo: "", justeat: "" },
      // PRESERVA esattamente i valori di logo, favicon, ecc. anche se stringhe vuote
      logoType: typeof dishes.logoType !== 'undefined' ? dishes.logoType : "text",
      logoUrl: typeof dishes.logoUrl !== 'undefined' ? dishes.logoUrl : "",
      logoWidth: typeof dishes.logoWidth !== 'undefined' ? dishes.logoWidth : 150,
      logoHeight: typeof dishes.logoHeight !== 'undefined' ? dishes.logoHeight : 50,
      faviconUrl: typeof dishes.faviconUrl !== 'undefined' ? dishes.faviconUrl : "",
      homeBackgroundUrl: typeof dishes.homeBackgroundUrl !== 'undefined' ? dishes.homeBackgroundUrl : "",
      whatsappButtonColor: typeof dishes.whatsappButtonColor !== 'undefined' ? dishes.whatsappButtonColor : "#25D366",
      whatsappIconColor: typeof dishes.whatsappIconColor !== 'undefined' ? dishes.whatsappIconColor : "#ffffff",
      iubendaScriptUrl: "",
      iubendaPrivacyPolicyUrl: "",
      iubendaCookiePolicyUrl: "",
      // Preserva TUTTA la struttura gerarchica dei colori, incluso layout
      themeColors: dishes.themeColors ? {
        layout: (dishes.themeColors as any)?.layout,
        navbar: (dishes.themeColors as any)?.navbar,
        sidebar: (dishes.themeColors as any)?.sidebar,
        drawer: (dishes.themeColors as any)?.drawer,
        card: (dishes.themeColors as any)?.card,
        sections: (dishes.themeColors as any)?.sections,
        footer: (dishes.themeColors as any)?.footer,
      } : {},
    };

    // Estrai tutti i prodotti esistenti e i dati delle sezioni (descrizione e order)
    const allProducts: any[] = [];
    const existingSectionData: any = {};
    if (dishes.sections && Array.isArray(dishes.sections)) {
      dishes.sections.forEach((section: any) => {
        // Salva descrizione e order della sezione
        if (section.name) {
          existingSectionData[section.name] = {
            description: section.description || section.name,
            order: section.order !== undefined ? section.order : 999, // Default a 999 se non specificato
          };
        }
        
        if (section.items && Array.isArray(section.items)) {
          section.items.forEach((item: any) => {
          allProducts.push({
            id: item.id,
            name: item.name,
            category: section.name, // Nome categoria attuale
            ingredients: item.ingredients || "",
            description: item.description || "",
            price: item.prices?.[0]?.price || 0,
            imageUrl: item.imageUrl || "",
            mediaType: item.mediaType === 'model3d' ? 'model3d' : 'image',
            bestSeller: item.bestSeller || false,
            allergens: item.allergens || [],
          });
          });
        }
      });
    }

    // IMPORTANTE: I prodotti hanno già il nome corretto della categoria da dishes.ts
    // Non serve mappatura basata su indici perché questo causa problemi quando cambia l'ordine
    // I prodotti mantengono la loro categoria originale (che è già corretta)
    // Solo se una categoria viene esplicitamente rinominata, dobbiamo mappare
    
    // Leggi le categorie esistenti da menuOptions.js SOLO per rilevare rinomine
    // Ma NON usare gli indici per la mappatura!
    const menuOptionsPath = path.join(process.cwd(), 'src', 'utils', 'menuOptions.js');
    const menuOptionsContent = fs.existsSync(menuOptionsPath) ? fs.readFileSync(menuOptionsPath, 'utf8') : '';
    const existingNamesFromMenu = Array.from(menuOptionsContent.matchAll(/name: "([^"]+)"/g)).map(m => m[1]);
    
    // Crea mappatura SOLO per categorie che sono state esplicitamente rinominate
    // Confronta i nomi delle categorie esistenti in dishes.ts con quelle nuove
    const existingCategoryNames = Object.keys(existingSectionData);
    const newCategoryNames = categories.map((c: any) => c.name);
    const nameMapping: { [oldName: string]: string } = {};
    
    // Se una categoria vecchia non esiste più nelle nuove, e c'è una nuova categoria,
    // potrebbe essere stata rinominata. Ma questo è difficile da determinare automaticamente.
    // Per sicurezza, mappiamo solo se c'è una corrispondenza esplicita basata su menuOptions.js
    // MA solo se il nome è effettivamente cambiato E la categoria vecchia esiste ancora in dishes.ts
    
    // In realtà, la soluzione più sicura è: i prodotti hanno già il nome corretto da dishes.ts
    // Se una categoria viene rinominata, i prodotti con il vecchio nome rimarranno nella categoria vecchia
    // finché non vengono esplicitamente spostati. Questo è il comportamento più sicuro.
    
    // I prodotti mantengono la loro categoria originale (già corretta da dishes.ts)
    const updatedProducts = allProducts;

    // Raggruppa i prodotti per categoria (con i nuovi nomi)
    const sections: any = {};
    updatedProducts.forEach((product: any) => {
      if (!sections[product.category]) {
        sections[product.category] = [];
      }
      
      sections[product.category].push({
        id: product.id,
        name: product.name,
        ingredients: product.ingredients || "",
        description: product.description || "",
        prices: [{ name: 'standard', price: product.price }],
        imageUrl: product.imageUrl || "",
        mediaType: product.mediaType === 'model3d' ? 'model3d' : 'image',
        bestSeller: product.bestSeller || false,
        allergens: product.allergens || [],
      });
    });

    // Ordina le sezioni secondo l'ordine delle categorie, preservando l'order esistente
    const orderedSections: any = {};
    categories.forEach((cat: any) => {
      if (sections[cat.name]) {
        orderedSections[cat.name] = sections[cat.name];
        // Se la categoria ha un order nel form, aggiorna existingSectionData
        if (cat.order !== undefined) {
          if (!existingSectionData[cat.name]) {
            existingSectionData[cat.name] = {};
          }
          existingSectionData[cat.name].order = cat.order;
        }
      }
    });
    // Aggiungi eventuali categorie che non sono nelle nuove categorie ma hanno prodotti
    Object.keys(sections).forEach(catName => {
      if (!orderedSections[catName]) {
        orderedSections[catName] = sections[catName];
      }
    });
    
    // Ordina le categorie per order (se esiste) prima di scriverle
    const sortedCategoryNames = Object.keys(orderedSections).sort((a, b) => {
      const orderA = existingSectionData[a]?.order !== undefined ? existingSectionData[a].order : 999;
      const orderB = existingSectionData[b]?.order !== undefined ? existingSectionData[b].order : 999;
      return orderA - orderB;
    });

    // Ricostruisci completamente il file dishes.ts
    let newContent = `import { TRestaurant, PriceNameType } from "@/types/dish";

//*** Mock data ***
export const dishes: TRestaurant = {
  name: "${escapeString(restaurantInfo.name)}",
  description: "${escapeString(restaurantInfo.description)}",
  address: {
    street: "${escapeString(restaurantInfo.address.street)}",
    city: "${escapeString(restaurantInfo.address.city)}",
    state: "${escapeString(restaurantInfo.address.state)}",
    postalCode: "${escapeString(restaurantInfo.address.postalCode)}",
    country: "Italia",
  },
  phone: "${escapeString(restaurantInfo.phone)}",
  email: "${escapeString(restaurantInfo.email)}",
  website: "${escapeString(restaurantInfo.website)}",
  menuPageTitle: "${escapeString(restaurantInfo.menuPageTitle || "")}",
  openingHours: "${escapeString(restaurantInfo.openingHours)}",
  footerText: "${escapeString(restaurantInfo.footerText)}",
  social: {
    facebook: "${escapeString(restaurantInfo.social.facebook)}",
    instagram: "${escapeString(restaurantInfo.social.instagram)}",
    whatsapp: "${escapeString(restaurantInfo.social.whatsapp)}",
    glovo: "${escapeString(restaurantInfo.social.glovo || "")}",
    deliveroo: "${escapeString(restaurantInfo.social.deliveroo || "")}",
    justeat: "${escapeString(restaurantInfo.social.justeat || "")}",
  },
  logoType: "${escapeString(restaurantInfo.logoType)}",
  logoUrl: "${escapeString(restaurantInfo.logoUrl)}",
  logoWidth: ${restaurantInfo.logoWidth},
  logoHeight: ${restaurantInfo.logoHeight},
  faviconUrl: "${escapeString(restaurantInfo.faviconUrl)}",
  homeBackgroundUrl: "${escapeString(restaurantInfo.homeBackgroundUrl)}",
  whatsappButtonColor: "${escapeString(restaurantInfo.whatsappButtonColor)}",
  whatsappIconColor: "${escapeString(restaurantInfo.whatsappIconColor)}",
  iubendaScriptUrl: "${escapeString(restaurantInfo.iubendaScriptUrl)}",
  iubendaPrivacyPolicyUrl: "${escapeString(restaurantInfo.iubendaPrivacyPolicyUrl)}",
  iubendaCookiePolicyUrl: "${escapeString(restaurantInfo.iubendaCookiePolicyUrl)}",
  themeColors: {
${serializeThemeColors(restaurantInfo.themeColors)}
  },
  sections: [
`;

    // Aggiungi ogni sezione nell'ordine corretto
    sortedCategoryNames.forEach((categoryName, index) => {
      const category = categories.find((c: any) => c.name === categoryName) || { name: categoryName };
      // Usa la descrizione dalla categoria se disponibile (anche se è stringa vuota)
      // Altrimenti quella esistente, altrimenti il nome
      // IMPORTANTE: category.description ha priorità su existingSectionData perché viene dal form
      // Se category.description è undefined, usa existingSectionData o categoryName
      // Se category.description è una stringa vuota, usa la stringa vuota
      const sectionDescription = category.description !== undefined 
        ? category.description 
        : (existingSectionData[categoryName]?.description || categoryName);
      // Usa l'order dalla categoria se disponibile, altrimenti quello esistente
      const sectionOrder = category.order !== undefined ? category.order : (existingSectionData[categoryName]?.order !== undefined ? existingSectionData[categoryName].order : undefined);
      
      newContent += `    {
      name: "${escapeString(categoryName)}",
      description: "${escapeString(sectionDescription)}",${sectionOrder !== undefined ? `\n      order: ${sectionOrder},` : ''}
      items: [
`;
      orderedSections[categoryName].forEach((item: any, itemIndex: number) => {
        const allergensArray = item.allergens && Array.isArray(item.allergens) && item.allergens.length > 0
          ? `\n          allergens: [${item.allergens.map((a: string) => `"${escapeString(a)}"`).join(', ')}],`
          : '';
        const mediaTypeStr = item.mediaType === 'model3d' ? ', mediaType: "model3d"' : '';
        newContent += `        {
          id: "${escapeString(String(item.id))}",
          name: "${escapeString(item.name || '')}",
          ingredients: "${escapeString(item.ingredients || '')}",
          description: "${escapeString(item.description || '')}",
          prices: [{ name: PriceNameType.STANDARD, price: ${item.prices?.[0]?.price || 0} }],
          imageUrl: "${escapeString(item.imageUrl || '')}",
          bestSeller: ${item.bestSeller || false}${mediaTypeStr}${allergensArray}
        }${itemIndex < orderedSections[categoryName].length - 1 ? ',' : ''}
`;
      });
      newContent += `      ],
    }${index < sortedCategoryNames.length - 1 ? ',' : ''}
`;
    });

    newContent += `  ],
};
`;

    // Scrivi il file dishes.ts aggiornato
    fs.writeFileSync(dishesPath, newContent, 'utf8');
    
    // Forza il flush del filesystem
    const dishesFd = fs.openSync(dishesPath, 'r+');
    fs.fsyncSync(dishesFd);
    fs.closeSync(dishesFd);

    // Aggiorna menuOptions.js: icona salvata come id stringa del set custom
    // (src/constants/categoryIcons.ts), non più come componente react-icons —
    // questo file non viene mai importato come modulo reale, solo letto via regex.
    let newMenuOptions = `export const menuOptions = [
`;

    categories.forEach((category: any, index: number) => {
      const key = category.name.toLowerCase().replace(/\s+/g, ' ');
      const iconId = normalizeCategoryIconId(category.icon);
      const description = category.description || category.name;

      newMenuOptions += `  {
    key: "${escapeString(key)}",
    icon: "${escapeString(iconId)}",
    label: <a href="#${escapeString(key)}">${escapeString(category.name)}</a>,
    name: "${escapeString(category.name)}",
    description: "${escapeString(description)}",
  }${index < categories.length - 1 ? ',' : ''}
`;
    });

    newMenuOptions += `];
`;

    fs.writeFileSync(menuOptionsPath, newMenuOptions, 'utf8');
    
    // Forza il flush del filesystem anche per menuOptions.js
    const menuOptionsFd = fs.openSync(menuOptionsPath, 'r+');
    fs.fsyncSync(menuOptionsFd);
    fs.closeSync(menuOptionsFd);

    // SCRIVI ANCHE IN menu/sections.ts (nuova struttura)
    const sectionsPath = path.join(tenantDataDir(), 'menu', 'sections.ts');
    
    // Genera il contenuto per menu/sections.ts
    let sectionsContent = `export const menuSections = [
`;
    sortedCategoryNames.forEach((categoryName, index) => {
      const category = categories.find((c: any) => c.name === categoryName) || { name: categoryName };
      const sectionDescription = category.description !== undefined 
        ? category.description 
        : (existingSectionData[categoryName]?.description || categoryName);
      const sectionOrder = category.order !== undefined ? category.order : (existingSectionData[categoryName]?.order !== undefined ? existingSectionData[categoryName].order : undefined);
      
      sectionsContent += `  {
    name: "${escapeString(categoryName)}",
    description: "${escapeString(sectionDescription)}",${sectionOrder !== undefined ? `\n    order: ${sectionOrder},` : ''}
  }${index < sortedCategoryNames.length - 1 ? ',' : ''}
`;
    });
    sectionsContent += `];
`;

    fs.writeFileSync(sectionsPath, sectionsContent, 'utf8');
    const sectionsFd = fs.openSync(sectionsPath, 'r+');
    fs.fsyncSync(sectionsFd);
    fs.closeSync(sectionsFd);

    // SCRIVI ANCHE restaurant/info.ts se ci sono modifiche ai dati del ristorante
    // (save-categories.ts preserva i dati esistenti, quindi non serve scrivere restaurant/theme/legal qui)
    
    console.log('Categorie salvate con successo! File dishes.ts e menu/sections.ts aggiornati.');
    res.status(200).json({ message: 'Categorie salvate! Ricarica la pagina dishes per vedere le modifiche.' });
  } catch (error) {
    console.error('Errore nel salvare le categorie:', error);
    const status = error instanceof PlanLimitError ? 403 : 500;
    res.status(status).json({ message: error instanceof Error ? error.message : 'Errore nel salvare le categorie', error: String(error) });
  }
}

export default withTenantApi(handler);
