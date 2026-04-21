import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useDebounce } from '../hooks/useDebounce';
import { BadgeHero } from '../components/ui/Badge';
import CategoryChips from '../components/ui/CategoryChips';
import RestaurantGrid from '../components/restaurant/RestaurantGrid';
import { RestaurantGridSkeleton } from '../components/ui/Skeleton';
import CartPanel from '../components/cart/CartPanel';
import { useCart } from '../context/CartContext';
import { pluralize } from '../lib/formatters';
import styles from './HomePage.module.css';

export default function HomePage() {
  const [restaurants, setRestaurants] = useState([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [loading, setLoading] = useState(true);
  const api = useApi();
  const cart = useCart();

  useEffect(() => {
    setLoading(true);
    api.get('/api/restaurants')
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.restaurants || []);
        setRestaurants(list);
        setFilteredRestaurants(list);
      })
      .catch(() => setRestaurants([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let result = restaurants;
    if (selectedCategory) {
      result = result.filter((r) => r.category_id === selectedCategory);
    }
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.cuisine.toLowerCase().includes(q) ||
          (r.subtitle || '').toLowerCase().includes(q)
      );
    }
    setFilteredRestaurants(result);
  }, [selectedCategory, debouncedSearch, restaurants]);

  const handleSearch = (e) => {
    e?.preventDefault();
  };

  return (
    <div>
      {/* Hero Banner */}
      <section className={styles.hero}>
        <div className={styles.heroLeft}>
          <div><BadgeHero>🔥 Promo do dia</BadgeHero></div>
          <h1 className="h1" style={{ color: 'var(--hero-text)' }}>
            Descubra sabores<br />que surpreendem
          </h1>
          <p className={styles.heroDesc}>
            Restaurantes premium com entrega rapida. Use <strong>MVP10</strong> para 10% off no primeiro pedido.
          </p>
          <form className={styles.searchBox} onSubmit={handleSearch}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Buscar restaurante, prato ou categoria..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className={`${styles.searchBtn} ${styles.searchBtnPrimary}`}>
              Buscar
            </button>
            <button type="button" className={`${styles.searchBtn} ${styles.searchBtnGhost}`}>
              📍 Perto
            </button>
          </form>
        </div>
        <div className={styles.heroRight}>
          <div className={styles.promoCard}>
            <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#fff' }}>🎟️ Cupom MVP10 — 10% off</div>
            <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>
              Valido para pedidos acima de R$ 30
            </p>
            <div className={styles.promoProgress}>
              <div className={styles.promoProgressFill} />
            </div>
            <div className={styles.promoStats}>
              <div className={styles.promoStat}>
                <div className={styles.promoStatValue}>847</div>
                <div className={styles.promoStatLabel}>Usos hoje</div>
              </div>
              <div className={styles.promoStat}>
                <div className={styles.promoStatValue}>R$ 12</div>
                <div className={styles.promoStatLabel}>Economia media</div>
              </div>
              <div className={styles.promoStat}>
                <div className={styles.promoStatValue}>4h</div>
                <div className={styles.promoStatLabel}>Restantes</div>
              </div>
            </div>
          </div>
          <div className={styles.mapCard}>
            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#fff', marginBottom: '10px' }}>📡 Mapa ao vivo</div>
            <div className={styles.mapDots}>
              <div className={styles.mapDot}>🍔</div>
              <div className={styles.mapDot}>🍣</div>
              <div className={styles.mapDot}>🥗</div>
              <div className={styles.mapDot}>🍕</div>
              <div className={styles.mapDot}>🍝</div>
              <div className={styles.mapDot}>🥩</div>
            </div>
            <div className={styles.mapMetrics}>
              <div className={styles.mapMetric}>
                <div className={styles.mapMetricValue}>{restaurants.length || 24}</div>
                <div className={styles.mapMetricLabel}>Restaurantes</div>
              </div>
              <div className={styles.mapMetric}>
                <div className={styles.mapMetricValue}>8</div>
                <div className={styles.mapMetricLabel}>Cupons ativos</div>
              </div>
              <div className={styles.mapMetric}>
                <div className={styles.mapMetricValue}>R$ 4,90</div>
                <div className={styles.mapMetricLabel}>Frete medio</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Chips */}
      <CategoryChips selected={selectedCategory} onSelect={setSelectedCategory} />

      {/* Section Header */}
      <div className={styles.sectionHeader}>
        <h2 className="h2">Restaurantes</h2>
        <div className={styles.sectionCount}>
          {pluralize(filteredRestaurants.length, 'restaurante encontrado', 'restaurantes encontrados')}
        </div>
      </div>

      {/* Main Grid */}
      <div className={styles.mainGrid}>
        <div>
          {loading ? (
            <RestaurantGridSkeleton count={6} />
          ) : (
            <RestaurantGrid restaurants={filteredRestaurants} />
          )}
        </div>

        {/* Cart Sidebar (desktop) */}
        <CartPanel mode="sidebar" />
      </div>

      {/* Mobile cart floating button */}
      {cart.itemCount > 0 && <CartPanel mode="mobile" />}
    </div>
  );
}

