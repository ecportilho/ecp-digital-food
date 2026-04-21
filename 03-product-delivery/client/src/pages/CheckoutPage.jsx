import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useApi } from '../hooks/useApi';
import { useAddress } from '../hooks/useAddress';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import CartSummary from '../components/cart/CartSummary';
import PaymentMethodSelector from '../components/payment/PaymentMethodSelector';
import { formatCurrency } from '../lib/formatters';
import styles from './CheckoutPage.module.css';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const cart = useCart();
  const api = useApi();
  const showToast = useToast();
  const { defaultAddress, addressText, loading: loadingAddress } = useAddress();
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [couponCode, setCouponCode] = useState(cart.coupon || '');
  const [couponMsg, setCouponMsg] = useState(cart.coupon ? `Cupom ${cart.coupon} aplicado` : '');

  if (cart.items.length === 0) {
    return (
      <div>
        <div className={styles.screenTop}>
          <Button variant="back" onClick={() => navigate(-1)}>&#8592;</Button>
          <h2 className="h2" style={{ flex: 1 }}>Checkout</h2>
        </div>
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--muted)' }}>
          Carrinho vazio. Adicione itens para continuar.
        </div>
      </div>
    );
  }

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const data = await api.post('/api/coupons/validate', { code: couponCode });
      cart.setCoupon(data.code, data.discount);
      setCouponMsg(`Cupom ${data.code} aplicado — ${data.discount}% off`);
      showToast('Cupom aplicado!', 'success');
    } catch (err) {
      setCouponMsg('');
      cart.clearCoupon();
      showToast(err.message || 'Cupom invalido', 'error');
    }
  };

  const goToPayment = () => {
    if (!defaultAddress) {
      showToast('Cadastre um endereço antes de continuar', 'error');
      return;
    }
    if (paymentMethod === 'credit_card') {
      navigate('/checkout/credit-card');
    } else if (paymentMethod === 'card') {
      navigate('/checkout/card');
    } else {
      navigate('/checkout/pix');
    }
  };

  return (
    <div>
      <div className={styles.screenTop}>
        <Button variant="back" onClick={() => navigate(-1)}>&#8592;</Button>
        <h2 className="h2" style={{ flex: 1 }}>Checkout</h2>
      </div>

      <div className={styles.container}>
        {/* Order Summary */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Resumo do pedido</div>
          {cart.items.map((item) => (
            <div key={item.menuItemId} className={styles.summaryItem}>
              <span>{item.quantity}x {item.emoji} {item.name}</span>
              <span style={{ fontWeight: 700 }}>{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>

        {/* Address */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Endereco de entrega</div>
          {loadingAddress ? (
            <input type="text" className="input-field" value="Carregando endereco..." readOnly />
          ) : defaultAddress ? (
            <>
              <input type="text" className="input-field" value={addressText} readOnly />
              <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '6px' }}>
                {defaultAddress.label || 'Endereco padrao'} — <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); navigate('/profile'); }}
                  style={{ color: 'var(--brand)', fontWeight: 700 }}
                >
                  Alterar no Perfil
                </a>
              </div>
            </>
          ) : (
            <div style={{
              padding: '14px',
              border: '1px dashed var(--danger)',
              borderRadius: '12px',
              color: 'var(--danger)',
              fontSize: '0.88rem',
            }}>
              Nenhum endereco cadastrado.{' '}
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); navigate('/profile'); }}
                style={{ color: 'var(--brand)', fontWeight: 700 }}
              >
                Cadastrar agora
              </a>
            </div>
          )}
        </div>

        {/* Coupon */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Cupom de desconto</div>
          <div className={styles.couponRow}>
            <input
              type="text"
              className="input-field"
              placeholder="Digite o cupom"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              style={{ flex: 1 }}
            />
            <Button variant="theme" onClick={applyCoupon}>Aplicar</Button>
          </div>
          {couponMsg && (
            <div style={{ fontSize: '0.84rem', color: 'var(--success)', fontWeight: 700, marginTop: '10px' }}>
              {couponMsg}
            </div>
          )}
        </div>

        {/* Payment Method */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Forma de pagamento</div>
          <PaymentMethodSelector selected={paymentMethod} onSelect={setPaymentMethod} />
        </div>

        {/* Total */}
        <div className={styles.section}>
          <CartSummary />
        </div>

        <Button
          variant="checkout"
          onClick={goToPayment}
          disabled={!defaultAddress || loadingAddress}
          style={{ marginTop: '14px' }}
        >
          Pagar agora — {formatCurrency(cart.total)}
        </Button>
      </div>
    </div>
  );
}
