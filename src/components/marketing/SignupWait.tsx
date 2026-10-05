import { useEffect, useRef, useState } from 'react';
import styles from '@/styles/marketing.module.css';

const LINES = [
  'Stiamo pulendo il bancone.',
  'Stiamo apparecchiando i tavoli.',
  'Stiamo stendendo le tovaglie.',
  'Stiamo accendendo le luci della sala.',
  'Stiamo aprendo il registro.',
  'Stiamo appendendo il menu.',
  'Stiamo scaldando i piatti.',
  'Stiamo chiudendo il lucchetto del locale.',
  'Quasi pronto: ti portiamo in sala.',
];

const SSL_LINE = 'Stiamo attivando il certificato di sicurezza (Let\'s Encrypt)...';
const POLL_MS = 2000;
const MAX_WAIT_MS = 10 * 60 * 1000;

type Props = {
  open: boolean;
  slug?: string;
  adminUrl?: string;
  onReady?: (url: string) => void;
};

export function SignupWait({ open, slug, adminUrl, onReady }: Props) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'provisioning' | 'ssl' | 'ready' | 'timeout'>('provisioning');
  const [readyUrl, setReadyUrl] = useState('');
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % LINES.length);
    }, 2400);
    return () => {
      document.body.style.overflow = previous;
      window.clearInterval(timer);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !slug) return;
    let cancelled = false;
    const started = Date.now();

    const poll = async () => {
      while (!cancelled && Date.now() - started < MAX_WAIT_MS) {
        try {
          const response = await fetch(`/api/signup/ready?slug=${encodeURIComponent(slug)}`);
          const data = await response.json();
          if (data.ready) {
            const url = String(data.admin || adminUrl || '').trim();
            if (!url) break;
            setPhase('ready');
            setReadyUrl(url);
            onReadyRef.current?.(url);
            return;
          }
          if (data.marker && !data.httpsOk) setPhase('ssl');
          else setPhase('provisioning');
        } catch {
          /* nginx/plesk possono ricaricarsi: riprova */
        }
        await new Promise((resolve) => window.setTimeout(resolve, POLL_MS));
      }
      if (!cancelled) setPhase('timeout');
    };

    setPhase('provisioning');
    setReadyUrl('');
    void poll();
    return () => {
      cancelled = true;
    };
  }, [open, slug, adminUrl]);

  if (!open) return null;

  const statusLine =
    phase === 'ssl'
      ? SSL_LINE
      : phase === 'ready'
        ? 'Certificato attivo. Ti portiamo al pannello...'
        : phase === 'timeout'
          ? 'Ci sta mettendo più del solito. Controlla la mail — ti mandiamo il link appena è tutto pronto.'
          : LINES[index];

  return (
    <div className={styles.wait} role="status" aria-live="polite">
      <div className={styles.waitInner}>
        <p className={styles.waitKicker}>Menu col codice</p>
        <p key={phase === 'ssl' ? 'ssl' : index} className={styles.waitLine}>
          {statusLine}
        </p>
        <div className={styles.waitBar} aria-hidden="true">
          <span />
        </div>
        {phase === 'ready' && readyUrl ? (
          <a className={styles.button} href={readyUrl}>
            Apri il pannello
          </a>
        ) : (
          <p className={styles.waitHint}>
            {phase === 'timeout'
              ? 'Non chiudere questa pagina se preferisci aspettare ancora un po’.'
              : 'Un momento. Prepariamo il tuo locale con connessione sicura.'}
          </p>
        )}
      </div>
    </div>
  );
}

/** Attende HTTPS valido prima di restituire l’URL admin (solo uso legacy lato client). */
export async function waitForAdmin(slug: string, adminUrl: string) {
  const started = Date.now();
  while (Date.now() - started < MAX_WAIT_MS) {
    try {
      const response = await fetch(`/api/signup/ready?slug=${encodeURIComponent(slug)}`);
      const data = await response.json();
      if (data.ready) return String(data.admin || adminUrl);
    } catch {
      /* riprova */
    }
    await new Promise((resolve) => window.setTimeout(resolve, POLL_MS));
  }
  throw new Error('Il certificato di sicurezza non è ancora pronto. Controlla la mail tra qualche minuto.');
}
