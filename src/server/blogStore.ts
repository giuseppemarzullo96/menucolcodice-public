import fs from 'fs';
import path from 'path';

export type BlogPost = {
  slug: string;
  topic: string;
  title: string;
  description: string;
  h1: string;
  /** Corpo in markdown semplice: paragrafi separati da riga vuota, ## per sottotitoli. */
  body: string;
  faqs: { question: string; answer: string }[];
  /** Path pubblico, es. /blog-covers/<slug>.png. Generata dal brand kit reale. */
  coverImage?: string;
  status: 'draft' | 'published';
  createdAt: string;
  publishedAt?: string;
};

const DIR = path.join(process.cwd(), 'platform', 'blog', 'posts');

function ensureDir() {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
}

function postPath(slug: string) {
  return path.join(DIR, `${slug}.json`);
}

export function slugify(title: string): string {
  return String(title || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function saveBlogPost(post: BlogPost) {
  ensureDir();
  fs.writeFileSync(postPath(post.slug), JSON.stringify(post, null, 2), 'utf8');
}

export function loadBlogPost(slug: string): BlogPost | null {
  const file = postPath(slug);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

export function deleteBlogPost(slug: string) {
  const file = postPath(slug);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

function listAllPosts(): BlogPost[] {
  ensureDir();
  return fs
    .readdirSync(DIR)
    .filter((name) => name.endsWith('.json'))
    .map((name) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(DIR, name), 'utf8')) as BlogPost;
      } catch {
        return null;
      }
    })
    .filter((post): post is BlogPost => Boolean(post));
}

export function listPublishedPosts(): BlogPost[] {
  return listAllPosts()
    .filter((post) => post.status === 'published')
    .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
}

export function listDraftPosts(): BlogPost[] {
  return listAllPosts()
    .filter((post) => post.status === 'draft')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listUsedTopics(): string[] {
  return listAllPosts().map((post) => post.topic);
}

export function publishBlogPost(slug: string): BlogPost | null {
  const post = loadBlogPost(slug);
  if (!post) return null;
  post.status = 'published';
  post.publishedAt = new Date().toISOString();
  saveBlogPost(post);
  return post;
}
