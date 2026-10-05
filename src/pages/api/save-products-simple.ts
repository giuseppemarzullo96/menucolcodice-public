import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { tenantDataDir, withTenantApi } from '@/server/tenant';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { products, restaurantInfo } = req.body;

    // Leggi il file dishes.ts attuale per preservare tutti i campi
    const dishesPath = path.join(tenantDataDir(), 'dishes.ts');
    const currentContent = fs.readFileSync(dishesPath, 'utf8');
    
    // Estrai tutti i campi grafici esistenti
    const logoTypeMatch = currentContent.match(/logoType: "([^"]*)"/);
    const logoUrlMatch = currentContent.match(/logoUrl: "([^"]*)"/);
    const logoWidthMatch = currentContent.match(/logoWidth: (\d+)/);
    const logoHeightMatch = currentContent.match(/logoHeight: (\d+)/);
    const faviconUrlMatch = currentContent.match(/faviconUrl: "([^"]*)"/);
    const homeBackgroundUrlMatch = currentContent.match(/homeBackgroundUrl: "([^"]*)"/);
    const whatsappButtonColorMatch = currentContent.match(/whatsappButtonColor: "([^"]*)"/);
    const whatsappIconColorMatch = currentContent.match(/whatsappIconColor: "([^"]*)"/);
    const phoneMatch = currentContent.match(/phone: "([^"]*)"/);
    const emailMatch = currentContent.match(/email: "([^"]*)"/);
    const websiteMatch = currentContent.match(/website: "([^"]*)"/);
    const openingHoursMatch = currentContent.match(/openingHours: "([^"]*)"/);
    const footerTextMatch = currentContent.match(/footerText: "([^"]*)"/);
    const facebookMatch = currentContent.match(/facebook: "([^"]*)"/);
    const instagramMatch = currentContent.match(/instagram: "([^"]*)"/);
    const whatsappSocialMatch = currentContent.match(/whatsapp: "([^"]*)"/);
    
    // Estrai i colori del tema
    const themeColorsMatch = currentContent.match(/themeColors: \{([\s\S]+?)\n  \}/);
    let themeColors: any = {};
    if (themeColorsMatch) {
      const themeContent = themeColorsMatch[1];
      const primaryMatch = themeContent.match(/primary: "([^"]*)"/);
      const secondaryMatch = themeContent.match(/secondary: "([^"]*)"/);
      const backgroundMatch = themeContent.match(/background: "([^"]*)"/);
      const textPrimaryMatch = themeContent.match(/textPrimary: "([^"]*)"/);
      const textSecondaryMatch = themeContent.match(/textSecondary: "([^"]*)"/);
      const tagColorMatch = themeContent.match(/tagColor: "([^"]*)"/);
      const layoutBackgroundMatch = themeContent.match(/layoutBackground: "([^"]*)"/);
      const sidebarBackgroundMatch = themeContent.match(/sidebarBackground: "([^"]*)"/);
      const cardBackgroundMatch = themeContent.match(/cardBackground: "([^"]*)"/);
      const buttonBackgroundMatch = themeContent.match(/buttonBackground: "([^"]*)"/);
      
      themeColors = {
        primary: primaryMatch ? primaryMatch[1] : "#fcbe00",
        secondary: secondaryMatch ? secondaryMatch[1] : "#ffffff",
        background: backgroundMatch ? backgroundMatch[1] : "#fcbe01",
        textPrimary: textPrimaryMatch ? textPrimaryMatch[1] : "#ffffff",
        textSecondary: textSecondaryMatch ? textSecondaryMatch[1] : "#ffffff",
        tagColor: tagColorMatch ? tagColorMatch[1] : "#fa0025",
        layoutBackground: layoutBackgroundMatch ? layoutBackgroundMatch[1] : "#401b0f",
        sidebarBackground: sidebarBackgroundMatch ? sidebarBackgroundMatch[1] : "#401b0e",
        cardBackground: cardBackgroundMatch ? cardBackgroundMatch[1] : "#eaa52e",
        buttonBackground: buttonBackgroundMatch ? buttonBackgroundMatch[1] : "#eb7d00",
      };
    }

    // Raggruppa i prodotti per categoria
    const sections: any = {};
    products.forEach((product: any) => {
      if (!sections[product.category]) {
        sections[product.category] = [];
      }
      sections[product.category].push({
        id: product.id,
        name: product.name,
        ingredients: product.ingredients,
        description: product.description,
        prices: [{ name: 'standard', price: product.price }],
        imageUrl: product.imageUrl,
        bestSeller: product.bestSeller || false,
      });
    });

    // Crea il nuovo contenuto del file
    let newContent = `import { TRestaurant, PriceNameType } from "@/types/dish";

//*** Mock data ***
export const dishes: TRestaurant = {
  name: "${restaurantInfo.name}",
  description: "${restaurantInfo.description}",
  address: {
    street: "${restaurantInfo.address.street}",
    city: "${restaurantInfo.address.city}",
    state: "${restaurantInfo.address.state}",
    postalCode: "${restaurantInfo.address.postalCode}",
    country: "Italia",
  },
  phone: "${phoneMatch ? phoneMatch[1] : '+393330000003'}",
  email: "${emailMatch ? emailMatch[1] : 'info@menucolcodice.it'}",
  website: "${websiteMatch ? websiteMatch[1] : 'www.menucolcodice.it'}",
  openingHours: "${openingHoursMatch ? openingHoursMatch[1] : ''}",
  footerText: "${footerTextMatch ? footerTextMatch[1] : ''}",
  social: {
    facebook: "${facebookMatch ? facebookMatch[1] : ''}",
    instagram: "${instagramMatch ? instagramMatch[1] : ''}",
    whatsapp: "${whatsappSocialMatch ? whatsappSocialMatch[1] : ''}",
  },
  logoType: "${logoTypeMatch ? logoTypeMatch[1] : 'image'}",
  logoUrl: "${logoUrlMatch ? logoUrlMatch[1] : ''}",
  logoWidth: ${logoWidthMatch ? logoWidthMatch[1] : 150},
  logoHeight: ${logoHeightMatch ? logoHeightMatch[1] : 50},
  faviconUrl: "${faviconUrlMatch ? faviconUrlMatch[1] : ''}",
  homeBackgroundUrl: "${homeBackgroundUrlMatch ? homeBackgroundUrlMatch[1] : ''}",
  whatsappButtonColor: "${whatsappButtonColorMatch ? whatsappButtonColorMatch[1] : '#25D366'}",
  whatsappIconColor: "${whatsappIconColorMatch ? whatsappIconColorMatch[1] : '#ffffff'}",
  themeColors: {
    primary: "${themeColors.primary}",
    secondary: "${themeColors.secondary}",
    background: "${themeColors.background}",
    textPrimary: "${themeColors.textPrimary}",
    textSecondary: "${themeColors.textSecondary}",
    tagColor: "${themeColors.tagColor}",
    layoutBackground: "${themeColors.layoutBackground}",
    sidebarBackground: "${themeColors.sidebarBackground}",
    cardBackground: "${themeColors.cardBackground}",
    buttonBackground: "${themeColors.buttonBackground}",
  },
  sections: [
`;

    // Aggiungi ogni sezione
    Object.keys(sections).forEach((categoryName, index) => {
      newContent += `    {
      name: "${categoryName}",
      description: "Specialità ${categoryName}",
      items: [
`;
      sections[categoryName].forEach((item: any, itemIndex: number) => {
        newContent += `        {
          id: "${item.id}",
          name: "${item.name}",
          ingredients: "${item.ingredients}",
          description: "${item.description}",
          prices: [{ name: PriceNameType.STANDARD, price: ${item.prices[0].price} }],
          imageUrl: "${item.imageUrl}",
          bestSeller: ${item.bestSeller},
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

    // Scrivi il nuovo file (dishesPath già definito sopra)
    fs.writeFileSync(dishesPath, newContent, 'utf8');
    
    // Crea anche un file JSON per lettura runtime
    delete require.cache[require.resolve('../../../database/dishes')];
    const { dishes: updatedDishes } = require('../../../database/dishes');
    const dishesJsonPath = path.join(tenantDataDir(), 'dishes.json');
    fs.writeFileSync(dishesJsonPath, JSON.stringify(updatedDishes, null, 2), 'utf8');

    // Riavvia automaticamente l'app per applicare le modifiche
    try {
      const { exec } = require('child_process');
      exec('pm2 restart ecosystem.config.js', (error: any) => {
        if (error) {
          console.error('Errore nel riavvio automatico:', error);
        } else {
          console.log('App riavviata automaticamente');
        }
      });
    } catch (restartError) {
      console.error('Errore nel comando di riavvio:', restartError);
    }
    
    res.status(200).json({ 
      message: 'Prodotti salvati! L\'applicazione si sta riavviando per applicare le modifiche...',
      note: 'Ricarica la pagina dopo alcuni secondi per vedere i cambiamenti.'
    });
  } catch (error) {
    console.error('Errore nel salvare i prodotti:', error);
    res.status(500).json({ message: 'Errore nel salvare i prodotti', error: String(error) });
  }
}

export default withTenantApi(handler);
