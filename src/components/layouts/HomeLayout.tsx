import { Layout } from "antd";
const { Content } = Layout;

import { FooterComponent, HomeNavbar } from "../ui";
import { TLayout } from "../../types/layout";
import styles from "../../styles/homeLayout.module.css";
import { Seo } from "@/seo/Seo";
import { SITE_NAME, THEME_COLOR } from "@/seo/site";

export const HomeLayout = ({
  children,
  title,
  pageDescription,
  imageUrl,
  restaurantData,
  themeColors,
  footerText,
  canonicalUrl,
  noindex,
}: TLayout & { themeColors?: any; footerText?: string; canonicalUrl?: string; noindex?: boolean }) => {
  return (
    <Layout className={styles.page}>
      <Seo
        title={title}
        description={pageDescription}
        canonicalUrl={canonicalUrl}
        image={imageUrl}
        siteName={restaurantData?.name || SITE_NAME}
        themeColor={themeColors?.navbar?.background || THEME_COLOR}
        noindex={noindex}
        includeIcons={false}
      />

      <HomeNavbar restaurantData={restaurantData} themeColors={themeColors} />

      <Content className={styles.content}>
        <Layout className={styles.inner}>{children}</Layout>
      </Content>

      <FooterComponent footerText={footerText} themeColors={themeColors} restaurantName={restaurantData?.name} />
    </Layout>
  );
};
