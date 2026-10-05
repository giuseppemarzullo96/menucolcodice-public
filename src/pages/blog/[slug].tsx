import type { GetServerSideProps } from 'next';
import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import { loadBlogPost, type BlogPost } from '@/server/blogStore';
import { breadcrumbJsonLd, faqPageJsonLd } from '@/seo/jsonld';
import { renderBlogBody, extractHeadings } from '@/utils/blogMarkdown';
import { MARKETING_ORIGIN } from '@/seo/site';
import styles from '@/styles/marketing.module.css';

type Props = { post: BlogPost; preview: boolean };

export default function BlogPostPage({ post, preview }: Props) {
  const headings = extractHeadings(post.body);
  return (
    <MarketingLayout
      title={post.title}
      description={post.description}
      path={`/blog/${post.slug}`}
      noindex={preview}
      image={post.coverImage ? `${MARKETING_ORIGIN}${post.coverImage}` : undefined}
      jsonLd={[
        breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Blog', path: '/blog' },
          { name: post.h1, path: `/blog/${post.slug}` },
        ]),
        ...(post.faqs.length ? [faqPageJsonLd(post.faqs)] : []),
      ]}
    >
      {preview ? (
        <p className={styles.sectionLead} style={{ background: '#fff3cd', padding: '0.75rem 1rem', borderRadius: 8 }}>
          Anteprima bozza — non indicizzata, non ancora pubblicata.
        </p>
      ) : null}

      <article>
        <section className={styles.hero}>
          <h1>{post.h1}</h1>
        </section>

        {post.coverImage ? (
          <section className={styles.section} style={{ paddingTop: 0 }}>
            <img
              src={post.coverImage}
              alt={post.h1}
              width={1200}
              height={630}
              style={{ width: '100%', height: 'auto', borderRadius: 12 }}
            />
          </section>
        ) : null}

        {headings.length > 1 ? (
          <nav className={styles.section} aria-label="Indice dell'articolo">
            <h2>In questo articolo</h2>
            <ul className={styles.plainList}>
              {headings.map((heading) => (
                <li key={heading.id}>
                  <a href={`#${heading.id}`}>{heading.text}</a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        <section className={`${styles.section} ${styles.articleBody}`}>{renderBlogBody(post.body)}</section>

        {post.faqs.length ? (
          <section className={styles.section}>
            <h2>Domande frequenti</h2>
            {post.faqs.map((faq) => (
              <div key={faq.question} style={{ marginBottom: '1.5rem' }}>
                <h3>{faq.question}</h3>
                <p className={styles.sectionLead}>{faq.answer}</p>
              </div>
            ))}
          </section>
        ) : null}
      </article>
    </MarketingLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ params, query }) => {
  const slug = String(params?.slug || '');
  const post = loadBlogPost(slug);
  if (!post) return { notFound: true };
  const preview = query.preview === '1';
  if (post.status !== 'published' && !preview) return { notFound: true };
  return { props: { post, preview: post.status !== 'published' } };
};
