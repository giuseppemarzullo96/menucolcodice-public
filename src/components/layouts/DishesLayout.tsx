import { Layout } from "antd";
const { Content } = Layout;

import { DishesNavbar, FooterComponent, Sidebar } from "../ui";
import styles from "../../styles/dishesLayout.module.css";
import { TLayout } from "../../types/layout";
import { Seo } from "@/seo/Seo";
import { SITE_NAME, THEME_COLOR } from "@/seo/site";

export const DishesLayout = ({
  children,
  title,
  pageDescription,
  imageUrl,
  themeColors,
  footerText,
  restaurantName,
  restaurantData,
  canonicalUrl,
  noindex,
}: TLayout & { themeColors?: any; footerText?: string; restaurantName?: string; restaurantData?: any; noindex?: boolean }) => {
  const layoutBg = themeColors?.layout?.background || '#000000';

  return (
    <Layout style={{
      '--layout-bg': layoutBg,
      background: layoutBg
    } as React.CSSProperties}>
      <Seo
        title={title}
        description={pageDescription}
        canonicalUrl={canonicalUrl}
        image={imageUrl}
        siteName={restaurantName || restaurantData?.name || SITE_NAME}
        themeColor={themeColors?.navbar?.background || THEME_COLOR}
        noindex={noindex}
        includeIcons={false}
      />

      <DishesNavbar restaurantData={restaurantData} themeColors={themeColors} />
      <Content>
        <Layout className={`container ${styles.layoutContainer}`}>
          <Sidebar themeColors={themeColors} />
          {children}
        </Layout>
      </Content>

      <FooterComponent footerText={footerText} themeColors={themeColors} restaurantName={restaurantName} />
    </Layout>
  );
};
