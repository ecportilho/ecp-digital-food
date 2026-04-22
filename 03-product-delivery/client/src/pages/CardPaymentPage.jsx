import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useApi } from '../hooks/useApi';
import { useAddress } from '../hooks/useAddress';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import GlassCard from '../components/ui/GlassCard';
import BankLoginForm from '../components/payment/BankLoginForm';
import CardSelector from '../components/payment/CardSelector';
import PaymentStatus from '../components/payment/PaymentStatus';
import styles from './PaymentPages.module.css';

export default function CardPaymentPage() {
  const navigate = useNavigate();
  const cart = useCart();
  const api = useApi();
  const showToast = useToast();
  const { defaultAddress, addressText, loading: loadingAddress } = useAddress();
  const [step, setStep] = useState('login'); // login | select | processing | done | error
  const [bankToken, setBankToken] = useState(null);
  const [cards, setCards] = useState([]);
  const [balance, setBalance] = useState(0);
  const [error, setError] = useState('');

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

  const handleBankLogin = async (data) => {
    const token = data?.bank_token;
    if (!token) {
      setError('Falha ao autenticar no banco');
      setStep('error');
      return;
    }
    try {
      setBankToken(token);
      // Fetch cards and balance in parallel
      const [cardsRes, balanceRes] = await Promise.all([
        api.get(`/api/payments/bank-cards?bank_token=${encodeURIComponent(token)}`),
        api.get(`/api/payments/bank-balance?bank_token=${encodeURIComponent(token)}`),
      ]);
      const cardList = Array.isArray(cardsRes) ? cardsRes : (cardsRes?.data || []);
      setCards(cardList);
      setBalance(balanceRes?.balanceCents ?? balanceRes?.balance ?? 0);
      setStep('select');
    } catch (err) {
      setError(err.message || 'Erro ao carregar dados do banco');
      setStep('error');
    }
  };

  const handleConfirmPayment = async (cardId) => {
    if (!bankToken) {
      setError('Sessão bancária inválida');
      setStep('error');
      return;
    }
    if (!defaultAddress) {
      setError('Cadastre um endereco de entrega antes de finalizar o pedido.');
      setStep('error');
      return;
    }
    const selected = cards.find((c) => c.id === cardId);
    const cardLast4 = selected?.last4;

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
          payment_method: 'card_ecp',
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

      // 3. Pay with the ECP debit card
      const payRes = await fetch('/api/payments/card', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          order_id: orderId,
          bank_token: bankToken,
          card_last4: cardLast4,
        }),
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

  return (
    <div>
      <div className={styles.screenTop}>
        <Button variant="back" onClick={() => step === 'login' ? navigate('/checkout') : setStep('login')}>
          &#8592;
        </Button>
        <h2 className="h2" style={{ flex: 1 }}>Pagamento — Cartao ECP</h2>
      </div>

      {step === 'login' && (
        <GlassCard>
          <BankLoginForm onSuccess={handleBankLogin} />
          {!loadingAddress && !defaultAddress && (
            <div style={{ fontSize: '0.82rem', color: 'var(--danger)', marginTop: '10px', textAlign: 'center' }}>
              Cadastre um endereco no Perfil antes de finalizar.
            </div>
          )}
        </GlassCard>
      )}

      {step === 'select' && (
        <GlassCard>
          <CardSelector
            cards={cards}
            balance={balance}
            orderTotal={cart.total}
            onConfirm={handleConfirmPayment}
          />
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
            onRetry={() => setStep('login')}
          />
        </GlassCard>
      )}
    </div>
  );
}
