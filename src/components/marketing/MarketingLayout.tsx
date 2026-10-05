import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Seo } from '@/seo/Seo';
import { organizationJsonLd } from '@/seo/jsonld';
import { COMPANY, COMPANY_WHATSAPP_URL } from '@/seo/company';
import { BUSINESS_TYPES } from '@/seo/businessTypes';
import styles from '@/styles/marketing.module.css';

type Props = {
  title: string;
  description: string;
  path: string;
  children: React.ReactNode;
  noindex?: boolean;
  jsonLd?: object | object[];
  image?: string;
};

function BrandLink() {
  const [href, setHref] = useState('/prezzi');
  useEffect(() => {
    const host = window.location.hostname;
    setHref(host === 'menucolcodice.it' || host === 'www.menucolcodice.it' ? '/' : '/prezzi');
  }, []);
  return (
    <Link href={href} className={styles.brand} aria-label="Menu col codice">
      <img
        src="/brand/logo-orizzontale.svg"
        alt="Menu col codice"
        className={styles.brandLogo}
        width={220}
        height={31}
      />
    </Link>
  );
}

export function MarketingLayout({ title, description, path, children, noindex, jsonLd, image }: Props) {
  const graphs = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];
  return (
    <>
      <Seo
        title={title}
        description={description}
        path={path}
        noindex={noindex}
        image={image}
        type={image ? 'article' : 'website'}
        jsonLd={[organizationJsonLd(), ...graphs]}
      />
      <div className={styles.page}>
        <header className={styles.header}>
          <BrandLink />
          <nav className={styles.nav} aria-label="Principale">
            <Link href="/">Home</Link>
            <a href="https://demo.menucolcodice.it">
              Demo
            </a>
            <Link href="/prezzi">Prezzi</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/iscriviti" className={styles.cta}>
              Inizia
            </Link>
          </nav>
        </header>
        <main>{children}</main>
        <footer className={styles.footer}>
          <div className={styles.footerGrid}>
            <section>
              <h2>Prodotto</h2>
              <ul>
                <li>
                  <Link href="/">Home</Link>
                </li>
                <li>
                  <Link href="/prezzi">Prezzi</Link>
                </li>
                <li>
                  <Link href="/iscriviti">Crea il menu</Link>
                </li>
              </ul>
            </section>
            <section>
              <h2>Risorse</h2>
              <ul>
                <li>
                  <a href="https://demo.menucolcodice.it">Demo</a>
                </li>
                <li>
                  <Link href="/blog">Blog</Link>
                </li>
              </ul>
            </section>
            <section>
              <h2>Per settore</h2>
              <ul>
                {BUSINESS_TYPES.map((item) => (
                  <li key={item.slug}>
                    <Link href={`/menu-digitale/${item.slug}`}>{item.label.replace(/^il tuo |^la tua /i, '')}</Link>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h2>Legale</h2>
              <ul>
                <li>
                  <Link href="/privacy">Privacy</Link>
                </li>
                <li>
                  <Link href="/cookie">Cookie</Link>
                </li>
                <li>
                  <Link href="/termini">Termini</Link>
                </li>
              </ul>
            </section>
            <section>
              <h2>Contatti</h2>
              <ul>
                <li>
                  <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
                </li>
                <li>
                  <a href={COMPANY_WHATSAPP_URL}>{COMPANY.whatsappDisplay}</a>
                </li>
                <li>
                  <a href={COMPANY.tradeSite} target="_blank" rel="noopener noreferrer">
                    {COMPANY.tradeName}
                  </a>
                </li>
              </ul>
            </section>
          </div>
          <p className={styles.footerLegal}>
            © {new Date().getFullYear()} {COMPANY.productName} · {COMPANY.legalName} · P. IVA {COMPANY.vatId}
          </p>
          <p className={styles.footerNote}>
            Sede: {COMPANY.seat}
          </p>
          <p className={styles.footerNote}>Pagamenti con carta o PayPal. Prezzi + IVA 22%.</p>
        </footer>
      </div>
    </>
  );
}
