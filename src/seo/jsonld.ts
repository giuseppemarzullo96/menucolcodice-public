import { PLAN_CATALOG } from '@/utils/plans';
import { COMPANY } from './company';
import { LOGO_URL, MARKETING_ORIGIN, SITE_NAME } from './site';

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    legalName: COMPANY.legalName,
    url: MARKETING_ORIGIN,
    logo: LOGO_URL,
    vatID: COMPANY.vatId,
    email: COMPANY.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: COMPANY.street,
      postalCode: COMPANY.postalCode,
      addressLocality: COMPANY.city,
      addressRegion: COMPANY.province,
      addressCountry: 'IT',
    },
    sameAs: [COMPANY.tradeSite],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      availableLanguage: ['Italian'],
      email: COMPANY.email,
      telephone: `+${COMPANY.whatsappE164}`,
      url: `${MARKETING_ORIGIN}/iscriviti`,
    },
  };
}

export function softwareApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    url: MARKETING_ORIGIN,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: PLAN_CATALOG.map((plan) => ({
      '@type': 'Offer',
      name: plan.name,
      price: plan.listEuro.toFixed(2),
      priceCurrency: 'EUR',
      url: `${MARKETING_ORIGIN}/prezzi`,
    })),
  };
}

export function productOffersJsonLd() {
  return PLAN_CATALOG.map((plan) => ({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${SITE_NAME} ${plan.name}`,
    description: plan.blurb,
    brand: {
      '@type': 'Brand',
      name: SITE_NAME,
    },
    offers: {
      '@type': 'Offer',
      price: plan.listEuro.toFixed(2),
      priceCurrency: 'EUR',
      url: `${MARKETING_ORIGIN}/iscriviti?piano=${plan.id}`,
      availability: 'https://schema.org/InStock',
    },
  }));
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${MARKETING_ORIGIN}${item.path === '/' ? '/' : item.path}`,
    })),
  };
}

export function faqPageJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}
