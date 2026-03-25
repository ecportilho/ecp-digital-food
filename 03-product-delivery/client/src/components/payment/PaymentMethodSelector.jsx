import styles from './Payment.module.css';

export default function PaymentMethodSelector({ selected, onSelect }) {
  return (
    <div className={styles.paymentMethods}>
      <div
        className={`${styles.paymentMethodCard} ${selected === 'credit_card' ? styles.selected : ''}`}
        onClick={() => onSelect('credit_card')}
        role="button"
        tabIndex={0}
      >
        <div className={styles.paymentMethodIcon}>💳</div>
        <div className={styles.paymentMethodTitle}>Cartao de Credito</div>
        <div className={styles.paymentMethodDesc}>Use seu cartao cadastrado</div>
      </div>
      <div
        className={`${styles.paymentMethodCard} ${selected === 'card' ? styles.selected : ''}`}
        onClick={() => onSelect('card')}
        role="button"
        tabIndex={0}
      >
        <div className={styles.paymentMethodIcon}>🏦</div>
        <div className={styles.paymentMethodTitle}>Cartao ECP Digital Bank</div>
        <div className={styles.paymentMethodDesc}>Debito direto na sua conta</div>
      </div>
      <div
        className={`${styles.paymentMethodCard} ${selected === 'pix' ? styles.selected : ''}`}
        onClick={() => onSelect('pix')}
        role="button"
        tabIndex={0}
      >
        <div className={styles.paymentMethodIcon}>📱</div>
        <div className={styles.paymentMethodTitle}>PIX QR Code</div>
        <div className={styles.paymentMethodDesc}>Escaneie e pague com qualquer banco</div>
      </div>
    </div>
  );
}
