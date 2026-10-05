import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { isAdminAppPath } from '@/utils/hosts';
import styles from './ConsentBar.module.css';

declare global {
  interface Window {
    __MCC_GOOGLE?: { ga4MeasurementId?: string };
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const COOKIE = 'mcc_ga';

function readConsent() {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|; )mcc_ga=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function writeConsent(value: '1' | '0') {
  const maxAge = 60 * 60 * 24 * 180;
  document.cookie = `${COOKIE}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function loadGtag(id: string) {
  if (typeof window === 'undefined' || window.gtag) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments as unknown as never);
  };
  window.gtag('js', new Date());
  window.gtag('config', id, { anonymize_ip: true, send_page_view: false });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);
}

export function GoogleTags() {
  const router = useRouter();
  const [id, setId] = useState('');
  const [consent, setConsent] = useState('');

  useEffect(() => {
    setId(String(window.__MCC_GOOGLE?.ga4MeasurementId || '').trim());
    setConsent(readConsent());
  }, []);

  useEffect(() => {
    if (!id || consent !== '1' || isAdminAppPath(router.pathname)) return;
    loadGtag(id);
    window.gtag?.('event', 'page_view', { page_path: router.asPath });
  }, [id, consent, router.asPath, router.pathname]);

  if (!id || isAdminAppPath(router.pathname) || consent === '1' || consent === '0') {
    return null;
  }

  return (
    <div className={styles.bar} role="dialog" aria-label="Consenso Google Analytics">
      <p>
        Usiamo Google Analytics per capire come viene usato il sito. Parte solo se accetti. Dettagli nella
        pagina <Link href="/cookie">cookie</Link>.
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.reject} onClick={() => { writeConsent('0'); setConsent('0'); }}>
          Rifiuta
        </button>
        <button type="button" className={styles.accept} onClick={() => { writeConsent('1'); setConsent('1'); }}>
          Accetta
        </button>
      </div>
    </div>
  );
}
