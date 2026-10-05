import type { GetServerSideProps } from 'next';
import { marketingPagesXml, sendXml, todayStamp } from '@/seo/sitemap';

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  sendXml(res, marketingPagesXml(todayStamp()));
  return { props: {} };
};

export default function SitemapPages() {
  return null;
}
