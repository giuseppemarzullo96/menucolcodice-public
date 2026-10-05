import { TRestaurant } from "@/types/dish";
import { restaurantInfo } from './restaurant/info';
import { restaurantContacts } from './restaurant/contacts';
import { restaurantSocial } from './restaurant/social';
import { menuSections } from './menu/sections';
import { menuProducts } from './menu/products';
import { themeColors } from './theme/colors';
import { themeLayout } from './theme/layout';
import { iubendaConfig } from './legal/iubenda';

// Combina tutto in un unico oggetto TRestaurant.
// Cast necessario: i moduli in database/ sono validi JS (letti da readModule) quindi stringhe senza literal types.
export const dishes = {
  ...restaurantInfo,
  ...restaurantContacts,
  social: restaurantSocial,
  ...themeLayout,
  ...iubendaConfig,
  themeColors,
  sections: menuSections.map(section => ({
    ...section,
    items: menuProducts.filter(p => p.category === section.name),
  })),
} as TRestaurant;
