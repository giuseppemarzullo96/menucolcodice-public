import Link from 'next/link';
import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import { PLAN_CATALOG, formatEuro } from '@/utils/plans';
import { MARKETING_SEO } from '@/seo/marketingPages';
import { breadcrumbJsonLd, productOffersJsonLd } from '@/seo/jsonld';
import styles from '@/styles/marketing.module.css';

export default function PrezziPage() {
  const seo = MARKETING_SEO.prezzi;
  return (
    <MarketingLayout
      title={seo.title}
      description={seo.description}
      path={seo.path}
      jsonLd={[
        ...productOffersJsonLd(),
        breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Prezzi', path: '/prezzi' },
        ]),
      ]}
    >
      <section className={styles.hero}>
        <h1>Parti gratis. Passi a pagamento solo se ti serve davvero.</h1>
        <p className={styles.lead}>
          Meno di quanto costa ristampare il menu due volte l&apos;anno. Cambi o disdici quando vuoi.
          Pagamenti con carta o PayPal. Prezzi + IVA 22%.
        </p>
      </section>
      <section className={styles.pricingGrid}>
        {PLAN_CATALOG.map((plan) => (
          <article
            key={plan.id}
            className={`${styles.card} ${plan.featured ? styles.planFeatured : ''}`}
          >
            {plan.featured ? <span className={styles.planBadge}>Il più scelto</span> : null}
            <h2>
              {plan.name}
              {plan.listEuro === 0 ? ' — 0 €' : ` — ${formatEuro(plan.listEuro)} €/mese`}
            </h2>
            {plan.listEuro > 0 ? (
              <p className={styles.muted}>{formatEuro(plan.chargeEuro)} €/mese IVA inclusa</p>
            ) : null}
            <p className={styles.planBlurb}>
              <em>{plan.blurb}</em>
            </p>
            <ul>
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            {plan.id === 'free' ? (
              <p className={styles.muted}>Non scade. Nessuna carta di credito.</p>
            ) : null}
            <Link href={`/iscriviti?piano=${plan.id}`} className={styles.button}>
              {plan.id === 'free' ? 'Crea il menu' : 'Abbonati'}
            </Link>
          </article>
        ))}
      </section>
    </MarketingLayout>
  );
}
