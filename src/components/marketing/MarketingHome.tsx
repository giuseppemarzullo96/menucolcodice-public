import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { MarketingLayout } from '@/components/marketing/MarketingLayout';
import { ViewModeSwitch, type MenuViewMode } from '@/components/ui/ViewModeSwitch';
import { MARKETING_SEO } from '@/seo/marketingPages';
import { softwareApplicationJsonLd } from '@/seo/jsonld';
import ComeFunziona from '@/components/marketing/ComeFunziona/ComeFunziona';
import { HeroParallax } from '@/components/marketing/HeroParallax';
import { Dish3DPreview } from '@/components/marketing/Dish3DPreview';
import { FaqAccordion } from '@/components/marketing/FaqAccordion';
import Link from 'next/link';
import styles from '@/styles/marketing.module.css';

const DEMO_HOME = 'https://demo.menucolcodice.it';
const DEMO_MENU = `${DEMO_HOME}/dishes`;

const FEATURES = [
  {
    icon: '📱',
    title: 'Il QR sul tavolo, e basta',
    body: 'Il cliente si siede, inquadra con la fotocamera, legge. Non scarica niente, non si registra, non aspetta. Lo stesso indirizzo lo metti sulla scheda Google, in bio su Instagram, o lo mandi a chi ti scrive "che avete stasera?".',
    highlight: false,
  },
  {
    icon: '🌾',
    title: 'Gli allergeni in regola, senza ristampare',
    body: 'I 14 allergeni previsti dalla legge li spunti con un clic, piatto per piatto. Il cliente celiaco o allergico li vede prima di ordinare. Cambi ricetta? Cambi la spunta, e basta.',
    highlight: true,
  },
  {
    icon: '📊',
    title: 'Scopri quali piatti guardano davvero',
    body: 'Il menu di carta non ti dice niente. Questo sì: quante persone hanno inquadrato il QR, a che ora, quanto sono rimaste e quali piatti hanno aperto di più. Così sai cosa mettere in alto e cosa forse è ora di togliere.',
    highlight: true,
  },
  {
    icon: '💬',
    title: 'Finita la carbonara? Lo scrivi su WhatsApp',
    body: 'Con il piano Pro mandi un messaggio — "togli la carbonara" — e sul menu è già sparita. La stessa chat che usi tutti i giorni, senza aprire niente. Solo dal tuo numero. Puoi anche fotografare il menu di carta (fino a 100 scansioni al mese).',
    highlight: false,
  },
  {
    icon: '🎨',
    title: 'Il menu ha la tua faccia, non la nostra',
    body: 'Il tuo logo, i tuoi colori, la foto del locale come sfondo. Chi lo apre capisce che è il tuo, non un modello scaricato.',
    highlight: false,
  },
  {
    icon: '🔗',
    title: 'Tutto da un solo indirizzo',
    body: 'Ci metti anche i link a Instagram, Facebook, Glovo, Deliveroo e Just Eat: il cliente trova il menu e ordina, da un posto solo.',
    highlight: false,
    code: 'iltuolocale.menucolcodice.it',
  },
  {
    icon: '🔒',
    title: 'Privacy e cookie già a posto',
    body: "Ogni menu ha la sua informativa privacy e cookie, generata con i dati del tuo locale. Non devi comprare nient'altro e non devi capirci niente.",
    highlight: false,
  },
  {
    icon: '🖼️',
    title: 'Due modi di mostrare i piatti',
    body: 'Elenco per un menu lungo e chiaro, come la carta. Carosello quando vuoi far vedere le foto grandi. Li cambi quando vuoi, dal pannello o dalla demo qui sopra.',
    highlight: false,
  },
];

