import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { Drawer, Typography, theme } from "antd";
const { Title, Paragraph } = Typography;

import { MenuItems } from "./MenuItems";
import styles from "../../styles/dishesNavbar.module.css";

export const DishesDrawer = ({ open, setOpen }) => {
  const router = useRouter();
  const [footerText, setFooterText] = useState("");
  const [themeColors, setThemeColors] = useState<any>({});

  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const { useToken } = theme;
  const { token } = useToken();

  useEffect(() => {
    const loadFooterText = async () => {
      try {
        const response = await fetch('/api/get-restaurant');
        if (response.ok) {
          const data = await response.json();
          if (data.footerText) {
            setFooterText(data.footerText);
          } else {
            setFooterText(`${data.name} © ${new Date().getFullYear()}`);
          }
          if (data.themeColors) {
            setThemeColors(data.themeColors);
          }
        }
      } catch (error) {
        console.error('Error loading footer text:', error);
      }
    };
    loadFooterText();
  }, []);

  const drawerColors = themeColors?.drawer || {};
  const drawerBg = drawerColors.background || '#ffffff';
  const drawerTitleColor = drawerColors.titleColor || token.colorPrimary;
  const drawerFooterTextColor = drawerColors.footerTextColor || '#d9d9d9';

  const onClose = () => {
    setOpen(false);
  };

  return (
    <Drawer
      placement="left"
      onClose={onClose}
      open={open}
      width={278}
      closeIcon={false}
      style={{ background: drawerBg }}
    >
      <div className={styles.sidebarContainer}>
        <div>
          <div className={styles.sidebarTitle}>
            <Title
              level={2}
              className={styles.sidebarTitleText}
              style={{
                color: drawerTitleColor,
                marginTop: "1rem",
              }}
            >
              Menu
            </Title>
          </div>

          <MenuItems
            isDrawerOpen={open}
            setOpenDrawer={setOpen}
            themeColors={themeColors}
          />
        </div>

        <div className={styles.buttonContainer}>
          <div 
            style={{ 
              color: drawerFooterTextColor,
              textAlign: 'center',
              margin: '1rem 0',
              fontSize: '14px'
            }}
            dangerouslySetInnerHTML={{ __html: footerText }}
          />
        </div>
      </div>
    </Drawer>
  );
};
