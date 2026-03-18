import { useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import styles from './BottomNav.module.css';

const navItems = [
  { id: 'home', icon: '🏠', label: 'Início', path: '/' },
  { id: 'search', icon: '🔎', label: 'Buscar', path: '/?search=1' },
  { id: 'menu', icon: '🍽️', label: 'Cardápio', path: '/' },
  { id: 'cart', icon: '🛒', label: 'Carrinho', path: '/checkout' },
  { id: 'account', icon: '👤', label: 'Conta', path: '/profile' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { itemCount } = useCart();
  const { user } = useAuth();

  if (!user) return null;

  const getActiveId = () => {
    const p = location.pathname;
    if (p === '/') return 'home';
    if (p.startsWith('/checkout') || p === '/cart') return 'cart';
    if (p.startsWith('/profile') || p.startsWith('/admin') || p.startsWith('/restaurant-panel')) return 'account';
    if (p.startsWith('/favorites')) return 'menu';
    if (p.startsWith('/orders')) return 'home';
    return 'home';
  };

  const activeId = getActiveId();

  return (
    <nav className={styles.bottomNav}>
      {navItems.map((item) => (
        <button
          key={item.id}
          className={`${styles.navItem} ${activeId === item.id ? styles.active : ''}`}
          onClick={() => navigate(item.path)}
          aria-label={item.label}
        >
          <span className={styles.navItemIcon}>{item.icon}</span>
          <span className={styles.navItemLabel}>{item.label}</span>
          {item.id === 'cart' && itemCount > 0 && (
            <span className={styles.navBadge}>{itemCount}</span>
          )}
        </button>
      ))}
    </nav>
  );
}
