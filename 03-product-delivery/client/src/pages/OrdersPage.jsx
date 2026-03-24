import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useCart } from '../context/CartContext';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import { Tag } from '../components/ui/Badge';
import { formatCurrency, formatDate } from '../lib/formatters';
import styles from './OrdersPage.module.css';

const statusLabels = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  preparing: 'Em preparo',
  ready: 'Pronto',
  delivering: 'A caminho',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const statusColors = {
  pending: 'var(--muted)',
  confirmed: 'var(--brand)',
  preparing: 'var(--accent)',
  ready: 'var(--success)',
  delivering: 'var(--brand-2)',
  delivered: 'var(--success)',
  cancelled: 'var(--danger)',
};

export default function OrdersPage() {
  const navigate = useNavigate();
  const api = useApi();
  const cart = useCart();
  const showToast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/orders')
      .then((data) => setOrders(data || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  const repeatOrder = async (order) => {
    try {
      // Get the order items and add them to cart
      const details = await api.get(`/api/orders/${order.id}`);
      if (details?.items) {
        cart.clearCart();
        details.items.forEach((item) => {
          for (let i = 0; i < item.quantity; i++) {
            cart.addItem({
              menuItemId: item.menu_item_id,
              name: item.name,
              price: item.price,
              emoji: item.emoji || '🍽️',
              restaurantId: order.restaurant_id,
              restaurantName: order.restaurant_name || 'Restaurante',
              deliveryFee: 0,
            });
          }
        });
        showToast('Itens adicionados ao carrinho!', 'success');
        navigate('/checkout');
      }
    } catch {
      showToast('Erro ao repetir pedido', 'error');
    }
  };

  return (
    <div>
      <div className={styles.screenTop}>
        <Button variant="back" onClick={() => navigate('/')}>&#8592;</Button>
        <h2 className="h2" style={{ flex: 1 }}>Meus Pedidos</h2>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>Carregando...</div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '14px' }}>📋</div>
          <p>Nenhum pedido encontrado</p>
        </div>
      ) : (
        <div>
          {orders.map((order) => (
            <div key={order.id} className={styles.orderCard}>
              <div className={styles.orderHeader}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.92rem' }}>
                    {order.restaurant_name || 'Pedido'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                    #{order.id?.slice(0, 8)} &bull; {formatDate(order.created_at)}
                  </div>
                </div>
                <Tag>
                  <span style={{ color: statusColors[order.status] || 'var(--muted)' }}>
                    {statusLabels[order.status] || order.status}
                  </span>
                </Tag>
              </div>
              <div className={styles.orderItems}>
                {(order.items_summary || order.items || []).map((item, idx) => (
                  <span key={idx}>{item.quantity || 1}x {item.name}{idx < (order.items_summary || order.items || []).length - 1 ? ', ' : ''}</span>
                ))}
              </div>
              <div className={styles.orderFooter}>
                <div style={{ fontWeight: 800 }}>{formatCurrency(order.total || 0)}</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button variant="theme" onClick={() => navigate(`/orders/${order.id}`)}>
                    Detalhes
                  </Button>
                  {order.status === 'delivered' && (
                    <Button variant="mini" onClick={() => repeatOrder(order)}>
                      Repetir
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
