import { useCart } from '../../context/CartContext';
import { formatCurrency } from '../../lib/formatters';
import styles from './CartSummary.module.css';

export default function CartSummary() {
  const { subtotal, deliveryFee, discountAmount, total, coupon, isFreeDelivery } = useCart();

  return (
    <div className={styles.summary}>
      <div className={styles.row}>
        <span>Subtotal</span>
        <span>{formatCurrency(subtotal)}</span>
      </div>
      <div className={styles.row}>
        <span>Taxa de entrega</span>
        <span>{isFreeDelivery ? <span style={{ color: 'var(--success)' }}>Gratis</span> : formatCurrency(deliveryFee)}</span>
      </div>
      {discountAmount > 0 && (
        <div className={styles.row}>
          <span>Desconto {coupon ? `(${coupon})` : ''}</span>
          <span className={styles.discount}>-{formatCurrency(discountAmount)}</span>
        </div>
      )}
      <div className={`${styles.row} ${styles.total}`}>
        <span>Total</span>
        <span>{formatCurrency(total)}</span>
      </div>
    </div>
  );
}
