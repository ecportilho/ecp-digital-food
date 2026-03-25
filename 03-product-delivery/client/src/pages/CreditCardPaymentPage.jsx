import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useApi } from '../hooks/useApi';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import GlassCard from '../components/ui/GlassCard';
import PaymentStatus from '../components/payment/PaymentStatus';
import { formatCurrency } from '../lib/formatters';
import styles from './PaymentPages.module.css';
import payStyles from '../components/payment/Payment.module.css';

export default function CreditCardPaymentPage() {
  const navigate = useNavigate();
  const cart = useCart();
  const api = useApi();
  const showToast = useToast();
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState('select'); // select | processing | done | error
  const [error, setError] = useState('');

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      const data = await api.get('/api/credit-cards');
      const list = Array.isArray(data) ? data : (data?.data || []);
      setCards(list);
      if (list.length > 0) {
        const defaultCard = list.find((c) => c.isDefault) || list[0];
        setSelectedCard(defaultCard.id);
      }
    } catch {
      setCards([]);
    } finally {
      setLoading(false);
    }
  };

  const syncCartToServer = async () => {
    // Clear server cart first
    const currentCart = await api.get('/api/cart').catch(() => ({ items: [] }));
    const serverItems = Array.isArray(currentCart?.items) ? currentCart.items : [];
    for (const si of serverItems) {
      await api.del(`/api/cart/items/${si.id}`).catch(() => {});
    }
    // Add current frontend items to server cart
    for (const item of cart.items) {
      await api.post('/api/cart/items', {
        menu_item_id: item.menuItemId,
        quantity: item.quantity,
      });
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedCard) return;
    setStep('processing');
    try {
      // 1. Sync frontend cart to server
      await syncCartToServer();

      // 2. Create the order
      const orderRes = await api.post('/api/orders', {
        address_text: 'Rua Augusta, 1234 — Sao Paulo, SP',
        coupon_code: cart.coupon || null,
        payment_method: 'credit_card',
      });
      const orderId = orderRes?.id || orderRes?.order_id;

      if (!orderId) {
        throw new Error('Erro ao criar pedido');
      }

      // 3. Pay with the registered credit card
      await api.post('/api/payments/credit-card', {
        order_id: orderId,
        credit_card_id: selectedCard,
      });

      setStep('done');
      showToast('Pagamento confirmado!', 'success');
      cart.clearCart();
      setTimeout(() => {
        navigate(`/orders/${orderId}`);
      }, 2000);
    } catch (err) {
      setError(err.message || 'Erro ao processar pagamento');
      setStep('error');
    }
  };

  if (loading) {
    return (
      <div>
        <div className={styles.screenTop}>
          <Button variant="back" onClick={() => navigate('/checkout')}>&#8592;</Button>
          <h2 className="h2" style={{ flex: 1 }}>Cartao de Credito</h2>
        </div>
        <GlassCard>
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
            Carregando cartoes...
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.screenTop}>
        <Button variant="back" onClick={() => step === 'select' ? navigate('/checkout') : setStep('select')}>
          &#8592;
        </Button>
        <h2 className="h2" style={{ flex: 1 }}>Cartao de Credito</h2>
      </div>

      {step === 'select' && (
        <GlassCard>
          {cards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <p style={{ color: 'var(--muted)', marginBottom: '18px' }}>
                Voce ainda nao tem cartoes cadastrados.
              </p>
              <Button variant="theme" onClick={() => navigate('/credit-cards')}>
                Cadastrar cartao
              </Button>
            </div>
          ) : (
            <div className={payStyles.cardSelector}>
              <h3 className="h3" style={{ marginBottom: '14px' }}>Selecione o cartao</h3>

              <div className={payStyles.cardList}>
                {cards.map((card) => (
                  <div
                    key={card.id}
                    className={`${payStyles.bankCardItem} ${selectedCard === card.id ? payStyles.selected : ''}`}
                    onClick={() => setSelectedCard(card.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className={payStyles.bankCardIcon}>💳</div>
                    <div className={payStyles.bankCardInfo}>
                      <div className={payStyles.bankCardName}>{card.cardHolder}</div>
                      <div className={payStyles.bankCardNumber}>
                        &bull;&bull;&bull;&bull; {card.cardLast4}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                        Validade: {card.cardExpiry}
                      </div>
                    </div>
                    {card.isDefault && (
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: 'rgba(123, 97, 255, 0.14)',
                        color: 'var(--brand)',
                        padding: '4px 8px',
                        borderRadius: '999px',
                      }}>
                        Padrao
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                <Button
                  variant="theme"
                  onClick={() => navigate('/credit-cards')}
                  style={{ flex: 1 }}
                >
                  Gerenciar cartoes
                </Button>
              </div>

              <div className={payStyles.balanceSummary}>
                <div className={payStyles.balanceRow}>
                  <span style={{ color: 'var(--muted)' }}>Total do pedido</span>
                  <span style={{ fontWeight: 800 }}>{formatCurrency(cart.total)}</span>
                </div>
              </div>

              <Button
                variant="checkout"
                disabled={!selectedCard}
                onClick={handleConfirmPayment}
                style={{ marginTop: '14px' }}
              >
                Confirmar pagamento — {formatCurrency(cart.total)}
              </Button>
            </div>
          )}
        </GlassCard>
      )}

      {step === 'processing' && (
        <GlassCard>
          <PaymentStatus status="processing" />
        </GlassCard>
      )}

      {step === 'done' && (
        <GlassCard>
          <PaymentStatus status="completed" message="Seu pedido foi criado com sucesso. Redirecionando..." />
        </GlassCard>
      )}

      {step === 'error' && (
        <GlassCard>
          <PaymentStatus
            status="failed"
            message={error}
            onRetry={() => setStep('select')}
          />
        </GlassCard>
      )}
    </div>
  );
}
