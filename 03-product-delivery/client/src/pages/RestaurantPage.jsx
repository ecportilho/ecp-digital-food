import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useCart } from '../context/CartContext';
import { CoverTag } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import MenuItemCard from '../components/restaurant/MenuItemCard';
import CartPanel from '../components/cart/CartPanel';
import { formatCurrency, formatNumber, pluralize } from '../lib/formatters';
import styles from './RestaurantPage.module.css';

export default function RestaurantPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const api = useApi();
  const cart = useCart();
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/api/restaurants/${id}`),
      api.get(`/api/restaurants/${id}/menu`),
    ])
      .then(([rest, menu]) => {
        setRestaurant(rest);
        setMenuItems(menu || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    api.get('/api/favorites').then((favs) => {
      if (Array.isArray(favs)) {
        setIsFavorite(favs.some((f) => f.restaurant_id === id || f.id === id));
      }
    }).catch(() => {});
  }, [id]);

  const toggleFavorite = async () => {
    try {
      if (isFavorite) {
        await api.del(`/api/favorites/${id}`);
        setIsFavorite(false);
      } else {
        await api.post('/api/favorites', { restaurant_id: id });
        setIsFavorite(true);
      }
    } catch {}
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--muted)' }}>
        Carregando restaurante...
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--muted)' }}>
        Restaurante não encontrado
      </div>
    );
  }

  return (
    <div>
      {/* Screen Top */}
      <div className={styles.screenTop}>
        <Button variant="back" onClick={() => navigate(-1)}>&#8592;</Button>
        <h2 className="h2" style={{ flex: 1 }}>Restaurante</h2>
        <Button variant="icon" onClick={toggleFavorite}>
          {isFavorite ? '❤️' : '♡'}
        </Button>
      </div>

      {/* Banner */}
      <div
        className={styles.banner}
        style={{ background: restaurant.cover_gradient || 'linear-gradient(135deg, #7b61ff, #ff5fa2)' }}
      >
        <h1 className="h1" style={{ color: '#fff', fontSize: 'clamp(1.5rem, 4vw, 2.4rem)' }}>
          {restaurant.name}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
          {restaurant.hero_emoji || '🍽️'} {restaurant.cuisine}
          {restaurant.subtitle ? ` — ${restaurant.subtitle}` : ''}
        </p>
        <div className={styles.bannerMetas}>
          <CoverTag>⭐ {restaurant.rating?.toFixed(1)} &bull; {formatNumber(restaurant.review_count || 0)} avaliações</CoverTag>
          <CoverTag>⏱️ {restaurant.eta_min}-{restaurant.eta_max} min</CoverTag>
          <CoverTag>🚚 {restaurant.delivery_fee > 0 ? formatCurrency(restaurant.delivery_fee) : 'Grátis'}</CoverTag>
          {restaurant.promo_text && <CoverTag>🎟️ {restaurant.promo_text}</CoverTag>}
        </div>
      </div>

      <div className={styles.mainGrid}>
        <div>
          <div className={styles.sectionHeader}>
            <h2 className="h2">Cardápio</h2>
            <div className={styles.sectionCount}>
              {pluralize(menuItems.length, 'item', 'itens')}
            </div>
          </div>

          <div className={styles.menuGrid}>
            {menuItems.map((item) => (
              <MenuItemCard key={item.id} item={item} restaurant={restaurant} />
            ))}
          </div>
        </div>

        <CartPanel mode="sidebar" />
      </div>

      {cart.itemCount > 0 && <CartPanel mode="mobile" />}
    </div>
  );
}
