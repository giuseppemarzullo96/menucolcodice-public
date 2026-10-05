import Link from 'next/link';
import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import { MARKETING_SEO } from '@/seo/marketingPages';
import styles from '@/styles/marketing.module.css';

export default function NotFoundPage() {
  const seo = MARKETING_SEO.notFound;
  return (
    <MarketingLayout
      title={seo.title}
      description={seo.description}
      path={seo.path}
      noindex
    >
      <section className={styles.hero}>
        <h1>Questa pagina non c’è.</h1>
        <p className={styles.lead}>
          Il link è sbagliato o la pagina è stata spostata. Puoi tornare alla home, vedere i prezzi o aprire la demo.
        </p>
        <div className={styles.actions}>
          <Link href="/" className={styles.button}>
            Home
          </Link>
          <Link href="/prezzi" className={styles.buttonGhost}>
            Prezzi
          </Link>
          <a href="https://demo.menucolcodice.it" className={styles.buttonGhost}>
            Demo
          </a>
          <Link href="/iscriviti" className={styles.buttonGhost}>
            Crea il menu
          </Link>
        </div>
      </section>
    </MarketingLayout>
  );
}
