import { COMPANY } from '@/seo/company';
import type { VenueLegal } from '@/seo/venueLegal';
import { TenantLegalLayout } from './TenantLegalLayout';
import Link from 'next/link';

export function TenantCookie({ venue }: { venue: VenueLegal }) {
  return (
    <TenantLegalLayout
      venue={venue}
      title={`Cookie — ${venue.name}`}
      description={`Cookie del menu digitale di ${venue.name}.`}
      heading="Cookie"
      crumb="Cookie"
    >
      <p>
        Questa pagina vale per il menu di {venue.name} su {venue.menuHost}.
      </p>

      <h2>Cosa è un cookie</h2>
      <p>
        È un piccolo file che il sito può lasciare sul telefono. Serve a far funzionare una pagina, a
        ricordare una scelta, o — se uno lo configura così — a misurare le visite.
      </p>

      <h2>Sul menu pubblico</h2>
      <p>
        Chi inquadra il QR vede i piatti senza registrarsi. Per quella consultazione misuriamo in modo
        aggregato scansioni del QR, pagine viste, tempo sulla pagina, profondità di scroll, piatti aperti
        e click sui link (WhatsApp, delivery, social). Non chiediamo nome o email. Non usiamo un cookie
        per questa misura: resta sul nostro server, per locale, e serve al ristoratore e alla piattaforma
        per capire come viene usato il menu.
      </p>
      <p>
        Se la piattaforma ha collegato Google Analytics, compare un avviso in basso. Analytics parte solo
        se accetti. In quel caso Google può impostare cookie propri e ricevere la pagina visitata. La
        scelta sta nel cookie <code>mcc_ga</code> (accetto o rifiuto), per sei mesi.
      </p>

      <h2>Sul pannello di gestione</h2>
      <p>
        Se entri in {venue.menuUrl}/admin con il codice di accesso, può essere impostato il cookie tecnico{' '}
        <code>admin_session</code>. Serve a tenerti collegato. Senza quello il pannello non sa chi sei.
        Dura quanto la sessione di lavoro.
      </p>

      <h2>Richieste a terzi (non sono cookie nostri)</h2>
      <ul>
        <li>
          <strong>Google Fonts</strong> — i caratteri delle pagine. Il telefono chiede i file a Google.
        </li>
        {venue.socialWhatsapp ? (
          <li>
            <strong>WhatsApp</strong> — solo se usi il pulsante sul menu. La chat sta su WhatsApp (Meta).
          </li>
        ) : null}
        {venue.delivery ? (
          <li>
            <strong>Glovo / Deliveroo / Just Eat</strong> — solo se apri quei link. Lì valgono i cookie di
            quel servizio.
          </li>
        ) : null}
        <li>
          <strong>Google Analytics</strong> — solo se è stato collegato dalla piattaforma e tu accetti
          l’avviso. Allora il telefono parla con i server di Google.
        </li>
      </ul>

      <h2>Come li controlli</h2>
      <p>
        Dal browser puoi cancellare i cookie o bloccarne di nuovi. Se blocchi il cookie di sessione del
        pannello, dovrai inserire di nuovo il codice di accesso. Per Google Analytics puoi rifiutare
        l’avviso, oppure cancellare il cookie <code>mcc_ga</code>.
      </p>

      <h2>Aggiornamenti</h2>
      <p>
        Se cambiamo gli strumenti di misura, aggiorniamo questa pagina. Informativa privacy:{' '}
        <Link href="/privacy">privacy di {venue.name}</Link>. Piattaforma: {COMPANY.legalName},{' '}
        <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
      </p>
    </TenantLegalLayout>
  );
}
