import { COMPANY, COMPANY_WHATSAPP_URL } from '@/seo/company';
import type { VenueLegal } from '@/seo/venueLegal';
import { TenantLegalLayout } from './TenantLegalLayout';
import Link from 'next/link';

export function TenantPrivacy({ venue }: { venue: VenueLegal }) {
  const venueContact =
    venue.email || venue.phone ? (
      <>
        {venue.email ? (
          <>
            email <a href={`mailto:${venue.email}`}>{venue.email}</a>
          </>
        ) : null}
        {venue.email && venue.phone ? ' · ' : null}
        {venue.phone ? <>telefono {venue.phone}</> : null}
      </>
    ) : (
      <>
        i recapiti pubblicati sul menu, oppure {COMPANY.legalName} a{' '}
        <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
      </>
    );

  return (
    <TenantLegalLayout
      venue={venue}
      title={`Privacy — ${venue.name}`}
      description={`Informativa privacy del menu digitale di ${venue.name}.`}
      heading="Informativa privacy"
      crumb="Privacy"
    >
      <p>
        Questa pagina vale per chi apre il menu di {venue.name} su {venue.menuHost}. È scritta in italiano
        chiaro. Non sostituisce un parere legale.
      </p>

      <h2>Chi tratta i dati</h2>
      <p>
        Il menu è pubblicato da <strong>{venue.name}</strong>
        {venue.addressLine ? <>, {venue.addressLine}</> : null}. Il locale decide cosa mostrare (piatti,
        prezzi, foto, recapiti).
      </p>
      <p>
        La piattaforma è {COMPANY.productName}, di {COMPANY.legalName}, P. IVA {COMPANY.vatId}, sede{' '}
        {COMPANY.seat}. {COMPANY.legalName} ospita la pagina sui server {COMPANY.hosting} e fa funzionare
        l’indirizzo {venue.menuHost}. Piano di questo menu: {venue.planName}.
      </p>

      <h2>Se apri il menu al tavolo</h2>
      <p>
        Non crei un account. Non chiediamo nome, email o carta. Non prendiamo ordinazioni né pagamenti al
        tavolo da questa pagina.
      </p>
      <p>
        Per far arrivare la pagina, il server può registrare dati tecnici di connessione (data, pagina
        richiesta, indirizzo IP). I log si conservano {COMPANY.logRetentionDays} giorni. In più
        contiamo, in forma aggregata, come viene usato il menu: scansioni del QR, tempo sulla pagina,
        scroll, piatti aperti, dispositivo (telefono/computer) e click sui link. Non associamo questi
        conteggi al tuo nome. Restano nello spazio del locale e nella panoramica della piattaforma, per
        migliorare il servizio.
      </p>
      <p>
        Le foto, i testi e i recapiti che vedi li ha inseriti il locale. Se in una foto o in un testo ci
        sono dati di persone, la responsabilità è di chi li ha pubblicati.
      </p>

      <h2>Se entri nel pannello del locale</h2>
      <p>
        Chi gestisce il menu usa un codice di accesso. In quel caso può essere impostato un cookie tecnico
        di sessione, spiegato nella <Link href="/cookie">pagina cookie</Link>.
      </p>

      <h2>Servizi di altri</h2>
      <ul>
        <li>
          Caratteri: le pagine caricano i font da Google Fonts. È una richiesta a un server di Google.
        </li>
        <li>
          Google Analytics: solo se la piattaforma lo ha collegato e accetti l’avviso cookie. Allora
          Google riceve dati di navigazione secondo le sue regole.
        </li>
        {venue.socialWhatsapp ? (
          <li>
            Pulsante WhatsApp sul menu: se lo usi, la chat sta su WhatsApp (Meta). Valgono le regole di
            Meta.
          </li>
        ) : null}
        {venue.whatsappManage ? (
          <li>
            Gestione menu via WhatsApp (piano Pro): il ristoratore scrive da un numero collegato al locale.
            I messaggi di comando passano da WhatsApp. Non è un canale per ordinare dal tavolo.
          </li>
        ) : null}
        {venue.delivery ? (
          <li>
            Link a Glovo, Deliveroo o Just Eat: se li apri, vale l’informativa di quel servizio.
          </li>
        ) : null}
      </ul>

      <h2>Perché</h2>
      <ul>
        <li>mostrarti il menu (esecuzione del servizio)</li>
        <li>capire come viene usato il menu, in forma aggregata (interesse legittimo / servizio)</li>
        <li>far funzionare i server e la sicurezza (interesse legittimo / servizio)</li>
        <li>obblighi di legge, se scattano</li>
      </ul>

      <h2>I tuoi diritti</h2>
      <p>
        Puoi chiedere accesso, rettifica, cancellazione, limitazione, opposizione e, dove previsto, la
        portabilità. Per il contenuto del menu scrivi a {venue.name}: {venueContact}.
      </p>
      <p>
        Per la piattaforma: <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
        {' · '}
        WhatsApp <a href={COMPANY_WHATSAPP_URL}>{COMPANY.whatsappDisplay}</a>. Puoi anche presentare reclamo
        al Garante per la protezione dei dati personali.
      </p>

      <p>
        Cookie: <Link href="/cookie">pagina cookie di questo menu</Link>.
      </p>
    </TenantLegalLayout>
  );
}
