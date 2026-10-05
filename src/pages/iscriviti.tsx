import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import { MarketingPhoneField } from '@/components/marketing/MarketingPhoneField';
import { PaymentMethodPicker, type PayMethod } from '@/components/marketing/PaymentMethodPicker';
import { SignupWait } from '@/components/marketing/SignupWait';
import { PLAN_CATALOG, formatEuro, type CatalogPlanId } from '@/utils/plans';
import { MARKETING_SEO } from '@/seo/marketingPages';
import { breadcrumbJsonLd } from '@/seo/jsonld';
import styles from '@/styles/marketing.module.css';

function pause(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function IscrivitiPage() {
  const router = useRouter();
  const initial = String(router.query.piano || 'free');
  const [plan, setPlan] = useState<CatalogPlanId>('free');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoStatus, setPromoStatus] = useState<'idle' | 'ok' | 'bad' | 'checking'>('idle');
  const [promoMessage, setPromoMessage] = useState('');
  const [payMethod, setPayMethod] = useState<PayMethod>('stripe');
  const [stripeOk, setStripeOk] = useState(false);
  const [paypalOk, setPaypalOk] = useState(false);
  const [providersReady, setProvidersReady] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [waitSlug, setWaitSlug] = useState('');
  const [waitAdmin, setWaitAdmin] = useState('');
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'ok' | 'bad'>('idle');
  const [slugMessage, setSlugMessage] = useState('');

  useEffect(() => {
    if (initial === 'medium' || initial === 'pro' || initial === 'free') setPlan(initial);
  }, [initial]);

  useEffect(() => {
    fetch('/api/signup?providers=1')
      .then((r) => r.json())
      .then((data) => {
        const stripe = Boolean(data.stripe);
        const paypal = Boolean(data.paypal);
        setStripeOk(stripe);
        setPaypalOk(paypal);
        if (stripe) setPayMethod('stripe');
        else if (paypal) setPayMethod('paypal');
      })
      .catch(() => undefined)
      .finally(() => setProvidersReady(true));
  }, []);

  const selected = useMemo(() => PLAN_CATALOG.find((item) => item.id === plan) || PLAN_CATALOG[0], [plan]);
  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
  const paid = plan !== 'free';

  useEffect(() => {
    if (!cleanSlug) {
      setSlugStatus('idle');
      setSlugMessage('');
      return;
    }
    if (cleanSlug.length < 2) {
      setSlugStatus('bad');
      setSlugMessage('Troppo corto. Usa almeno 2 caratteri.');
      return;
    }
    setSlugStatus('checking');
    setSlugMessage('Controllo…');
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/signup?slug=${encodeURIComponent(cleanSlug)}`);
        const data = await response.json();
        if (data.available) {
          setSlugStatus('ok');
          setSlugMessage(`✓ ${cleanSlug} è libero`);
        } else {
          setSlugStatus('bad');
          setSlugMessage(
            data.message
              ? `✗ ${data.message}`
              : `✗ già preso, prova ${cleanSlug}-roma o ${cleanSlug}2`
          );
        }
      } catch {
        setSlugStatus('idle');
        setSlugMessage('');
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [cleanSlug]);

  useEffect(() => {
    if (!promoCode.trim() || plan === 'free') {
      setPromoStatus('idle');
      setPromoMessage('');
      return;
    }
    setPromoStatus('checking');
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/signup/validate-promo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: promoCode, plan, method: payMethod }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Codice non valido');
        setPromoStatus('ok');
        setPromoMessage(data.label || 'Codice applicato.');
      } catch (err) {
        setPromoStatus('bad');
        setPromoMessage(err instanceof Error ? err.message : 'Codice non valido');
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [promoCode, plan, payMethod]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (slugStatus === 'bad') {
      setError('Scegli un indirizzo libero prima di continuare.');
      return;
    }
    if (!phone || phone.replace(/\D/g, '').length < 8) {
      setError('Inserisci un numero di telefono valido.');
      return;
    }
    if (promoCode.trim() && promoStatus === 'bad') {
      setError(promoMessage || 'Codice promozionale non valido.');
      return;
    }
    if (promoCode.trim() && promoStatus === 'checking') {
      setError('Attendi la verifica del codice promozionale.');
      return;
    }
    setBusy(true);
    const adminGuess = `https://${cleanSlug}.menucolcodice.it/admin/login`;
    try {
      if (plan === 'free') {
        let admin = adminGuess;
        try {
          const response = await fetch('/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, slug: cleanSlug, email, phone, plan, promoCode: promoCode.trim() || undefined }),
          });
          if (response.status !== 409) {
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.message || 'Iscrizione non riuscita');
            admin = data.admin || admin;
          }
        } catch (err) {
          if (!(err instanceof TypeError)) throw err;
        }
        setWaitSlug(cleanSlug);
        setWaitAdmin(admin);
        return;
      }

      if (!providersReady) throw new Error('Attendi un attimo e riprova.');
      const method: PayMethod =
        payMethod === 'paypal' && paypalOk ? 'paypal' : stripeOk ? 'stripe' : paypalOk ? 'paypal' : 'stripe';
      if ((method === 'stripe' && !stripeOk) || (method === 'paypal' && !paypalOk)) {
        throw new Error('I pagamenti non sono ancora collegati. Riprova più tardi o scrivici.');
      }
      const endpoint = method === 'paypal' ? '/api/signup/paypal' : '/api/signup/stripe';
      const [response] = await Promise.all([
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, slug: cleanSlug, email, phone, plan, promoCode: promoCode.trim() || undefined }),
        }),
        pause(2800),
      ]);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || (method === 'paypal' ? 'PayPal non disponibile' : 'Pagamento non disponibile'));
      }
      window.location.href = data.checkoutUrl || data.approveUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore');
      setBusy(false);
      setWaitSlug('');
      setWaitAdmin('');
    }
  };

  const payLabel =
    !paid
      ? 'Crea il menu'
      : payMethod === 'paypal'
        ? 'Continua con PayPal'
        : 'Continua con carta';

  const submitClass =
    paid && payMethod === 'paypal'
      ? `${styles.button} ${styles.paySubmitPaypalBtn}`
      : styles.button;

  return (
    <>
      <SignupWait
        open={busy && Boolean(waitSlug)}
        slug={waitSlug}
        adminUrl={waitAdmin}
        onReady={(url) => {
          window.location.href = url;
        }}
      />
      <MarketingLayout
        title={MARKETING_SEO.iscriviti.title}
        description={MARKETING_SEO.iscriviti.description}
        path={MARKETING_SEO.iscriviti.path}
        jsonLd={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Crea il menu', path: '/iscriviti' },
        ])}
      >
        <section className={styles.hero}>
          <h1>Il tuo menu, il tuo indirizzo.</h1>
          <p className={styles.lead}>
            Scegli l’indirizzo web del menu. Esempio: osterialume.menucolcodice.it.
            {selected.listEuro > 0
              ? ` Piano ${selected.name}: ${formatEuro(selected.listEuro)} €/mese + IVA.`
              : ' Piano Free, subito online.'}
          </p>
          {router.query.cancelled ? <p className={styles.error}>Pagamento annullato. Puoi riprovare.</p> : null}
          <form className={styles.form} onSubmit={submit}>
            <label>
              Nome del locale
              <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
            </label>
            <label>
              L&apos;indirizzo del tuo menu
              <div className={styles.slugField}>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                  placeholder="osterialume"
                  pattern="[a-z0-9][a-z0-9-]{0,30}[a-z0-9]|[a-z0-9]"
                  aria-describedby="slug-help slug-status"
                />
                <span className={styles.slugSuffix}>.menucolcodice.it</span>
              </div>
            </label>
            <p id="slug-help" className={styles.fieldHint}>
              Corto e senza spazi. Lo puoi cambiare dopo.
            </p>
            {slugMessage ? (
              <p
                id="slug-status"
                className={`${styles.slugStatus} ${
                  slugStatus === 'ok' ? styles.slugOk : slugStatus === 'bad' ? styles.slugBad : ''
                }`}
              >
                {slugMessage}
              </p>
            ) : null}
            <label>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <p className={styles.fieldHint}>Serve solo per farti entrare. Non ti mandiamo pubblicità.</p>
            <label>
              Telefono
              <MarketingPhoneField value={phone} onChange={setPhone} required />
            </label>
            <p className={styles.fieldHint}>Obbligatorio per contattarti in caso di supporto.</p>
            <label>
              Codice promozionale
              <input
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder="Opzionale"
                autoComplete="off"
              />
            </label>
            {promoMessage ? (
              <p className={promoStatus === 'ok' ? styles.promoOk : promoStatus === 'bad' ? styles.promoBad : styles.fieldHint}>
                {promoMessage}
              </p>
            ) : (
              <p className={styles.fieldHint}>Se hai un codice sconto, inseriscilo qui (piani Media e Pro).</p>
            )}
            <label>
              Piano
              <select value={plan} onChange={(e) => setPlan(e.target.value as CatalogPlanId)}>
                {PLAN_CATALOG.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {item.listEuro ? ` — ${formatEuro(item.listEuro)} € + IVA` : ' — 0 €'}
                  </option>
                ))}
              </select>
            </label>
            {paid && (stripeOk || paypalOk) ? (
              <PaymentMethodPicker
                value={payMethod}
                onChange={setPayMethod}
                stripeOk={stripeOk}
                paypalOk={paypalOk}
              />
            ) : null}
            {error ? <p className={styles.error}>{error}</p> : null}
            <button className={submitClass} type="submit" disabled={busy || slugStatus === 'bad'}>
              {paid && (payMethod === 'stripe' || payMethod === 'paypal') ? (
                <span className={styles.paySubmitRow}>
                  <img
                    src={payMethod === 'paypal' ? '/brand/payments/paypal.svg' : '/brand/payments/stripe.svg'}
                    alt=""
                    aria-hidden
                    className={styles.paySubmitLogo}
                  />
                  {payLabel}
                </span>
              ) : (
                payLabel
              )}
            </button>
            <p className={styles.muted}>
              Nessuna carta di credito sul piano Free. Proseguendo accetti i{' '}
              <Link href="/termini">Termini</Link> e hai letto l’<Link href="/privacy">informativa privacy</Link>.
            </p>
          </form>
        </section>
      </MarketingLayout>
    </>
  );
}
