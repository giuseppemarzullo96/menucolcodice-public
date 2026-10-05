import { useId, useState } from 'react';
import styles from '@/styles/marketing.module.css';

const FAQ_ITEMS = [
  {
    question: 'Non sono capace con il computer.',
    answer:
      'Se sai scrivere un messaggio, sai usare Menu col codice. Aggiungere un piatto vuol dire scrivere il nome e il prezzo in due caselle. E per entrare non serve una password: c\'è un codice.',
  },
  {
    question: 'E se i miei clienti non sanno usare il QR?',
    answer:
      'Non devono sapere niente: aprono la fotocamera e lo inquadrano, come per fare una foto. Funziona su tutti i telefoni degli ultimi otto anni. E puoi tenere qualche menu di carta per chi lo preferisce.',
  },
  {
    question: 'Quanto ci metto davvero?',
    answer:
      'Un menu da venti piatti si scrive in cinque minuti. Se hai il menu stampato, lo fotografi e ci metti meno.',
  },
  {
    question: 'Devo pagare subito?',
    answer:
      'No. Il piano Free è gratis e non scade: menu digitale, QR e grafica personalizzata fino a 30 piatti. Passi a pagamento solo se un giorno ti servono più piatti, statistiche o WhatsApp.',
  },
  {
    question: 'E i dati dei miei clienti?',
    answer:
      'Il menu non chiede niente a chi lo apre: né nome, né email, né registrazione. Le statistiche sono anonime e contano solo visite e piatti aperti.',
  },
];

export function FaqAccordion() {
  const baseId = useId();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className={styles.faqAccordion}>
      {FAQ_ITEMS.map((item, index) => {
        const isOpen = openIndex === index;
        const panelId = `${baseId}-panel-${index}`;
        const triggerId = `${baseId}-trigger-${index}`;

        return (
          <article key={item.question} className={`${styles.faqItem} ${isOpen ? styles.faqItemOpen : ''}`}>
            <h3 className={styles.faqHeading}>
              <button
                type="button"
                id={triggerId}
                className={styles.faqTrigger}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenIndex(isOpen ? null : index)}
              >
                <span className={styles.faqQuestion}>&quot;{item.question}&quot;</span>
                <span className={styles.faqChevron} aria-hidden="true" />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={triggerId}
              className={styles.faqPanel}
              hidden={!isOpen}
            >
              <p className={styles.faqAnswer}>{item.answer}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
