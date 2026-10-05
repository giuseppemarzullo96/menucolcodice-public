export enum PriceNameType {
  STANDARD = "standard",
  TWELVEOZ = "twelveOz",
  SIXTEENOZ = "sixteenOz",
  SINGLE = "single",
  DOUBLE = "double",
  SMALL = "small",
  MEDIUM = "medium",
}

export type TPriceOption = {
  name: PriceNameType;
  price: number;
};

/** Tipo di media per il prodotto: immagine 2D o modello 3D interattivo */
export type TMenuItemMediaType = 'image' | 'model3d';

export type TMenuItem = {
  id: string;
  name: string;
  ingredients: string;
  description: string;
  prices: TPriceOption[];
  imageUrl: string;
  /** Se 'model3d', imageUrl punta al file .glb/.gltf; altrimenti è una foto */
  mediaType?: TMenuItemMediaType;
  bestSeller: boolean;
  allergens?: string[];
  /** null/undefined = disponibile; 0 = finito; timestamp = finito fino a */
  soldOutUntil?: number | null;
};

export type TMenuSection = {
  name: string;
  description: string;
  order?: number; // Campo per l'ordinamento (numero più basso = appare prima)
  icon?: string;
  hidden?: boolean;
  items: TMenuItem[];
};

export type TAdress = {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type TRestaurant = {
  name: string;
  description: string;
  address: TAdress;
  phone?: string;
  email?: string;
  website?: string;
  menuPageTitle?: string;
  openingHours?: string;
  footerText?: string;
  social?: {
    facebook?: string;
    instagram?: string;
    whatsapp?: string;
    glovo?: string;
    deliveroo?: string;
    justeat?: string;
  };
  // Logo configuration
  logoType?: 'text' | 'image'; // Toggle between text or image logo
  logoUrl?: string; // Path to logo image
  logoWidth?: number; // Logo width in pixels
  logoHeight?: number; // Logo height in pixels
  faviconUrl?: string; // Path to favicon image
  homeBackgroundUrl?: string; // Path to home page background image
  homeBackgroundType?: 'color' | 'image' | 'video'; // Type of home page background
  homeBackgroundVideoUrl?: string; // Path to home page background video
  // WhatsApp floating button
  whatsappButtonColor?: string; // WhatsApp button background color
  whatsappIconColor?: string; // WhatsApp icon color
  // Social button (angolino bombato)
  socialButtonColor?: string; // Social button background color
  socialIconColor?: string; // Social button icon color
  iubendaScriptUrl?: string;
  iubendaPrivacyPolicyUrl?: string;
  iubendaCookiePolicyUrl?: string;
  // Theme colors - Struttura gerarchica
  themeColors?: {
    // Colori base (per retrocompatibilità)
    primary?: string;
    secondary?: string;
    background?: string;
    textPrimary?: string;
    textSecondary?: string;
    tagColor?: string;
    layoutBackground?: string;
    sidebarBackground?: string;
    cardBackground?: string;
    buttonBackground?: string;
    cardBackgroundImage?: string;
    cardBackgroundOpacity?: number;
    // Struttura gerarchica
    layout?: {
      background?: string;
      homeButtonColor?: string;
      homeButtonTextColor?: string;
    };
    navbar?: {
      background?: string;
      logoColor?: string;
      textColor?: string;
      buttonBackground?: string;
      buttonText?: string;
      buttonHover?: string;
      iconColor?: string;
    };
    sidebar?: {
      background?: string;
      titleColor?: string;
      menuItemBackground?: string;
      menuItemColor?: string;
      menuItemActive?: string;
      menuItemHover?: string;
      iconColor?: string;
    };
    drawer?: {
      background?: string;
      titleColor?: string;
      menuItemColor?: string;
      footerTextColor?: string;
    };
    card?: {
      backgroundImage?: string;
      backgroundOpacity?: number;
      backgroundColor?: string;
      bestSellerTagColor?: string;
      productNameColor?: string;
      priceColor?: string;
      ingredientsColor?: string;
      detailsButtonBackground?: string;
      detailsButtonIcon?: string;
      detailsButtonGlobalBg?: string;
      subtitleColor?: string;
      detailsIngredientsColor?: string;
      descriptionTextColor?: string;
      shadowColor?: string;
      shadowOpacity?: number;
      hoverShadowOpacity?: number;
      borderRadius?: number;
      borderColor?: string;
      borderWidth?: number;
      detailsBorderColor?: string;
      detailsBorderWidth?: number;
      allergenTagColor?: string;
      allergenTextColor?: string;
      viewMode?: 'list' | 'carousel';
    };
    sections?: {
      titleColor?: string;
      descriptionColor?: string;
    };
    footer?: {
      background?: string;
      textColor?: string;
      linkHoverOpacity?: number;
    };
    /** Luci del viewer 3D (oggetti .glb/.gltf) – configurabili da admin Grafica */
    modelViewer?: {
      ambientIntensity?: number;
      directional1Position?: [number, number, number];
      directional1Intensity?: number;
      directional2Position?: [number, number, number];
      directional2Intensity?: number;
    };
  };
  sections: TMenuSection[];
};
