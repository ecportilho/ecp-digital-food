import { useCart } from '../../context/CartContext';
import { formatCurrency } from '../../lib/formatters';
import styles from './CartItem.module.css';

export default function CartItem({ item }) {
  const { updateQty, removeItem } = useCart();

  return (
    <div className={styles.cartItem}>
      <div className={styles.row}>
        <div>
          <div className={styles.name}>{item.emoji} {item.name}</div>
          <div className={styles.restaurant}>{item.restaurantName}</div>
        </div>
        <div className={styles.price}>{formatCurrency(item.price * item.quantity)}</div>
      </div>
      <div className={styles.row}>
        <div className={styles.qtyControl}>
          <button
            className={styles.qtyBtn}
            onClick={() => updateQty(item.menuItemId, item.quantity - 1)}
            aria-label="Diminuir quantidade"
          >
            −
          </button>
          <span className={styles.qtyValue}>{item.quantity}</span>
          <button
            className={styles.qtyBtn}
            onClick={() => updateQty(item.menuItemId, item.quantity + 1)}
            aria-label="Aumentar quantidade"
          >
            +
          </button>
        </div>
        <button
          className={styles.removeBtn}
          onClick={() => removeItem(item.menuItemId)}
          aria-label="Remover item"
        >
          Remover
        </button>
      </div>
    </div>
  );
}
