import { Layout, Typography, theme } from "antd";
import { useEffect } from "react";
const { Sider } = Layout;
const { Title } = Typography;

import { MenuItems } from "./MenuItems";
import styles from "../../styles/sidebar.module.css";

interface SidebarProps {
  themeColors?: any;
}

export const Sidebar = ({ themeColors: initialThemeColors }: SidebarProps = {}) => {
  // RIMOSSO: useEffect che fa fetch
  // Usa i colori passati come prop
  const sidebarColors = initialThemeColors?.sidebar || {};
  const sidebarBg = sidebarColors.background || '#ffffff';
  const titleColor = sidebarColors.titleColor || '#FFB800';

  // Aggiorna la variabile CSS quando sidebarBg cambia (solo se necessario)
  useEffect(() => {
    if (typeof document !== 'undefined' && sidebarBg) {
      document.documentElement.style.setProperty('--sidebar-bg', sidebarBg);
    }
  }, [sidebarBg]);

  // RIMOSSO: useLayoutEffect per calcolare la posizione
  // Ora la posizione è calcolata direttamente in CSS con calc() per evitare qualsiasi flicker

  return (
    <div className={styles.sidebarWrapper}>
      <Sider
        className={styles.sidebarMenuContainer}
        theme="light"
        style={{ 
          background: sidebarBg,
          '--sidebar-bg': sidebarBg,
        } as React.CSSProperties}
        width={250}
      >
        <div className={styles.sidebarTitle}>
          <Title
            level={2}
            style={{
              color: titleColor,
              marginTop: "1rem",
            }}
          >
            Menu
          </Title>
        </div>

        <MenuItems themeColors={initialThemeColors} />
      </Sider>
    </div>
  );
};
