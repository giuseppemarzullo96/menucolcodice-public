import type { ReactNode } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { COMPANY } from '@/seo/company';
import type { VenueLegal } from '@/seo/venueLegal';
import styles from '@/styles/marketing.module.css';

type Props = {
  venue: VenueLegal;
  title: string;
  description: string;
  heading: string;
  crumb: 'Privacy' | 'Cookie';
  children: ReactNode;
};

export function TenantLegalLayout({ venue, title, description, heading, crumb, children }: Props) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="robots" content="noindex, follow" />
        <link rel="canonical" href={`${venue.menuUrl}/${crumb.toLowerCase()}`} />
      </Head>
      <div className={styles.page}>
        <header className={styles.header}>
          <Link href="/" className={styles.brand} aria-label={venue.name}>
            <span style={{ fontWeight: 800 }}>{venue.name}</span>
          </Link>
          <nav className={styles.nav} aria-label="Pagine">
            <Link href="/">Menu</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/cookie">Cookie</Link>
          </nav>
        </header>
        <article className={styles.legal}>
          <h1>{heading}</h1>
          <p className={styles.legalMeta}>
            {venue.name} · {venue.menuHost} · aggiornato il {COMPANY.lastUpdated}
          </p>
          {children}
        </article>
        <footer className={styles.footer}>
          <p>
            Menu pubblicato con {COMPANY.productName}. Hosting: {COMPANY.hosting}.
          </p>
        </footer>
      </div>
    </>
  );
}
