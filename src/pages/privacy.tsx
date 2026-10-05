import type { GetServerSideProps } from 'next';
import { LegalPage } from '@/components/marketing/LegalPage';
import { TenantPrivacy } from '@/components/legal/TenantPrivacy';
import { COMPANY, COMPANY_WHATSAPP_URL } from '@/seo/company';
import { MARKETING_SEO } from '@/seo/marketingPages';
import { buildVenueLegal, type VenueLegal } from '@/seo/venueLegal';
import { getTenantBySlug, slugFromHost, withTenantPage } from '@/server/tenant';
import { isMarketingHost } from '@/utils/hosts';

export default function PrivacyPage({ mode, venue }: { mode: 'marketing' | 'tenant'; venue?: VenueLegal }) {
  if (mode === 'tenant' && venue) {
    return <TenantPrivacy venue={venue} />;
  }

  const seo = MARKETING_SEO.privacy;
  return (
    <LegalPage
      title={seo.title}
      description={seo.description}
      path={seo.path}
      heading="Informativa privacy"
      updated={COMPANY.lastUpdated}
      crumb="Privacy"
    >
      <p>
        Questa pagina spiega quali dati usiamo quando visiti {COMPANY.website} o crei un menu su Menu col
        codice. È scritta per il ristoratore. Non sostituisce un parere legale.
      </p>
      <p>
        Il menu che vedono i clienti al tavolo ha una pagina sua: su ogni locale,{' '}
        <code>nomelocale.menucolcodice.it/privacy</code>.
      </p>

      <h2>Titolare del trattamento</h2>
      <p>
        Titolare: {COMPANY.legalName} (nome commerciale {COMPANY.tradeName}), P. IVA {COMPANY.vatId}.
      </p>
      <p>Sede: {COMPANY.seat}</p>
      <p>
        Email: <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
        {' · '}
        WhatsApp:{' '}
        <a href={COMPANY_WHATSAPP_URL}>{COMPANY.whatsappDisplay}</a>
      </p>
      <p>
        Responsabile della protezione dei dati (DPO): {COMPANY.dpoName}. Stessi recapiti del titolare.
      </p>

      <h2>Quali dati trattiamo</h2>
      <h3>Se visiti il sito</h3>
      <p>
        Per far funzionare le pagine, il server può registrare dati tecnici di connessione (per esempio
        data, pagina richiesta, indirizzo IP). Non usiamo questi dati per profilarti. I log del server
        si conservano {COMPANY.logRetentionDays} giorni.
      </p>
      <p>
        Se colleghiamo Google Analytics, parte solo dopo il tuo consenso (cookie <code>mcc_ga</code>).
        Sui menu dei locali contiamo anche, in forma aggregata, QR, tempo, scroll e piatti aperti: lo
        vede il ristoratore sul suo pannello e noi nella panoramica piattaforma.
      </p>

      <h3>Se crei un menu</h3>
      <p>Quando ti iscrivi chiediamo:</p>
      <ul>
        <li>nome del locale</li>
        <li>indirizzo del menu (sottodominio, tipo nomelocale.menucolcodice.it)</li>
        <li>email</li>
        <li>piano scelto (Free, Media o Pro)</li>
      </ul>
      <p>
        Nel pannello puoi inserire i dati del locale e del menu: piatti, prezzi, categorie, foto, colori,
        logo, orari, recapiti che vuoi mostrare ai clienti. Restano nel tuo spazio, per pubblicare il menu.
      </p>

      <h3>Se paghi Media o Pro</h3>
      <p>
        Il pagamento passa da Stripe (carta) o da PayPal, a seconda di cosa scegli in iscrizione. I dati
        della carta o del conto li gestisce il gestore del pagamento, non noi. Noi riceviamo quanto serve
        per collegare l’abbonamento al locale (per esempio l’identificativo dell’abbonamento e lo stato del
        pagamento).
      </p>

      <h3>Se usi WhatsApp (piano Pro)</h3>
      <p>
        Per aggiornare il menu da WhatsApp associamo il numero che ci indichi al tuo locale. Trattiamo i
        messaggi che ci scrivi per eseguire i comandi sul menu. Non è un canale per prendere ordinazioni
        dai clienti al tavolo.
      </p>

      <h3>Se fotografi il menu di carta (piano Pro)</h3>
      <p>
        Le foto del foglio servono a leggere piatti e prezzi e a proporti una bozza da controllare.
        Controlla sempre il risultato prima di pubblicare. Non usare foto con dati di persone se non ti
        servono per il menu.
      </p>

      <h3>I clienti che aprono il menu</h3>
      <p>
        Chi inquadra il QR vede il menu sul telefono, senza creare un account da noi. Non chiediamo nome o
        email al cliente al tavolo. Non gestiamo ordinazioni né pagamenti al tavolo. Contiamo in aggregato
        come viene usato quel menu (visite, QR, tempo, scroll, piatti).
      </p>

      <h2>Perché li usiamo</h2>
      <ul>
        <li>creare e far funzionare il tuo menu e il pannello (contratto)</li>
        <li>scriverti all’email di iscrizione quando il menu è pronto, con i link al menu e al pannello (contratto). L’invio passa dal server di posta IONOS della casella {COMPANY.email}</li>
        <li>addebitare Media e Pro tramite Stripe o PayPal (contratto)</li>
        <li>risponderti se ci scrivi via email o WhatsApp (interesse legittimo o, se ci dai un consenso, il consenso)</li>
        <li>obblighi di legge, per esempio fiscali sui pagamenti</li>
      </ul>

      <h2>Dove stanno e a chi arrivano</h2>
      <p>
        I dati del menu stanno sui server di {COMPANY.hosting}, per locale. Non trasferiamo i dati del
        menu verso Paesi extra-UE. Se ci scrivi su WhatsApp, il messaggio passa da Meta. Se paghi, il
        pagamento passa da Stripe o da PayPal.
      </p>

      <h2>Quanto li teniamo</h2>
      <p>
        I dati del locale restano finché l’account è attivo. Se smetti di pagare Media o Pro, per{' '}
        {COMPANY.unpaidKeepDays} giorni il menu resta visibile ma non modificabile; poi archiviamo i
        dati.
      </p>

      <h2>I tuoi diritti</h2>
      <p>
        Puoi chiedere accesso, rettifica, cancellazione, limitazione, opposizione e, dove previsto, la
        portabilità. Puoi scrivere a <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> o su
        WhatsApp al <a href={COMPANY_WHATSAPP_URL}>{COMPANY.whatsappDisplay}</a>. Puoi anche presentare
        reclamo al Garante per la protezione dei dati personali.
      </p>

      <h2>Minori</h2>
      <p>Il servizio è pensato per titolari di locali, non per i minori.</p>
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
