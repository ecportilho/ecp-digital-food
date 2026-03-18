import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useApi } from '../hooks/useApi';
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
  const [step, setStep] = useState('login'); // login | select | processing | done | error
  const [bankData, setBankData] = useState(null);
  const [error, setError] = useState('');

  const handleBankLogin = (data) => {
    setBankData(data);
    setStep('select');
  };

  const handleConfirmPayment = async (cardId) => {
    setStep('processing');
    try {
      const res = await api.post('/api/payments/card', {
        bank_token: bankData.token,
        card_id: cardId,
        amount: Math.round(cart.total * 100),
        items: cart.items.map((i) => ({
          menu_item_id: i.menuItemId,
          quantity: i.quantity,
        })),
        coupon: cart.coupon,
      });
      setStep('done');
      showToast('Pagamento confirmado!', 'success');
      cart.clearCart();
      setTimeout(() => {
        navigate(res.order_id ? `/orders/${res.order_id}` : '/orders');
      }, 2000);
    } catch (err) {
      setError(err.message);
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
        </GlassCard>
      )}

      {step === 'select' && bankData && (
        <GlassCard>
          <CardSelector
            cards={bankData.cards || []}
            balance={bankData.balance}
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
