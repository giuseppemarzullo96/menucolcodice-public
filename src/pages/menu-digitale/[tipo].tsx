import type { GetStaticPaths, GetStaticProps } from 'next';
import Link from 'next/link';
import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import { BUSINESS_TYPES, getBusinessType, type BusinessTypePage } from '@/seo/businessTypes';
import { breadcrumbJsonLd, faqPageJsonLd } from '@/seo/jsonld';
import styles from '@/styles/marketing.module.css';

type Props = { page: BusinessTypePage };

export default function BusinessTypePageView({ page }: Props) {
  return (
    <MarketingLayout
      title={page.title}
      description={page.description}
      path={`/menu-digitale/${page.slug}`}
      jsonLd={[
        breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: page.h1, path: `/menu-digitale/${page.slug}` },
        ]),
        faqPageJsonLd(page.faqs),
      ]}
    >
      <section className={styles.hero}>
        <h1>{page.h1}</h1>
        <p className={styles.lead}>{page.lead}</p>
        <div className={styles.actions}>
          <Link href="/iscriviti" className={styles.button}>
            Crea il menu — è gratis
          </Link>
          <Link href="/prezzi" className={styles.buttonGhost}>
            Guarda i prezzi
          </Link>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Perché per {page.label}</h2>
        <p className={styles.sectionLead}>{page.why}</p>
      </section>

      <section className={styles.featureGrid}>
        {page.bullets.map((bullet) => (
          <article key={bullet} className={styles.featureCard}>
            <p>{bullet}</p>
          </article>
        ))}
      </section>

      <section className={styles.section}>
        <h2>Domande frequenti</h2>
        {page.faqs.map((faq) => (
          <div key={faq.question} style={{ marginBottom: '1.5rem' }}>
            <h3>{faq.question}</h3>
            <p className={styles.sectionLead}>{faq.answer}</p>
          </div>
        ))}
      </section>

      <section className={styles.section}>
        <h2>Altri settori</h2>
        <ul className={styles.plainList}>
          {BUSINESS_TYPES.filter((item) => item.slug !== page.slug).map((item) => (
            <li key={item.slug}>
              <Link href={`/menu-digitale/${item.slug}`}>{item.h1}</Link>
            </li>
          ))}
        </ul>
      </section>
    </MarketingLayout>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: BUSINESS_TYPES.map((item) => ({ params: { tipo: item.slug } })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const slug = String(params?.tipo || '');
  const page = getBusinessType(slug);
  if (!page) return { notFound: true };
  return { props: { page } };
};
