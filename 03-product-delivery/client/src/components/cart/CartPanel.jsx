import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import CartItem from './CartItem';
import CartSummary from './CartSummary';
import Button from '../ui/Button';
import { formatCurrency } from '../../lib/formatters';
import styles from './CartPanel.module.css';

export default function CartPanel({ mode = 'sidebar' }) {
  const navigate = useNavigate();
  const cart = useCart();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (cart.items.length === 0) {
    return (
      <>
        {mode === 'sidebar' && (
          <div className={styles.sidebar}>
            <h3 className="h3" style={{ marginBottom: '14px' }}>🛒 Carrinho</h3>
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>🛍️</div>
              <h4 className="h4" style={{ marginBottom: '8px' }}>Carrinho vazio</h4>
              <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>
                Adicione itens de um restaurante para comecar seu pedido
              </p>
            </div>
          </div>
        )}
        {mode === 'page' && (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🛍️</div>
            <h4 className="h4" style={{ marginBottom: '8px' }}>Carrinho vazio</h4>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>
              Adicione itens de um restaurante para comecar seu pedido
            </p>
          </div>
        )}
      </>
    );
  }

  const cartContent = (
    <>
      <h3 className="h3" style={{ marginBottom: '14px' }}>🛒 Carrinho</h3>

      {/* Free delivery bar */}
      <div className={styles.freteBar}>
        <div style={{ fontSize: '0.84rem', fontWeight: 700, color: cart.isFreeDelivery ? 'var(--success)' : 'var(--muted)' }}>
          {cart.isFreeDelivery
            ? '🎉 Frete gratis!'
            : `Faltam ${formatCurrency(cart.freeDeliveryThreshold - cart.subtotal)} para frete gratis`}
        </div>
        <div className={styles.freteProgress}>
          <div className={styles.freteFill} style={{ width: `${cart.freeDeliveryProgress}%` }} />
        </div>
      </div>

      {cart.items.map((item) => (
        <CartItem key={item.menuItemId} item={item} />
      ))}

      <CartSummary />

      <Button
        variant="checkout"
        onClick={() => {
          setSheetOpen(false);
          navigate('/checkout');
        }}
        style={{ marginTop: '14px' }}
      >
        Fazer pedido — {formatCurrency(cart.total)}
      </Button>
    </>
  );

  if (mode === 'sidebar') {
    return (
      <div className={styles.sidebarWrapper}>
        <div className={styles.sidebar}>{cartContent}</div>
      </div>
    );
  }

  if (mode === 'page') {
    return <div>{cartContent}</div>;
  }

  /* Mobile bottom sheet + floating button */
  return (
    <>
      <button
        className={styles.mobileCartBtn}
        onClick={() => setSheetOpen(true)}
      >
        🛒 <span>Ver carrinho</span>{' '}
        <span className={styles.mobileCartTag}>
          {cart.itemCount} {cart.itemCount === 1 ? 'item' : 'itens'} &bull; {formatCurrency(cart.total)}
        </span>
      </button>

      {sheetOpen && (
        <>
          <div className={styles.backdrop} onClick={() => setSheetOpen(false)} />
          <div className={styles.bottomSheet}>
            <div className={styles.sheetHandle} />
            {cartContent}
          </div>
        </>
      )}
    </>
  );
}
