import { useRouter } from "next/router";
import Link from "next/link";

import { Layout, Button } from "antd";
import { ReadOutlined } from "@ant-design/icons";
import { IconChefHat } from "@tabler/icons-react";
const { Header } = Layout;

import styles from "../../styles/navbar.module.css";

interface HomeNavbarProps {
  restaurantData?: {
    name?: string;
    logoType?: 'text' | 'image';
    logoUrl?: string;
    logoWidth?: number;
    logoHeight?: number;
  };
  themeColors?: any;
}

export const HomeNavbar = ({ restaurantData: initialData, themeColors: initialThemeColors }: HomeNavbarProps = {}) => {
  const router = useRouter();
  
  // Usa i dati iniziali, senza fetch
  const restaurantName = initialData?.name || "menucolcodice.it";
  const logoType = initialData?.logoType || 'text';
  const logoUrl = initialData?.logoUrl || "";
  const logoWidth = initialData?.logoWidth || 150;
  const logoHeight = initialData?.logoHeight || 50;
  
  // Determina se mostrare l'immagine o il fallback (evita rendering condizionale che causa flicker)
  const hasImage = logoType === 'image' && logoUrl && logoUrl.trim() !== '';
  
  // RIMOSSO: useEffect che fa fetch
  // Usa i colori passati come prop
  const navbarColors = initialThemeColors?.navbar || {};
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
        {/* mobile */}
        <Link
          href="/"
          className={styles.navContainerOptions}
        >
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

        <div className={styles.menuIcon}>
          <Button
            icon={<ReadOutlined style={{ color: iconColor }} />}
            onClick={() => router.push("/dishes")}
            shape="circle"
            style={{ 
              background: buttonBg,
              borderColor: buttonBg,
              color: buttonText
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = buttonHover;
              e.currentTarget.style.borderColor = buttonHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = buttonBg;
              e.currentTarget.style.borderColor = buttonBg;
            }}
          />
        </div>

        {/* desktop */}
        <div className={styles.headerButtonsContainer}>
          <Button
            icon={<ReadOutlined style={{ color: iconColor }} />}
            onClick={() => router.push("/dishes")}
            style={{ 
              background: buttonBg,
              borderColor: buttonBg,
              color: buttonText
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = buttonHover;
              e.currentTarget.style.borderColor = buttonHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = buttonBg;
              e.currentTarget.style.borderColor = buttonBg;
            }}
          >
            Menu
          </Button>
        </div>
      </nav>
    </Header>
  );
};
