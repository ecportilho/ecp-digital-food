import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useApi } from '../hooks/useApi';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import GlassCard from '../components/ui/GlassCard';
import PixQrCode from '../components/payment/PixQrCode';
import PaymentStatus from '../components/payment/PaymentStatus';
import styles from './PaymentPages.module.css';

export default function PixPaymentPage() {
  const navigate = useNavigate();
  const cart = useCart();
  const api = useApi();
  const showToast = useToast();
  const [step, setStep] = useState('loading'); // loading | qr | done | error
  const [pixData, setPixData] = useState(null);
  const [error, setError] = useState('');

  const generatePix = async () => {
    setStep('loading');
    try {
      const res = await api.post('/api/payments/pix', {
        amount: Math.round(cart.total * 100),
        items: cart.items.map((i) => ({
          menu_item_id: i.menuItemId,
          quantity: i.quantity,
        })),
        coupon: cart.coupon,
      });
      setPixData(res);
      setStep('qr');
    } catch (err) {
      setError(err.message);
      setStep('error');
    }
  };

  useEffect(() => {
    if (cart.items.length > 0) {
      generatePix();
    }
  }, []);

  const handleConfirmed = () => {
    setStep('done');
    showToast('Pagamento confirmado!', 'success');
    cart.clearCart();
    setTimeout(() => {
      navigate(pixData?.order_id ? `/orders/${pixData.order_id}` : '/orders');
    }, 2000);
  };

  const handleExpired = () => {
    showToast('QR Code expirado', 'error');
  };

  return (
    <div>
      <div className={styles.screenTop}>
        <Button variant="back" onClick={() => navigate('/checkout')}>&#8592;</Button>
        <h2 className="h2" style={{ flex: 1 }}>Pagamento — PIX</h2>
      </div>

      {step === 'loading' && (
        <GlassCard>
          <PaymentStatus status="processing" message="Gerando QR Code..." />
        </GlassCard>
      )}

      {step === 'qr' && pixData && (
        <GlassCard>
          <PixQrCode
            paymentId={pixData.payment_id}
            qrCodeBase64={pixData.qr_code}
            pixCopyPaste={pixData.pix_copy_paste}
            expiresAt={pixData.pix_expiration}
            onConfirmed={handleConfirmed}
            onExpired={handleExpired}
          />
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
            onRetry={generatePix}
          />
        </GlassCard>
      )}
    </div>
  );
}
