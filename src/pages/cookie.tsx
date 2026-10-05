import type { GetServerSideProps } from 'next';
import { LegalPage } from '@/components/marketing/LegalPage';
import { TenantCookie } from '@/components/legal/TenantCookie';
import { COMPANY } from '@/seo/company';
import { MARKETING_SEO } from '@/seo/marketingPages';
import { buildVenueLegal, type VenueLegal } from '@/seo/venueLegal';
import { getTenantBySlug, slugFromHost, withTenantPage } from '@/server/tenant';
import { isMarketingHost } from '@/utils/hosts';
import Link from 'next/link';

export default function CookiePage({ mode, venue }: { mode: 'marketing' | 'tenant'; venue?: VenueLegal }) {
  if (mode === 'tenant' && venue) {
    return <TenantCookie venue={venue} />;
  }

  const seo = MARKETING_SEO.cookie;
  return (
    <LegalPage
      title={seo.title}
      description={seo.description}
      path={seo.path}
      heading="Cookie"
      updated={COMPANY.lastUpdated}
      crumb="Cookie"
    >
      <p>
        Questa pagina dice quali cookie usa Menu col codice sul sito di vendita. Google Analytics, se
        collegato, parte solo dopo il consenso. I menu dei locali hanno ognuno la pagina{' '}
        {`nomelocale.menucolcodice.it/cookie`}.
      </p>

      <h2>Cosa è un cookie</h2>
      <p>
        È un piccolo file che il sito può lasciare sul telefono o sul computer. Serve a far funzionare
        una pagina, a ricordare una scelta, o — se uno lo configura così — a misurare le visite.
      </p>

      <h2>Sul sito menucolcodice.it</h2>
      <p>
        Le pagine pubbliche (home, prezzi, iscrizione, queste pagine legali) non impostano cookie di
        marketing. Se in Chiavi è inserito un ID Google Analytics, compare un avviso: Analytics parte
        solo se accetti. La scelta sta nel cookie <code>mcc_ga</code>, per sei mesi.
      </p>
      <p>
        Il form di iscrizione invia nome del locale, indirizzo scelto ed email al server. Quello è un
        trattamento di dati, spiegato nell’<Link href="/privacy">informativa privacy</Link>. Non è, di per sé,
        un cookie.
      </p>

      <h2>Sul menu del locale</h2>
      <p>
        Il cliente al tavolo apre il menu senza registrarsi. La pagina cookie di quel locale spiega cosa
        succede lì. Sul menu contiamo visite, QR, tempo e scroll in forma aggregata, senza cookie di
        statistica nostri. Google Analytics, se collegato, chiede il consenso.
      </p>
      <p>
        Se entri nel pannello di gestione, può essere impostato un cookie tecnico di sessione
        (`admin_session`) per tenerti collegato dopo il codice di accesso. È necessario al servizio:
        senza quello il pannello non sa chi sei. Dura quanto la sessione di lavoro.
      </p>

      <h2>Servizi di altri</h2>
      <ul>
        <li>
          <strong>Stripe</strong> — se scegli di pagare con carta, il checkout avviene sul sito Stripe.
          Lì valgono i cookie e l’informativa di Stripe.
        </li>
        <li>
          <strong>PayPal</strong> — se scegli PayPal, il pagamento avviene sul sito PayPal. Lì
          valgono i cookie e l’informativa di PayPal.
        </li>
        <li>
          <strong>Caratteri</strong> — le pagine caricano i font da Google Fonts. È una richiesta a un
          server di terzi, non un cookie che impostiamo noi.
        </li>
        <li>
          <strong>Google Analytics</strong> — solo se è collegato e accetti l’avviso.
        </li>
        <li>
          <strong>WhatsApp</strong> — solo se usi la gestione menu del piano Pro. I messaggi stanno su
          WhatsApp, secondo le regole di Meta.
        </li>
      </ul>

      <h2>Come li controlli</h2>
      <p>
        Dal browser puoi cancellare i cookie o bloccarne di nuovi. Se blocchi il cookie di sessione del
        pannello, dovrai inserire di nuovo il codice di accesso. Per Analytics puoi rifiutare l’avviso o
        cancellare <code>mcc_ga</code>.
      </p>

      <h2>Aggiornamenti</h2>
      <p>
        Se cambiamo gli strumenti di misura, aggiorniamo questa pagina. Titolare: {COMPANY.legalName}, P.
        IVA {COMPANY.vatId}. Email: <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
      </p>
    </LegalPage>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  if (isMarketingHost(ctx.req.headers.host)) {
    return { props: { mode: 'marketing' } };
  }
  const tenant = getTenantBySlug(slugFromHost(ctx.req.headers.host));
  if (!tenant) return { notFound: true };
  return withTenantPage(ctx.req, () => ({
    props: {
      mode: 'tenant',
      venue: buildVenueLegal(tenant),
    },
  }));
};
