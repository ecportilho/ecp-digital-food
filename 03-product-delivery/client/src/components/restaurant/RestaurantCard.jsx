import { useNavigate } from 'react-router-dom';
import { CoverTag, MetaPill } from '../ui/Badge';
import Button from '../ui/Button';
import { formatCurrency } from '../../lib/formatters';
import styles from './RestaurantCard.module.css';

export default function RestaurantCard({ restaurant, selected = false, onSelect }) {
  const navigate = useNavigate();
  const tags = typeof restaurant.tags === 'string' ? JSON.parse(restaurant.tags || '[]') : (restaurant.tags || []);

  const handleClick = () => {
    onSelect?.(restaurant.id);
    navigate(`/restaurant/${restaurant.id}`);
  };

  return (
    <div
      className={`${styles.card} ${selected ? styles.selected : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      <div
        className={styles.cover}
        style={{ background: restaurant.cover_gradient || 'linear-gradient(135deg, #7b61ff, #ff5fa2)' }}
      >
        <div className={styles.coverTags}>
          {restaurant.rating > 0 && (
            <CoverTag>{`⭐ ${restaurant.rating.toFixed(1)}`}</CoverTag>
          )}
          {tags.map((tag, i) => (
            <CoverTag key={i}>{tag}</CoverTag>
          ))}
        </div>
      </div>
      <div className={styles.body}>
        <div className={styles.name}>{restaurant.name}</div>
        <div className={styles.cuisine}>
          {restaurant.hero_emoji || '🍽️'} {restaurant.cuisine}
          {restaurant.subtitle ? ` \u2022 ${restaurant.subtitle}` : ''}
        </div>
        <div className={styles.metas}>
          <MetaPill>{`⏱️ ${restaurant.eta_min}-${restaurant.eta_max} min`}</MetaPill>
          <MetaPill>
            🚚 {restaurant.delivery_fee > 0 ? formatCurrency(restaurant.delivery_fee) : 'Grátis'}
          </MetaPill>
          {restaurant.min_order > 0 && (
            <MetaPill>{`Min ${formatCurrency(restaurant.min_order)}`}</MetaPill>
          )}
        </div>
        {restaurant.promo_text && (
          <div className={styles.promo}>🎟️ {restaurant.promo_text}</div>
        )}
      </div>
    </div>
  );
}
