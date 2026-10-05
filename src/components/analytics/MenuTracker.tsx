import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { isAdminAppPath, isMarketingPath } from '@/utils/hosts';

type AnalyticsType =
  | 'session_start'
  | 'page_view'
  | 'qr_scan'
  | 'dwell'
  | 'scroll'
  | 'dish_open'
  | 'category_view'
  | 'outbound';

function skipPath(pathName: string) {
  const pathOnly = String(pathName || '/').split('?')[0];
  return (
    isAdminAppPath(pathOnly) ||
    isMarketingPath(pathOnly) ||
    pathOnly === '/qr' ||
    pathOnly.startsWith('/api')
  );
}

function send(type: AnalyticsType, payload: Record<string, string | number> = {}) {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname || '/';
  if (skipPath(path)) return;
  const body = JSON.stringify({ type, path, ...payload });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/event', new Blob([body], { type: 'application/json' }));
      return;
    }
  } catch {
    /* fetch */
  }
  fetch('/api/analytics/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

function once(key: string) {
  try {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, '1');
    return true;
  } catch {
    return true;
  }
}

function dishIdFromPath(pathName: string) {
  const match = String(pathName || '').match(/^\/dishes\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function dishNameFromPage() {
  const heading = document.querySelector('h1');
  return String(heading?.textContent || '').trim().slice(0, 80);
}

export function MenuTracker() {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;
    if (skipPath(router.pathname) || skipPath(router.asPath)) return;

    if (once('mcc_session')) send('session_start');

    const params = new URLSearchParams(window.location.search);
    if (params.get('src') === 'qr' && once('mcc_qr')) send('qr_scan');

    send('page_view');
    const id = dishIdFromPath(router.asPath.split('?')[0]);
    if (id) {
      window.setTimeout(() => {
        send('dish_open', { dishId: id, dishName: dishNameFromPage() });
      }, 400);
    }
    const hash = decodeURIComponent((router.asPath.split('#')[1] || '').trim());
    if (hash && router.pathname === '/dishes') {
      send('category_view', { category: hash.slice(0, 60) });
    }

    let started = Date.now();
    let sentScroll = 0;
    const flushDwell = () => {
      const seconds = Math.round((Date.now() - started) / 1000);
      if (seconds >= 2) send('dwell', { seconds });
      started = Date.now();
    };

    const onScroll = () => {
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      const pct = Math.round((window.scrollY / max) * 100);
      const buckets = [25, 50, 75, 100];
      buckets.forEach((depth) => {
        if (pct >= depth && sentScroll < depth) {
          sentScroll = depth;
          send('scroll', { depth });
        }
      });
    };

    const onHidden = () => {
      if (document.visibilityState === 'hidden') flushDwell();
    };

    const onClick = (event: MouseEvent) => {
      const link = (event.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!link) return;
      const href = String(link.href || '').toLowerCase();
      let target = '';
      if (href.includes('wa.me') || href.includes('whatsapp')) target = 'whatsapp';
      else if (href.includes('glovo')) target = 'glovo';
      else if (href.includes('deliveroo')) target = 'deliveroo';
      else if (href.includes('justeat') || href.includes('just-eat')) target = 'justeat';
      else if (href.includes('facebook.com')) target = 'facebook';
      else if (href.includes('instagram.com')) target = 'instagram';
      if (target) send('outbound', { target });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', flushDwell);
    document.addEventListener('click', onClick, true);
    onScroll();

    return () => {
      flushDwell();
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', flushDwell);
      document.removeEventListener('click', onClick, true);
    };
  }, [router.isReady, router.asPath, router.pathname]);

  return null;
}
