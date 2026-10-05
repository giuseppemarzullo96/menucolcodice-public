import { LegalPage } from '@/components/marketing/LegalPage';
import { COMPANY, COMPANY_WHATSAPP_URL } from '@/seo/company';
import { MARKETING_SEO } from '@/seo/marketingPages';
import { PLAN_CATALOG, formatEuro } from '@/utils/plans';

export default function TerminiPage() {
  const seo = MARKETING_SEO.termini;
  return (
    <LegalPage
      title={seo.title}
      description={seo.description}
      path={seo.path}
      heading="Termini del servizio"
      updated={COMPANY.lastUpdated}
      crumb="Termini"
    >
      <p>
        Questi termini regolano l’uso di Menu col codice. Il servizio è per titolari di ristoranti, bar
        e locali: crei un menu digitale e i clienti lo aprono inquadrando un QR.
      </p>
      <p>
        Fornitore: {COMPANY.legalName}, P. IVA {COMPANY.vatId}, sede {COMPANY.seat}.
      </p>

      <h2>Che cosa comprende</h2>
      <p>Con il servizio puoi:</p>
      <ul>
        <li>avere un indirizzo del tipo nomelocale.menucolcodice.it</li>
        <li>pubblicare piatti, categorie, prezzi e foto</li>
        <li>scegliere colori, logo e sfondo</li>
        <li>mostrare i piatti in elenco o in carosello</li>
        <li>stampare il QR dal pannello</li>
      </ul>
      <p>
        Con il piano Pro, in più: aggiornare il menu da WhatsApp e fotografare il menu di carta perché
        ne venga proposta una bozza da controllare.
      </p>
      <p>
        Il servizio non gestisce ordinazioni al tavolo, pagamenti dei clienti, traduzioni in altre
        lingue, né un registro automatico degli allergeni. Gli allergeni, se li scrivi nel menu, restano
        una tua indicazione: la responsabilità di legge sul menu resta del locale.
      </p>

      <h2>Piani e prezzi</h2>
      <ul>
        {PLAN_CATALOG.map((plan) => (
          <li key={plan.id}>
            <strong>{plan.name}</strong>
            {plan.listEuro === 0
              ? ': 0 €.'
              : `: ${formatEuro(plan.listEuro)} € al mese + IVA 22% (${formatEuro(plan.chargeEuro)} € IVA inclusa).`}{' '}
            {plan.dishes}. {plan.categories}.{' '}
            {plan.whatsapp ? 'Gestione da WhatsApp.' : 'Senza gestione tramite WhatsApp.'}{' '}
            {plan.ocr ? 'Scansione del menu cartaceo.' : 'Piatti inseriti a mano.'}
          </li>
        ))}
      </ul>
      <p>Pagamenti con carta (Stripe) o PayPal. Non chiediamo la carta per il piano Free.</p>
      <p>
        Oggi il menu sta solo su un indirizzo del tipo nomelocale.menucolcodice.it. Un dominio tuo (es.
        menu.tuolocale.it) non è ancora disponibile. Quando lo sarà, lo scriveremo qui e nelle pagine
        dei piani.
      </p>

      <h2>Account e contenuti</h2>
      <p>
        L’indirizzo del menu lo scegli tu, se è libero. I testi, i prezzi, le foto e i dati del locale
        che inserisci sono tuoi. Devi avere il diritto di usarli. Non pubblicare contenuti illeciti.
      </p>
      <p>
        Possiamo sospendere un menu se viola la legge o questi termini, o se il pagamento del piano a
        pagamento non risulta.
      </p>

      <h2>Durata, disdetta, mancato pagamento</h2>
      <p>Il piano Free non ha una data di scadenza dichiarata sul sito.</p>
      <p>
        Media e Pro si rinnovano tramite Stripe o PayPal, secondo l’abbonamento che confermi al
        pagamento. Se smetti di pagare, per {COMPANY.unpaidKeepDays} giorni il menu resta visibile ai
        clienti ma non si può più modificare dal pannello. Poi archiviamo i dati. La disdetta
        dell’abbonamento si gestisce dal gestore del pagamento (Stripe o PayPal).
      </p>
      <p>
        Un account vale per un locale. Per un altro locale ti registri di nuovo, con un altro indirizzo
        e un altro abbonamento se serve.
      </p>

      <h2>Disponibilità</h2>
      <p>
        Facciamo funzionare il servizio con diligenza. Non promettiamo un tempo di attività preciso
        (SLA) né un risarcimento automatico per un’interruzione.
      </p>

      <h2>Responsabilità</h2>
      <p>
        Il menu pubblicato è sotto la responsabilità del locale: prezzi, allergeni, surgelati, coperti
        e tutto ciò che la legge chiede di indicare. Menu col codice è lo strumento per mostrarlo.
      </p>

      <h2>Legge applicabile</h2>
      <p>
        Si applica la legge italiana. Foro competente: {COMPANY.court}.
      </p>

      <p>
        Per domande: <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
        {' · '}
        <a href={COMPANY_WHATSAPP_URL}>{COMPANY.whatsappDisplay}</a>.
      </p>
    </LegalPage>
  );
}
