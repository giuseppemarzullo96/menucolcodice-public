import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

import { Layout, theme, Button } from "antd";
import { PhoneOutlined, HomeOutlined, MenuOutlined } from "@ant-design/icons";
import { IconChefHat } from "@tabler/icons-react";
const { Header } = Layout;

import { DishesDrawer } from ".";
import navStyles from "../../styles/dishesNavbar.module.css";
import styles from "../../styles/navbar.module.css";

interface DishesNavbarProps {
  restaurantData?: {
    name?: string;
    logoType?: 'text' | 'image';
    logoUrl?: string;
    logoWidth?: number;
    logoHeight?: number;
    phone?: string;
  };
  themeColors?: any;
}

export const DishesNavbar = ({ restaurantData: initialData, themeColors: initialThemeColors }: DishesNavbarProps = {}) => {
  const [open, setOpen] = useState(false);
  const [restaurantName, setRestaurantName] = useState(initialData?.name || "menucolcodice.it");
  const [logoType, setLogoType] = useState<'text' | 'image'>(initialData?.logoType || 'text');
  const [logoUrl, setLogoUrl] = useState(initialData?.logoUrl || "");
  const [logoWidth, setLogoWidth] = useState(initialData?.logoWidth || 150);
  const [logoHeight, setLogoHeight] = useState(initialData?.logoHeight || 50);
  
  // Determina se mostrare l'immagine o il fallback (evita rendering condizionale che causa flicker)
  const hasImage = logoType === 'image' && logoUrl && logoUrl.trim() !== '';
  const [phoneNumber, setPhoneNumber] = useState<string>(initialData?.phone || "+390891234567");
  const [themeColors, setThemeColors] = useState<any>(initialThemeColors || {});
  const router = useRouter();

  // Pre-carica l'immagine del logo per evitare flicker
  useEffect(() => {
    if (hasImage && logoUrl) {
      const img = new Image();
      img.src = logoUrl;
    }
  }, [hasImage, logoUrl]);

  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const { useToken } = theme;
  const { token } = useToken();

  // Aggiorna gli state quando cambiano i dati iniziali
  useEffect(() => {
    if (initialData) {
      if (initialData.name) setRestaurantName(initialData.name);
      if (initialData.logoType) setLogoType(initialData.logoType);
      if (initialData.logoUrl !== undefined) setLogoUrl(initialData.logoUrl);
      if (initialData.logoWidth) setLogoWidth(initialData.logoWidth);
      if (initialData.logoHeight) setLogoHeight(initialData.logoHeight);
      if (initialData.phone) setPhoneNumber(initialData.phone);
    }
    if (initialThemeColors) {
      setThemeColors(initialThemeColors);
    }
  }, [initialData, initialThemeColors]);

  // Fetch solo se i dati non sono stati passati come props (fallback)
  useEffect(() => {
    // Se abbiamo già i dati iniziali, non fare fetch
    if (initialData && initialThemeColors) {
      // Imposta le variabili CSS per i bottoni della navbar
      if (initialThemeColors?.navbar) {
        const navbar = initialThemeColors.navbar;
        if (navbar.buttonBackground) {
          document.documentElement.style.setProperty('--navbar-button-bg', navbar.buttonBackground);
        }
        if (navbar.buttonText) {
          document.documentElement.style.setProperty('--navbar-button-text', navbar.buttonText);
        }
        if (navbar.buttonHover) {
          document.documentElement.style.setProperty('--navbar-button-hover', navbar.buttonHover);
        }
      }
      return;
    }

    // Fallback: fetch se i dati non sono disponibili
    const loadRestaurantData = async () => {
      try {
        const response = await fetch('/api/get-restaurant');
        if (response.ok) {
          const data = await response.json();
          setRestaurantName(data.name);
          if (data.logoType) setLogoType(data.logoType);
          if (data.logoUrl) setLogoUrl(data.logoUrl);
          if (data.logoWidth) setLogoWidth(data.logoWidth);
          if (data.logoHeight) setLogoHeight(data.logoHeight);
          if (data.phone) setPhoneNumber(data.phone);
          if (data.themeColors) {
            setThemeColors(data.themeColors);
            
            // Imposta le variabili CSS per i bottoni della navbar
            if (data.themeColors?.navbar) {
              const navbar = data.themeColors.navbar;
              if (navbar.buttonBackground) {
                document.documentElement.style.setProperty('--navbar-button-bg', navbar.buttonBackground);
              }
              if (navbar.buttonText) {
                document.documentElement.style.setProperty('--navbar-button-text', navbar.buttonText);
              }
              if (navbar.buttonHover) {
                document.documentElement.style.setProperty('--navbar-button-hover', navbar.buttonHover);
              }
            }
          }
        }
      } catch (error) {
        console.error('Errore nel caricare i dati:', error);
      }
    };
    loadRestaurantData();
  }, [initialData, initialThemeColors]);

  const showDrawer = () => {
    setOpen(true);
  };

  const navbarColors = themeColors?.navbar || {};
  const navbarBg = navbarColors.background || '#141414';
  const logoColor = navbarColors.logoColor || '#FFB800';
  const textColor = navbarColors.textColor || '#ffffff';
  const buttonBg = navbarColors.buttonBackground || '#303030';
  const buttonText = navbarColors.buttonText || '#ffffff';
  const buttonHover = navbarColors.buttonHover || '#404040';
  const iconColor = navbarColors.iconColor || '#ffffff';

  return (
    <Header
      className={styles.headerContainer}
      style={{ background: navbarBg, padding: "0px" }}
    >
      <nav className={`container ${styles.navContainer}`}>
        <Link
          href="/"
          className={styles.navContainerOptions}
        >
          {/* Immagine logo - sempre renderizzata se presente */}
          {hasImage ? (
            <img
              className={styles.logoImage}
              src={logoUrl}
              alt={restaurantName}
              width={logoWidth || 160}
              height={logoHeight || 52}
              loading="eager"
            />
          ) : (
            /* Fallback testo - renderizzato SOLO se NON c'è un'immagine */
            <div className={styles.logoFallback}>
              <IconChefHat
                size={30}
                color={logoColor}
              />
              <span style={{ fontSize: "24px", color: textColor, margin: 0, fontWeight: 600 }}>
                {restaurantName}
              </span>
            </div>
          )}
        </Link>

        <div className={navStyles.hamburgerMenuIcon}>
          <Button
            onClick={showDrawer}
            icon={<MenuOutlined style={{ color: iconColor, fontSize: 16 }} />}
            className={`navbar-button ${navStyles.burgerButton}`}
            shape="circle"
            aria-label="Apri il menu"
          />
        </div>

        <div className={styles.headerButtonsContainer}>
          <Button
            href={`tel:${phoneNumber?.replace(/\s+/g, '')}`}
            className="navbar-button"
            style={{ marginRight: ".5rem" }}
            icon={<PhoneOutlined style={{ color: iconColor }} />}
          >
            Chiama
          </Button>

          <Button
            icon={<HomeOutlined style={{ color: iconColor }} />}
            onClick={() => router.push("/")}
            className="navbar-button"
          >
            Home
          </Button>
        </div>
      </nav>

      <DishesDrawer
        open={open}
        setOpen={setOpen}
      />
    </Header>
  );
};
