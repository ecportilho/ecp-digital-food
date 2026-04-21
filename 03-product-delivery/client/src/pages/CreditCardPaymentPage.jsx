import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useApi } from '../hooks/useApi';
import { useAddress } from '../hooks/useAddress';
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
  const { defaultAddress, addressText, loading: loadingAddress } = useAddress();
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
    const token = localStorage.getItem('ff_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    // Clear server cart first
    const cartRes = await fetch('/api/cart', { headers }).catch(() => null);
    if (cartRes && cartRes.ok) {
      const cartData = await cartRes.json().catch(() => ({}));
      const serverItems = cartData?.data?.items || cartData?.items || [];
      for (const si of serverItems) {
        await fetch(`/api/cart/items/${si.id}`, { method: 'DELETE', headers }).catch(() => {});
      }
    }
    // Add current frontend items to server cart
    for (const item of cart.items) {
      await fetch('/api/cart/items', {
        method: 'POST',
        headers,
        body: JSON.stringify({ menu_item_id: item.menuItemId, quantity: item.quantity }),
      }).catch(() => {});
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedCard) return;
    if (!defaultAddress) {
      setError('Cadastre um endereco de entrega antes de finalizar o pedido.');
      setStep('error');
      return;
    }
    setStep('processing');
    try {
      const token = localStorage.getItem('ff_token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      // 1. Sync frontend cart to server
      await syncCartToServer();

      // 2. Create the order
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          address_text: addressText,
          coupon_code: cart.coupon || null,
          payment_method: 'credit_card',
        }),
      });

      if (!orderRes.ok) {
        const errBody = await orderRes.json().catch(() => ({}));
        throw new Error(errBody.error?.message || errBody.message || `Erro ${orderRes.status} ao criar pedido`);
      }

      const orderData = await orderRes.json();
      const orderId = orderData?.data?.id || orderData?.id;

      if (!orderId) {
        throw new Error('Erro ao criar pedido');
      }

      // 3. Pay with the registered credit card
      const payRes = await fetch('/api/payments/credit-card', {
        method: 'POST',
        headers,
        body: JSON.stringify({ order_id: orderId, credit_card_id: selectedCard }),
      });

      if (!payRes.ok) {
        const errBody = await payRes.json().catch(() => ({}));
        throw new Error(errBody.error?.message || errBody.message || `Erro ${payRes.status} no pagamento`);
      }

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
                disabled={!selectedCard || !defaultAddress || loadingAddress}
                onClick={handleConfirmPayment}
                style={{ marginTop: '14px' }}
              >
                Confirmar pagamento — {formatCurrency(cart.total)}
              </Button>
              {!loadingAddress && !defaultAddress && (
                <div style={{ fontSize: '0.82rem', color: 'var(--danger)', marginTop: '10px', textAlign: 'center' }}>
                  Cadastre um endereco no Perfil antes de finalizar.
                </div>
              )}
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
