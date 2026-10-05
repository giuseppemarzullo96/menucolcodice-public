"use client";

import { useEffect, useRef } from "react";
import styles from "./ComeFunziona.module.css";
import { QR_MODULES, QR_PATH } from "./qrCode";

/* ------------------------------------------------------------------
   Sezione "Come funziona" — 4 card con mockup telefono animato.

   Note di implementazione:
   - le animazioni sono in CSS (transform/opacity), non in JS
   - il JS serve solo ad aggiungere/togliere la classe .isOn a viewport
     e ad animare i contatori numerici della card 4
   - con prefers-reduced-motion i contatori partono già dal valore finale
   ------------------------------------------------------------------ */

/** Permette di passare custom property CSS (--d, --w) via style senza errori TS. */
type Vars = React.CSSProperties & Record<`--${string}`, string | number>;

const PIATTI = [
  { nome: "Carbonara", prezzo: "12,00 €", d: "0.25s" },
  { nome: "Amatriciana", prezzo: "11,00 €", d: "0.85s" },
  { nome: "Tagliata", prezzo: "18,00 €", d: "1.45s" },
  { nome: "Tiramisù", prezzo: "6,00 €", d: "2.05s" },
  { nome: "Panna cotta", prezzo: "5,50 €", d: "2.65s" },
];

const PIU_GUARDATI = [
  { nome: "Tagliata", n: 23, w: 1, d: "0.8s" },
  { nome: "Carbonara", n: 17, w: 0.74, d: "0.95s" },
  { nome: "Tiramisù", n: 11, w: 0.48, d: "1.1s" },
  { nome: "Amatriciana", n: 6, w: 0.26, d: "1.25s" },
];

function useInView() {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const counters = el.querySelectorAll<HTMLElement>("[data-count]");

    const run = (node: HTMLElement) => {
      const to = Number(node.dataset.count);
      if (reduce) {
        node.textContent = String(to);
        return;
      }
      let t0: number | null = null;
      const dur = 1100;
      const step = (t: number) => {
        if (t0 === null) t0 = t;
        const k = Math.min((t - t0) / dur, 1);
        node.textContent = String(Math.round(to * (1 - Math.pow(1 - k, 3))));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add(styles.isOn);
          counters.forEach(run);
        } else {
          // riavvolge, così l'animazione riparte alla prossima visita
          el.classList.remove(styles.isOn);
          counters.forEach((n) => (n.textContent = "0"));
        }
      },
      { threshold: 0.3 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return ref;
}

function Card({
  step,
  titolo,
  testo,
  variante,
  children,
}: {
  step: string;
  titolo: string;
  testo: string;
  variante?: string;
  children: React.ReactNode;
}) {
  const ref = useInView();
  return (
    <article
      ref={ref as React.RefObject<HTMLElement>}
      className={[styles.card, variante].filter(Boolean).join(" ")}
    >
      <span className={styles.step}>{step}</span>
      <div className={styles.phone}>
        <div className={styles.notch} />
        <div className={styles.screen}>{children}</div>
      </div>
      <h3>{titolo}</h3>
      <p>{testo}</p>
    </article>
  );
}

export default function ComeFunziona() {
  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <h2>Tre passaggi. Poi è fatta.</h2>
        <p>Scrivi i piatti, stampi il QR, e da lì in poi cambi tutto dal telefono.</p>
      </div>

      <div className={styles.grid}>
        {/* ---------- 1 · scrivi i piatti ---------- */}
        <Card
          step="Passo 1"
          titolo="Scrivi i piatti"
          testo="Nome e prezzo, come la lista della spesa. Hai il menu di carta? Lo fotografi e si carica da solo."
          variante={styles.c1}
        >
          <div className={styles.bar}>
            <span>Osteria Lume</span>
          </div>
          <div className={styles.body}>
            {PIATTI.map((p, i) => (
              <div key={p.nome} className={styles.row} style={{ "--d": p.d } as Vars}>
                <span className={styles.name}>
                  {p.nome}
                  {i === PIATTI.length - 1 && <i className={styles.caret} />}
                </span>
                <span className={styles.price}>{p.prezzo}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* ---------- 2 · stampa il QR ---------- */}
        <Card
          step="Passo 2"
          titolo="Stampa il QR"
          testo="Lo metti sul tavolo. I clienti lo inquadrano con la fotocamera: niente app da scaricare."
          variante={styles.c2}
        >
          <div className={styles.bar}>
            <span>Il tuo QR</span>
          </div>
          <div className={styles.body}>
            <div className={styles.qrWrap}>
              <svg
                className={styles.qrClip}
                viewBox={`0 0 ${QR_MODULES} ${QR_MODULES}`}
                width="100%"
                height="100%"
                shapeRendering="crispEdges"
                role="img"
                aria-label="Codice QR del menu"
              >
                <path d={QR_PATH} fill="#1A1A17" />
              </svg>
            </div>
            <div className={styles.addr}>
              iltuolocale.menucolcodice.it
              <small>Scaricalo in PDF, già pronto da stampare</small>
            </div>
          </div>
        </Card>

        {/* ---------- 3 · cambi da WhatsApp ---------- */}
        <Card
          step="Passo 3"
          titolo="Cambi tutto da WhatsApp"
          testo="Scrivi un messaggio come faresti a un fornitore. Sul tavolo è già aggiornato."
          variante={styles.c3}
        >
          <div className={styles.bar}>
            <span>Osteria Lume</span>
          </div>
          <div className={styles.body}>
            {PIATTI.map((p, i) => (
              <div
                key={p.nome}
                className={[styles.row, i === 0 ? styles.target : ""].filter(Boolean).join(" ")}
              >
                <span className={styles.name}>
                  {p.nome}
                  {i === 0 && <i className={styles.strike} />}
                </span>
                {i === 0 && <i className={styles.finito}>FINITO</i>}
                <span className={styles.price}>{p.prezzo}</span>
              </div>
            ))}
          </div>
          <div className={styles.bubble}>
            <b>WHATSAPP</b>
            finita la carbonara
          </div>
        </Card>

        {/* ---------- 4 · statistiche ---------- */}
        <Card
          step="In più"
          titolo="Scopri cosa guardano"
          testo="Il menu di carta non te lo dirà mai: quante persone lo aprono e quali piatti guardano di più."
          variante={styles.c4}
        >
          <div className={styles.bar}>
            <span>Statistiche</span>
          </div>
          <div className={styles.body}>
            <div className={styles.kpi}>
              <div style={{ "--d": "0.25s" } as Vars}>
                <b data-count="84">0</b>
                <span>hanno aperto</span>
              </div>
              <div style={{ "--d": "0.45s" } as Vars}>
                <b data-count="61">0</b>
                <span>dal QR</span>
              </div>
            </div>

            <p className={styles.lbl}>Piatti più guardati</p>
            {PIU_GUARDATI.map((p) => (
              <div key={p.nome} className={styles.statBar}>
                <em>
                  {p.nome} <i>{p.n}</i>
                </em>
                <div className={styles.track}>
                  <div className={styles.fill} style={{ "--w": p.w, "--d": p.d } as Vars} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}
