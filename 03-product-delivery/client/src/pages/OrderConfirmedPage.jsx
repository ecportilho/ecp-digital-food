import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import Button from '../components/ui/Button';
import GlassCard from '../components/ui/GlassCard';
import { formatCurrency, formatDate } from '../lib/formatters';
import styles from './OrderConfirmedPage.module.css';

const timelineSteps = [
  { key: 'confirmed', emoji: '✓', label: 'Pedido confirmado', desc: 'Pagamento aprovado' },
  { key: 'preparing', emoji: '👨‍🍳', label: 'Em preparo', desc: 'O restaurante está preparando seu pedido' },
  { key: 'out_for_delivery', emoji: '🚚', label: 'Saiu para entrega', desc: 'O entregador está indo até você' },
  { key: 'delivered', emoji: '🎉', label: 'Entregue', desc: 'Pedido entregue. Bom apetite!' },
];

const statusOrder = ['pending_payment', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'];

export default function OrderConfirmedPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const api = useApi();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/orders/${id}`)
      .then((data) => setOrder(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>Carregando...</div>;
  }

  if (!order) {
    return <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>Pedido não encontrado</div>;
  }

  const isCancelled = order.status === 'cancelled';
  const isFailed = order.status === 'payment_failed';
  const currentIdx = Math.max(0, statusOrder.indexOf(order.status));

  return (
    <div>
      <div className={styles.screenTop}>
        <Button variant="back" onClick={() => navigate('/orders')}>&#8592;</Button>
        <h2 className="h2" style={{ flex: 1 }}>Pedido #{order.id?.slice(0, 8)}</h2>
      </div>

      {/* Success / error header */}
      <GlassCard className={styles.successCard}>
        <div className={styles.successIcon}>
          {isCancelled ? '❌' : isFailed ? '⚠️' : '🎉'}
        </div>
        <h3 className="h3">
          {isCancelled ? 'Pedido cancelado' : isFailed ? 'Pagamento falhou' : 'Pedido confirmado!'}
        </h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginTop: '8px' }}>
          Total: {formatCurrency(order.total || 0)} &bull; {formatDate(order.created_at)}
        </p>
        {order.refund?.refunded && (
          <p style={{ color: 'var(--success)', fontSize: '0.84rem', marginTop: '6px', fontWeight: 700 }}>
            Estorno processado ({formatCurrency((order.refund.amount_cents || 0) / 100)})
          </p>
        )}
      </GlassCard>

      {/* Timeline */}
      {!isCancelled && !isFailed && (
        <GlassCard style={{ marginTop: '16px' }}>
          <div className={styles.timeline}>
            {timelineSteps.map((step) => {
              const stepIdx = statusOrder.indexOf(step.key);
              const isDone = currentIdx > stepIdx;
              const isActive = currentIdx === stepIdx;

              return (
                <div key={step.key} className={`${styles.timelineStep} ${isDone ? styles.done : ''}`}>
                  <div className={`${styles.timelineDot} ${isDone ? styles.dotDone : ''} ${isActive ? styles.dotActive : ''}`}>
                    {step.emoji}
                  </div>
                  <div className={styles.timelineInfo}>
                    <div className={styles.timelineTitle}>{step.label}</div>
                    <div className={styles.timelineDesc}>{step.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      <Button variant="checkout" onClick={() => navigate('/')} style={{ marginTop: '18px' }}>
        Voltar ao início
      </Button>
    </div>
  );
}
