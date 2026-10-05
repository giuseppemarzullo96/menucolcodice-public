import styles from '@/styles/marketing.module.css';

export type PayMethod = 'stripe' | 'paypal';

type Props = {
  value: PayMethod;
  onChange: (method: PayMethod) => void;
  stripeOk: boolean;
  paypalOk: boolean;
};

export function PaymentMethodPicker({ value, onChange, stripeOk, paypalOk }: Props) {
  if (!stripeOk && !paypalOk) return null;

  return (
    <div className={styles.payField}>
      <p className={styles.payLegend}>Pagamento</p>
      <div className={styles.payMethods} role="radiogroup" aria-label="Metodo di pagamento">
        {stripeOk ? (
          <button
            type="button"
            role="radio"
            aria-checked={value === 'stripe'}
            className={`${styles.payMethod} ${value === 'stripe' ? styles.payMethodActive : ''}`}
            onClick={() => onChange('stripe')}
          >
            <img src="/brand/payments/stripe.svg" alt="Stripe" className={styles.payLogoStripe} />
            <span className={styles.payHint}>Carta di credito o debito</span>
          </button>
        ) : null}
        {paypalOk ? (
          <button
            type="button"
            role="radio"
            aria-checked={value === 'paypal'}
            className={`${styles.payMethod} ${value === 'paypal' ? styles.payMethodActive : ''}`}
            onClick={() => onChange('paypal')}
          >
            <img src="/brand/payments/paypal.svg" alt="PayPal" className={styles.payLogoPaypal} />
            <span className={styles.payHint}>Conto PayPal</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
