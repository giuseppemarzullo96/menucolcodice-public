import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import { listPublishedPosts, type BlogPost } from '@/server/blogStore';
import { breadcrumbJsonLd } from '@/seo/jsonld';
import styles from '@/styles/marketing.module.css';

type Props = { posts: BlogPost[] };

export default function BlogIndexPage({ posts }: Props) {
  return (
    <MarketingLayout
      title="Blog | Menu col codice"
      description="Guide pratiche per chi gestisce un ristorante, bar, pizzeria o gelateria: menu digitale, QR code, allergeni e organizzazione del locale."
      path="/blog"
      jsonLd={breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Blog', path: '/blog' },
      ])}
    >
      <section className={styles.hero}>
        <h1>Blog</h1>
        <p className={styles.lead}>
          Guide pratiche per chi gestisce un locale: menu digitale, QR code, allergeni e organizzazione.
        </p>
      </section>

      <section className={styles.featureGrid}>
        {posts.length === 0 ? (
          <p className={styles.sectionLead}>Presto i primi articoli.</p>
        ) : (
          posts.map((post) => (
            <article key={post.slug} className={styles.featureCard}>
              <Link href={`/blog/${post.slug}`}>
                {post.coverImage ? (
                  <img
                    src={post.coverImage}
                    alt={post.h1}
                    width={1200}
                    height={630}
                    style={{ width: '100%', height: 'auto', borderRadius: 8, marginBottom: '0.5rem' }}
                  />
                ) : null}
                <h3>{post.title}</h3>
              </Link>
              <p>{post.description}</p>
            </article>
          ))
        )}
      </section>
    </MarketingLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  return { props: { posts: listPublishedPosts() } };
};
