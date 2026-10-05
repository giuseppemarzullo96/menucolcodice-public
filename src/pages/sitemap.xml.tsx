import type { GetServerSideProps } from 'next';
import { sendXml, sitemapIndexXml, todayStamp } from '@/seo/sitemap';

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  sendXml(res, sitemapIndexXml(todayStamp()));
  return { props: {} };
};

export default function SitemapIndex() {
  return null;
}
