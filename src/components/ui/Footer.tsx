import Link from "next/link";

import { Layout, theme, Typography } from "antd";
const { Footer } = Layout;
import styles from "../../styles/footer.module.css";
const { Paragraph } = Typography;

interface FooterComponentProps {
  footerText?: string;
  themeColors?: any;
  restaurantName?: string;
}

export const FooterComponent = ({ footerText: initialFooterText, themeColors: initialThemeColors, restaurantName }: FooterComponentProps = {}) => {
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  // RIMOSSO: useEffect che fa fetch
  // Usa i dati passati come props
  // Calcola footerText se non fornito
  const footerText = initialFooterText || (restaurantName ? `${restaurantName} © ${new Date().getFullYear()}` : "menucolcodice.it © 2026");
  const footerColors = initialThemeColors?.footer || {};
  const footerBg = footerColors.background || '#141414';
  const footerTextColor = footerColors.textColor || '#d9d9d9';
  const linkHoverOpacity = footerColors.linkHoverOpacity !== undefined ? footerColors.linkHoverOpacity : 0.8;

  return (
    <Footer
      style={{ background: footerBg }}
      className={styles.footerContainer}
    >
      <div className={styles.footerInner}>
        <div
          className={styles.footerLink}
          style={{
            color: footerTextColor,
            opacity: 1,
            cursor: 'default'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = String(linkHoverOpacity);
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
          dangerouslySetInnerHTML={{ __html: footerText }}
        />
        <nav className={styles.footerLegal} aria-label="Note legali">
          <Link href="/privacy" style={{ color: footerTextColor }}>
            Privacy
          </Link>
          <span aria-hidden="true"> · </span>
          <Link href="/cookie" style={{ color: footerTextColor }}>
            Cookie
          </Link>
        </nav>
      </div>
    </Footer>
  );
};
