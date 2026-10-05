import Head from "next/head";
import { Layout, ConfigProvider } from "antd";
import { TLayout } from "../../types/layout";
import styles from "../../styles/adminLayout.module.css";
import { ReactNode } from "react";

const { Content, Header } = Layout;

export const AdminLayout = ({
  children,
  title,
  pageDescription,
  headerExtra,
}: Omit<TLayout, "imageUrl"> & { headerExtra?: ReactNode }) => {
  return (
    <ConfigProvider
      theme={{
        token: {
          // Schema colori professionale seguendo regola 60-30-10
          // Colori Primari (30%)
          colorPrimary: "#3B82F6", // blu dodger
          colorPrimaryHover: "#2563EB",
          
          // Colori Neutri (60%)
          colorBgContainer: "#FFFFFF", // background cards/forms
          colorBgLayout: "#F8F9FA", // background principale
          colorText: "#181824", // testo primario (nero ricco)
          colorTextSecondary: "#6C757D", // testo secondario (grigio medio)
          colorTextPlaceholder: "#6C757D",
          colorBorder: "#E9ECEF",
          
          // Colori di Accento (10%)
          colorSuccess: "#38CE3C", // verde
          colorWarning: "#FFDE73", // giallo sunglow
          colorError: "#FF4D6B", // rosa fiery
          colorInfo: "#8E32E9", // viola elettrico
          
          borderRadius: 8,
          fontSize: 14,
        },
      }}
    >
      <Layout className={styles.adminLayout}>
        <Head>
          <title>{title || "Admin Panel"}</title>
          <meta name="description" content={pageDescription || "Admin panel"} />
          <meta name="robots" content="noindex, nofollow" />
        </Head>

        <Header className={styles.adminHeader}>
          <div className={styles.headerContent}>
            <h1 className={styles.headerTitle}>Pannello di Amministrazione</h1>
            {headerExtra && <div className={styles.headerExtra}>{headerExtra}</div>}
          </div>
        </Header>

        <Content className={styles.adminContent}>
          <div className={styles.contentWrapper}>{children}</div>
        </Content>

        <footer className={styles.adminFooter}>
          <p>Admin Panel © {new Date().getFullYear()}</p>
        </footer>
      </Layout>
    </ConfigProvider>
  );
};