export function MarketingHome() {
  const [previewView, setPreviewView] = useState<MenuViewMode>('list');

  return (
    <MarketingLayout
      title={MARKETING_SEO.home.title}
      description={MARKETING_SEO.home.description}
      path={MARKETING_SEO.home.path}
      jsonLd={softwareApplicationJsonLd()}
    >
      <div className={styles.heroStickyOuter}>
        <div className={styles.heroSplit}>
          <div className={`${styles.heroCopy} ${styles.heroCopySticky}`}>
            <h1>Il menu del tuo locale online in 5 minuti.</h1>
            <p className={styles.subhero}>
              Senza installare niente, senza saper usare il computer.
            </p>
            <p className={styles.lead}>
              Scrivi i piatti, scegli i colori, stampi il QR. I clienti lo inquadrano e vedono il menu sul telefono.
              Se cambia un prezzo lo cambi tu in dieci secondi, e sul tavolo è già aggiornato.
            </p>
            <div className={styles.actions}>
              <Link href="/iscriviti" className={styles.button}>
                Crea il menu — è gratis
              </Link>
              <p className={styles.heroNote}>Nessuna carta di credito. Il piano Free non scade.</p>
              <a href={DEMO_HOME} className={styles.buttonGhost}>
                Guarda una demo vera
              </a>
            </div>
          </div>

          <HeroParallax className={`${styles.heroVisual} ${styles.heroParallax}`}>
            <p className={styles.previewLabel}>Due design per i piatti: elenco o carosello.</p>
            <ViewModeSwitch
              value={previewView}
              onChange={setPreviewView}
              themeColors={{
                navbar: { background: '#1A1A17', textColor: '#FAF7F0' },
                sections: { titleColor: '#1A1A17' },
              }}
            />
            <div className={styles.phoneStage}>
              <div className={styles.iphone} aria-label="Anteprima del menu su iPhone">
                <span className={styles.iphoneAction} />
                <span className={styles.iphoneVolUp} />
                <span className={styles.iphoneVolDown} />
                <span className={styles.iphonePower} />
                <span className={styles.iphoneCameraControl} />
                <div className={styles.iphoneGlass}>
                  <div className={styles.iphoneScreen}>
                    <div className={styles.iphoneStatus} aria-hidden="true">
                      <div className={styles.dynamicIsland}>
                        <span className={styles.islandLens} />
                      </div>
                    </div>
                    <iframe
                      key={previewView}
                      title="Demo Menu col codice"
                      src={`${DEMO_MENU}?view=${previewView}`}
                      loading="lazy"
                    />
                    <div className={styles.iphoneHome} aria-hidden="true">
                      <span className={styles.homeIndicator} />
                    </div>
                  </div>
                </div>
              </div>
              <aside className={styles.demoQr}>
                <div className={styles.demoQrCanvas}>
                  <QRCodeSVG
                    value={DEMO_HOME}
                    size={156}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#1A1A17"
                    role="img"
                    aria-label="QR code demo Osteria Lume"
                  />
                </div>
                <p className={styles.demoQrLabel}>Inquadra e apri il menu demo sul telefono</p>
                <a href={DEMO_HOME} className={styles.demoQrLink}>
                  demo.menucolcodice.it
                </a>
              </aside>
            </div>
          </HeroParallax>
        </div>

        <section className={styles.trustBar} aria-label="Perché è semplice">
          <div className={styles.trustItem}>
            <strong>Pronto in 5 minuti</strong>
            <span>Scrivi i piatti e hai finito.</span>
          </div>
          <div className={styles.trustItem}>
            <strong>Niente app da scaricare</strong>
            <span>Né per te, né per i tuoi clienti.</span>
          </div>
          <div className={styles.trustItem}>
            <strong>Si entra con un codice</strong>
            <span>Non l&apos;ennesima password da dimenticare.</span>
          </div>
        </section>
      </div>

      <ComeFunziona />

      <section className={styles.section}>
        <h2>Cosa ci fai, in concreto</h2>
        <p className={styles.sectionLead}>
          Non è solo un PDF sul telefono: è il menu che usi tutti i giorni.
        </p>
      </section>
      <section className={styles.featureGrid} aria-label="Funzioni in concreto">
        {FEATURES.map((item) => (
          <article
            key={item.title}
            className={`${styles.featureCard} ${item.highlight ? styles.featureCardHot : ''}`}
          >
            <span className={styles.featureIcon} aria-hidden>
              {item.icon}
            </span>
            <h3>{item.title}</h3>
            <p>
              {item.code ? (
                <>
                  <code className={styles.inlineCode}>{item.code}</code>
                  {`. ${item.body}`}
                </>
              ) : (
                item.body
              )}
            </p>
          </article>
        ))}
      </section>

      <section className={`${styles.section} ${styles.sectionMuted} ${styles.section3d}`}>
        <div className={styles.section3dCopy}>
          <h2>E se vuoi stupire: i piatti in 3D.</h2>
          <p className={styles.lead}>
            Carichi il modello 3D di un piatto e il cliente lo gira con il dito, come un oggetto vero. Non è per tutti
            e non serve per partire — ma se il tuo locale punta sull&apos;immagine, in Italia non ce l&apos;ha quasi nessuno.
            Disponibile nel piano Pro.
          </p>
        </div>
        <div className={styles.section3dVisual}>
          <Dish3DPreview />
        </div>
      </section>

      <section className={styles.section}>
        <h2>Obiezioni frequenti</h2>
        <FaqAccordion />
        <div className={styles.actions} style={{ marginTop: '1.5rem' }}>
          <Link href="/prezzi" className={styles.button}>
            Vedi i prezzi
          </Link>
          <Link href="/iscriviti" className={styles.buttonGhost}>
            Crea il menu gratis
          </Link>
        </div>
      </section>
    </MarketingLayout>
  );
}
