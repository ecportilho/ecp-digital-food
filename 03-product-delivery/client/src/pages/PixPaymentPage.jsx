import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAddress } from '../hooks/useAddress';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import GlassCard from '../components/ui/GlassCard';
import PixQrCode from '../components/payment/PixQrCode';
import PaymentStatus from '../components/payment/PaymentStatus';
import styles from './PaymentPages.module.css';

export default function PixPaymentPage() {
  const navigate = useNavigate();
  const cart = useCart();
  const showToast = useToast();
  const { defaultAddress, addressText, loading: loadingAddress } = useAddress();
  const [step, setStep] = useState('loading'); // loading | qr | done | error
  const [pixData, setPixData] = useState(null);
  const [orderId, setOrderId] = useState(null);
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

  const generatePix = async () => {
    if (!defaultAddress) {
      setError('Cadastre um endereco de entrega antes de finalizar o pedido.');
      setStep('error');
      return;
    }
    setStep('loading');
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
          payment_method: 'pix_qrcode',
        }),
      });

      if (!orderRes.ok) {
        const errBody = await orderRes.json().catch(() => ({}));
        throw new Error(errBody.error?.message || errBody.message || `Erro ${orderRes.status} ao criar pedido`);
      }

      const orderData = await orderRes.json();
      const newOrderId = orderData?.data?.id || orderData?.id;

      if (!newOrderId) {
        throw new Error('Erro ao criar pedido');
      }
      setOrderId(newOrderId);

      // 3. Generate PIX QR Code
      const pixRes = await fetch('/api/payments/pix', {
        method: 'POST',
        headers,
        body: JSON.stringify({ order_id: newOrderId }),
      });

      if (!pixRes.ok) {
        const errBody = await pixRes.json().catch(() => ({}));
        throw new Error(errBody.error?.message || errBody.message || `Erro ${pixRes.status} ao gerar QR Code`);
      }

      const pixBody = await pixRes.json();
      const pixPayload = pixBody?.data !== undefined ? pixBody.data : pixBody;
      setPixData(pixPayload);
      setStep('qr');
    } catch (err) {
      setError(err.message || 'Erro ao gerar QR Code');
      setStep('error');
    }
  };

  useEffect(() => {
    if (loadingAddress) return;
    if (cart.items.length > 0) {
      generatePix();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingAddress]);

  const handleConfirmed = () => {
    setStep('done');
    showToast('Pagamento confirmado!', 'success');
    cart.clearCart();
    setTimeout(() => {
      navigate(orderId ? `/orders/${orderId}` : '/orders');
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
            qrCodeBase64={pixData.qrcode_image}
            pixCopyPaste={pixData.pix_copy_paste}
            expiresAt={pixData.expires_at}
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
