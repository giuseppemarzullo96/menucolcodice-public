import { Layout } from "antd";
const { Content } = Layout;

import { TLayout } from "../../types/layout";
import { HomeNavbar, FooterComponent } from "../ui";
import styles from "../../styles/dishesLayout.module.css";
import { Seo } from "@/seo/Seo";
import { SITE_NAME, THEME_COLOR } from "@/seo/site";

export const DishLayout = ({
  children,
  title,
  pageDescription,
  imageUrl,
  restaurantData,
  themeColors,
  footerText,
  restaurantName,
  canonicalUrl,
}: TLayout & { restaurantData?: any; themeColors?: any; footerText?: string; restaurantName?: string }) => {
  return (
    <Layout>
      <Seo
        title={title}
        description={pageDescription}
        canonicalUrl={canonicalUrl}
        image={imageUrl}
        siteName={restaurantName || restaurantData?.name || SITE_NAME}
        themeColor={themeColors?.navbar?.background || THEME_COLOR}
        includeIcons={false}
      />

      <HomeNavbar restaurantData={restaurantData} themeColors={themeColors} />
      <Content>
        <Layout className={`container ${styles.layoutContainer}`}>
          {children}
        </Layout>
      </Content>

      <FooterComponent footerText={footerText} themeColors={themeColors} restaurantName={restaurantName} />
    </Layout>
  );
};
