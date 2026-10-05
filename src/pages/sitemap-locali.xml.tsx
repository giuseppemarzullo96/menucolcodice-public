import type { GetServerSideProps } from 'next';
import { localiSitemapXml, sendXml, todayStamp } from '@/seo/sitemap';

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  sendXml(res, localiSitemapXml(todayStamp()));
  return { props: {} };
};

export default function SitemapLocali() {
  return null;
}
