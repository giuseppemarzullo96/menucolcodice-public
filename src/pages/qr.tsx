import { useEffect, useRef, useState } from "react";
import { GetServerSideProps } from "next";
import { QRCodeSVG } from "qrcode.react";
import { Button, Card, Space, Typography } from "antd";
import { DownloadOutlined, QrcodeOutlined } from "@ant-design/icons";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { HomeLayout } from "../components/layouts/HomeLayout";
import styles from "../styles/qr.module.css";
import { getTenantBySlug, slugFromHost, tenantDataDir, withTenantPage } from '@/server/tenant';

const { Title, Text } = Typography;

interface QRCodePageProps {
  restaurantData: any;
  themeColors?: any;
  footerText?: string;
}

export default function QRCodePage({ restaurantData, themeColors, footerText }: QRCodePageProps) {
  const qrRef = useRef<HTMLDivElement>(null);
  const [qrUrl, setQrUrl] = useState<string>("");

  useEffect(() => {
    // Ottieni l'URL base della homepage
    if (typeof window !== "undefined") {
      setQrUrl(`${window.location.origin}/?src=qr`);
    }
  }, []);

  const downloadPNG = async () => {
    if (!qrRef.current) return;

    try {
      const canvas = await html2canvas(qrRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
      });
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = "qr-code.png";
      link.href = url;
      link.click();
    } catch (error) {
      console.error("Errore nel download PNG:", error);
    }
  };

  const downloadPDF = async () => {
    if (!qrRef.current) return;

    try {
      const canvas = await html2canvas(qrRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 100;
      const pageHeight = pdf.internal.pageSize.height;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = (pageHeight - imgHeight) / 2;

      pdf.addImage(imgData, "PNG", (210 - imgWidth) / 2, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", (210 - imgWidth) / 2, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save("qr-code.pdf");
    } catch (error) {
      console.error("Errore nel download PDF:", error);
    }
  };

  // Colori dal tema
  const primaryColor = themeColors?.navbar?.logoColor || themeColors?.primary || '#FFB800';
  const backgroundColor = themeColors?.layout?.background || '#000000';
  const cardBackground = themeColors?.card?.backgroundColor || '#1a1a1a';
  const textColor = themeColors?.navbar?.textColor || '#ffffff';
  const secondaryTextColor = themeColors?.navbar?.textColor || '#d9d9d9';

  return (
    <HomeLayout
      title={`QR Code - ${restaurantData?.name || 'menucolcodice.it'}`}
      pageDescription="Scarica il QR code per condividere il menu"
      restaurantData={restaurantData}
      themeColors={themeColors}
      footerText={footerText}
      noindex
    >
      <div 
        className={styles.container}
        style={{ background: backgroundColor }}
      >
        <Card 
          className={styles.card}
          style={{ 
            background: cardBackground,
            borderColor: themeColors?.card?.borderColor || '#d9d9d9',
          }}
        >
          <Space direction="vertical" size="large" align="center" style={{ width: "100%" }}>
            <QrcodeOutlined style={{ fontSize: 48, color: primaryColor }} />
            <Title 
              level={2}
              style={{ color: textColor }}
            >
              QR Code Menu
            </Title>
            <Text 
              type="secondary" 
              style={{ 
                textAlign: "center", 
                display: "block",
                color: secondaryTextColor 
              }}
            >
              Scansiona questo QR code per accedere direttamente al menu
            </Text>

            <div ref={qrRef} className={styles.qrWrapper}>
              {qrUrl && (
                <QRCodeSVG
                  value={qrUrl}
                  size={300}
                  level="H"
                  includeMargin={true}
                  fgColor="#000000"
                  bgColor="#ffffff"
                />
              )}
            </div>

            <Text 
              copyable={{ text: qrUrl }} 
              style={{ 
                fontSize: 12, 
                color: secondaryTextColor 
              }}
            >
              {qrUrl}
            </Text>

            <Space size="middle">
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                size="large"
                onClick={downloadPNG}
                style={{
                  backgroundColor: primaryColor,
                  borderColor: primaryColor,
                }}
              >
                Scarica PNG
              </Button>
              <Button
                type="default"
                icon={<DownloadOutlined />}
                size="large"
                onClick={downloadPDF}
                style={{
                  backgroundColor: themeColors?.navbar?.buttonBackground || '#303030',
                  borderColor: themeColors?.navbar?.buttonBackground || '#303030',
                  color: themeColors?.navbar?.buttonText || '#ffffff',
                }}
              >
                Scarica PDF
              </Button>
            </Space>
          </Space>
        </Card>
      </div>
    </HomeLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const tenant = getTenantBySlug(slugFromHost(ctx.req.headers.host));
  if (!tenant) return { notFound: true };
  return withTenantPage(ctx.req, () => {
  // Leggi i file separati (nuova struttura)
  const readModule = (filePath: string, exportName: string) => {
    if (!fs.existsSync(filePath)) return null;
    try {
      const tsContent = fs.readFileSync(filePath, 'utf8');
      const jsContent = tsContent
        .replace(/^[ \t]*import[^;]+;\s*\n/gm, '')
        .replace(new RegExp(`export\\s+const\\s+${exportName}\\s*[:=]\\s*`), `exports.${exportName} = `)
        .replace(/PriceNameType\.([A-Z_]+)/g, '"$1"')
        .replace(/as\s+"text"\s*\|\s+"image"/g, '');
      const sandbox: any = { exports: {} };
      vm.createContext(sandbox);
      vm.runInContext(jsContent, sandbox, { filename: filePath });
      return sandbox.exports[exportName];
    } catch (e) {
      console.warn(`Errore nel leggere ${filePath}:`, e);
      return null;
    }
  };

  const basePath = tenantDataDir();
  const restaurantInfo = readModule(path.join(basePath, 'restaurant', 'info.ts'), 'restaurantInfo') || {};
  const restaurantContacts = readModule(path.join(basePath, 'restaurant', 'contacts.ts'), 'restaurantContacts') || {};
  const restaurantSocial = readModule(path.join(basePath, 'restaurant', 'social.ts'), 'restaurantSocial') || {};
  const themeLayout = readModule(path.join(basePath, 'theme', 'layout.ts'), 'themeLayout') || {};
  const themeColors = readModule(path.join(basePath, 'theme', 'colors.ts'), 'themeColors') || {};

  // Combina i dati
  const dishes: any = {
    ...restaurantInfo,
    ...restaurantContacts,
    social: restaurantSocial,
    ...themeLayout,
    themeColors,
  };

  return {
    props: {
      restaurantData: {
        name: dishes?.name || "menucolcodice.it",
        description: dishes?.description || "",
        address: {
          street: dishes?.address?.street || "",
          city: dishes?.address?.city || "",
          state: dishes?.address?.state || "",
          postalCode: dishes?.address?.postalCode || "",
        },
        phone: dishes?.phone || "",
        email: dishes?.email || "",
        openingHours: dishes?.openingHours || "",
        homeBackgroundUrl: dishes?.homeBackgroundUrl || "",
        logoType: dishes?.logoType || "text",
        logoUrl: dishes?.logoUrl || "",
        logoWidth: dishes?.logoWidth || 150,
        logoHeight: dishes?.logoHeight || 50,
        social: {
          facebook: dishes?.social?.facebook || "",
          instagram: dishes?.social?.instagram || "",
          whatsapp: dishes?.social?.whatsapp || "",
        },
      },
      themeColors: themeColors || {},
      footerText: dishes?.footerText || "",
    },
  };
  });
};
