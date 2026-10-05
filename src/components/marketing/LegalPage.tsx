import type { ReactNode } from 'react';
import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import { breadcrumbJsonLd } from '@/seo/jsonld';
import styles from '@/styles/marketing.module.css';

type Props = {
  title: string;
  description: string;
  path: string;
  heading: string;
  updated: string;
  children: ReactNode;
  crumb: string;
};

export function LegalPage({ title, description, path, heading, updated, children, crumb }: Props) {
  return (
    <MarketingLayout
      title={title}
      description={description}
      path={path}
      jsonLd={breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: crumb, path },
      ])}
    >
      <article className={styles.legal}>
        <h1>{heading}</h1>
        <p className={styles.legalMeta}>Aggiornato il {updated}</p>
        {children}
      </article>
    </MarketingLayout>
  );
}
