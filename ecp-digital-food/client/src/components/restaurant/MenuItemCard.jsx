import { Tag } from '../ui/Badge';
import Button from '../ui/Button';
import { useCart } from '../../context/CartContext';
import { useToast } from '../ui/Toast';
import { formatCurrency } from '../../lib/formatters';
import styles from './MenuItemCard.module.css';

export default function MenuItemCard({ item, restaurant }) {
  const { addItem } = useCart();
  const showToast = useToast();

  const handleAdd = (e) => {
    e.stopPropagation();
    addItem({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      emoji: item.emoji || '🍽️',
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      deliveryFee: restaurant.delivery_fee || 0,
    });
    showToast(`${item.name} adicionado ao carrinho`, 'success');
  };

  const badgeText = item.badge || '';

  return (
    <div className={styles.menuItem}>
      <div className={styles.top}>
        <div className={styles.info}>
          {badgeText && (
            <div className={styles.badgeRow}>
              <Tag>{badgeText}</Tag>
            </div>
          )}
          <h4 className="h4">{item.name}</h4>
          {item.description && (
            <p className={styles.desc}>{item.description}</p>
          )}
        </div>
        <div className={styles.emojiBox}>{item.emoji || '🍽️'}</div>
      </div>
      <div className={styles.bottom}>
        <div className={styles.price}>{formatCurrency(item.price)}</div>
        <Button variant="mini" onClick={handleAdd}>Adicionar</Button>
      </div>
    </div>
  );
}
