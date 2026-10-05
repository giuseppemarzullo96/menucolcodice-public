import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import { SignupWait } from '@/components/marketing/SignupWait';
import { MARKETING_SEO } from '@/seo/marketingPages';
import styles from '@/styles/marketing.module.css';

export default function IscrivitiOkPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [waitSlug, setWaitSlug] = useState('');
  const [waitAdmin, setWaitAdmin] = useState('');
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!router.isReady) return;
    const sessionId = String(router.query.session_id || router.query.sessionId || '');
    const subscriptionId = String(router.query.subscription_id || router.query.subscriptionId || '');
    if (!sessionId && !subscriptionId) {
      setBusy(false);
      setError('Manca la conferma del pagamento. Se hai pagato, scrivici: attiviamo il locale a mano.');
      return;
    }
    fetch('/api/signup/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionId ? { sessionId } : { subscriptionId }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || 'Attivazione non riuscita');
        const admin = String(data.admin || data.url || '').trim();
        const slug = admin.replace(/^https?:\/\//, '').split('.')[0].toLowerCase();
        if (!slug) throw new Error('Locale non trovato dopo il pagamento.');
        setWaitAdmin(admin);
        setWaitSlug(slug);
      })
      .catch((err) => {
        setBusy(false);
        setError(err instanceof Error ? err.message : 'Errore');
      });
  }, [router.isReady, router.query.session_id, router.query.sessionId, router.query.subscription_id, router.query.subscriptionId]);

  return (
    <>
      <SignupWait
        open={busy && !error && Boolean(waitSlug)}
        slug={waitSlug}
        adminUrl={waitAdmin}
        onReady={(url) => {
          window.location.href = url;
        }}
      />
      <MarketingLayout
        title={MARKETING_SEO.iscrivitiOk.title}
        description={MARKETING_SEO.iscrivitiOk.description}
        path={MARKETING_SEO.iscrivitiOk.path}
        noindex
      >
        <section className={styles.hero}>
          <h1>Pagamento ricevuto.</h1>
          <p className={styles.lead}>
            {error
              ? error
              : 'Stiamo aprendo il tuo menu e il pannello con connessione sicura. Appena il certificato è pronto ti portiamo dentro.'}
          </p>
        </section>
      </MarketingLayout>
    </>
  );
}
