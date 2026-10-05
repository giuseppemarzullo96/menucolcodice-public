import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { GetServerSideProps } from "next";
import { Form, Input, Button, message } from "antd";
import { LockOutlined } from "@ant-design/icons";
import Head from "next/head";
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { getTenantBySlug, slugFromHost, tenantDataDir, tenantPublic, withTenantPage } from '@/server/tenant';
import { planName } from '@/utils/plans';
import styles from '@/styles/admin.module.css';

interface LoginPageProps {
  restaurantData: any;
  tenant: {
    isPlatform: boolean;
    plan: string;
    slug: string;
    name: string;
  };
}

const AdminLoginPage = ({ restaurantData, tenant }: LoginPageProps) => {
  const router = useRouter();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [firstAccess, setFirstAccess] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);
  const isPlatform = Boolean(tenant?.isPlatform);
  const restaurantName = restaurantData?.name || tenant?.name || 'Menu col codice';

  useEffect(() => {
    // Verifica se l'utente è già autenticato
    const checkSession = async () => {
      try {
        const response = await fetch('/api/admin/verify-session');
        if (response.ok) {
          const data = await response.json();
          if (data.authenticated) {
            router.push('/admin');
            return;
          }
        }
      } catch (error) {
        console.error('Errore nella verifica della sessione:', error);
      }
    };

    checkSession();
  }, [router]);

  const handleSubmit = async (values: { code: string }) => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/check-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: values.code }),
      });

      const data = await response.json();

      if (data.valid) {
        message.success(data.message || 'Accesso consentito!');
        if (data.firstAccess) {
          setFirstAccess(true);
          message.info('Configura un codice di accesso nella pagina admin per proteggere l\'area amministrativa');
        }
        // Reindirizza alla pagina admin
        setTimeout(() => {
          router.push('/admin');
        }, 500);
      } else {
        message.error(data.message || 'Codice di accesso non valido');
        form.setFieldsValue({ code: '' });
      }
    } catch (error) {
      console.error('Errore nel login:', error);
      message.error('Errore durante l\'accesso');
    } finally {
      setLoading(false);
    }
  };

  const handleRecover = async () => {
    setRecovering(true);
    try {
      const response = await fetch('/api/admin/recover-code', { method: 'POST' });
      const data = await response.json().catch(() => ({}));
      message.info(data.message || 'Se per questo locale è configurata un\'email di recupero, a breve arriverà un nuovo codice di accesso.');
      setRecoverySent(true);
    } catch (error) {
      console.error('Errore nel recupero del codice:', error);
      message.error('Errore durante la richiesta. Riprova.');
    } finally {
      setRecovering(false);
    }
  };

  return (
    <>
      <Head>
        <title>{isPlatform ? 'Piattaforma' : restaurantName} — accesso</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className={`${styles.login} ${isPlatform ? styles.loginPlatform : ''}`}>
        <header className={styles.loginHeader}>
          <img
            className={styles.logo}
            src={isPlatform ? '/brand/logo-orizzontale-negativo.svg' : '/brand/logo-orizzontale.svg'}
            alt="Menu col codice"
          />
        </header>
        <div className={styles.loginBody}>
          <div className={styles.loginCard}>
            <p className={styles.kicker}>{isPlatform ? 'Piattaforma' : 'Pannello del locale'}</p>
            <h1>{isPlatform ? 'Accesso piattaforma' : `Accesso di ${restaurantName}`}</h1>
            <p className={styles.muted}>
              {isPlatform
                ? 'Questo è il pannello tuo: iscrizioni, locali e chiavi. Non è l’admin dei clienti.'
                : `Piano ${planName(tenant?.plan || 'free')}. Inserisci il codice di accesso.`}
            </p>
            {firstAccess ? (
              <p className={styles.muted} style={{ marginTop: '1rem' }}>
                Primo accesso: dopo essere entrato, imposta il codice in Sicurezza.
              </p>
            ) : null}
            <Form form={form} layout="vertical" onFinish={handleSubmit} autoComplete="off" style={{ marginTop: 20 }}>
              <Form.Item
                label="Codice di accesso"
                name="code"
                rules={[{ required: true, message: 'Inserisci il codice di accesso' }]}
              >
                <Input.Password size="large" placeholder="Codice" prefix={<LockOutlined />} autoFocus />
              </Form.Item>
              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" htmlType="submit" size="large" loading={loading} block>
                  Entra
                </Button>
              </Form.Item>
            </Form>
            {!isPlatform ? (
              <p className={styles.muted} style={{ marginTop: 16, textAlign: 'center' }}>
                {recoverySent ? (
                  'Controlla la tua email per il nuovo codice.'
                ) : (
                  <a onClick={recovering ? undefined : handleRecover} style={{ cursor: recovering ? 'default' : 'pointer', textDecoration: 'underline' }}>
                    {recovering ? 'Invio in corso…' : 'Hai dimenticato il codice? Te lo mandiamo via email'}
                  </a>
                )}
              </p>
            ) : null}
          </div>
        </div>
        <p className={styles.footer}>
          {isPlatform ? 'Piattaforma Menu col codice' : restaurantName}
        </p>
      </div>
      <style jsx global>{`
        .ant-btn-primary {
          background: #1A1A17 !important;
          border-color: #1A1A17 !important;
        }
        .ant-input-affix-wrapper,
        .ant-input-password {
          border-radius: 0 !important;
        }
      `}</style>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const tenant = getTenantBySlug(slugFromHost(ctx.req.headers.host));
  if (!tenant) return { notFound: true };
  return withTenantPage(ctx.req, () => {
  // Funzione per leggere i moduli TypeScript
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
        logoType: dishes?.logoType || "text",
        logoUrl: dishes?.logoUrl || "",
        logoWidth: dishes?.logoWidth || 150,
        logoHeight: dishes?.logoHeight || 50,
      },
      tenant: tenantPublic(),
    },
  };
  });
};

export default AdminLoginPage;
