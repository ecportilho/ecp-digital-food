import { useState, useEffect, useCallback } from 'react';
import { useSSE } from '../../hooks/useSSE';
import { useToast } from '../ui/Toast';
import styles from './Payment.module.css';

export default function PixQrCode({ paymentId, qrCodeBase64, pixCopyPaste, expiresAt, onConfirmed, onExpired }) {
  const showToast = useToast();
  const [timeLeft, setTimeLeft] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState('waiting');
  const [copied, setCopied] = useState(false);

  // Calculate time left
  useEffect(() => {
    if (!expiresAt) return;
    const update = () => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setTimeLeft(diff);
      if (diff <= 0 && paymentStatus === 'waiting') {
        setPaymentStatus('expired');
        onExpired?.();
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, paymentStatus, onExpired]);

  // SSE for payment updates
  const handleSSEMessage = useCallback((data) => {
    if (data.status === 'completed') {
      setPaymentStatus('confirmed');
      onConfirmed?.();
    } else if (data.status === 'expired') {
      setPaymentStatus('expired');
      onExpired?.();
    }
  }, [onConfirmed, onExpired]);

  const { status: sseStatus } = useSSE(
    paymentId ? `/api/payments/${paymentId}/events` : null,
    {
      enabled: !!paymentId && paymentStatus === 'waiting',
      onMessage: handleSSEMessage,
    }
  );

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleCopy = async () => {
    if (pixCopyPaste) {
      try {
        await navigator.clipboard.writeText(pixCopyPaste);
        setCopied(true);
        showToast('Código copiado!', 'success');
        setTimeout(() => setCopied(false), 2000);
      } catch {
        showToast('Erro ao copiar', 'error');
      }
    }
  };

  const timerProgress = expiresAt ? Math.max(0, timeLeft / 600) : 0;
  const isLowTime = timeLeft <= 120;
  const circumference = 2 * Math.PI * 45;
  const dashOffset = circumference * (1 - timerProgress);

  if (paymentStatus === 'confirmed') {
    return (
      <div className={styles.pixDisplay}>
        <div className={styles.paymentStatusIcon} style={{ background: 'rgba(47,211,135,0.14)', color: 'var(--success)' }}>
          ✓
        </div>
        <h3 className="h3" style={{ marginTop: '14px' }}>Pagamento confirmado!</h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginTop: '8px' }}>
          Redirecionando em 2s...
        </p>
      </div>
    );
  }

  if (paymentStatus === 'expired') {
    return (
      <div className={styles.pixDisplay}>
        <div className={styles.qrContainer} style={{ position: 'relative' }}>
          <div className={styles.qrOverlay}>
            <p style={{ fontWeight: 800, marginBottom: '12px' }}>QR Code expirado</p>
          </div>
          <div className={styles.qrCode}>
            {qrCodeBase64 ? (
              <img src={qrCodeBase64} alt="QR Code expirado" style={{ opacity: 0.3, width: '100%', height: '100%', borderRadius: '14px' }} />
            ) : (
              <span style={{ opacity: 0.3, fontSize: '3rem' }}>📱</span>
            )}
          </div>
        </div>
        <button
          className={styles.regenerateBtn}
          onClick={onExpired}
        >
          Gerar novo QR Code
        </button>
      </div>
    );
  }

  return (
    <div className={styles.pixDisplay}>
      {/* QR Code */}
      <div className={styles.qrContainer} style={{ animation: 'qrAppear 0.3s ease-out' }}>
        <div className={styles.qrCode}>
          {qrCodeBase64 ? (
            <img src={qrCodeBase64} alt="QR Code PIX" style={{ width: '100%', height: '100%', borderRadius: '14px' }} />
          ) : (
            <div className={styles.qrPlaceholder}>
              <span style={{ fontSize: '3rem' }}>📱</span>
              <div className={styles.qrPattern} />
            </div>
          )}
        </div>
      </div>

      {/* Copy-paste */}
      {pixCopyPaste && (
        <div className={styles.copyField}>
          <input
            className={styles.copyInput}
            value={pixCopyPaste}
            readOnly
          />
          <button className={styles.copyBtn} onClick={handleCopy}>
            {copied ? '✓ Copiado' : '📋 Copiar'}
          </button>
        </div>
      )}

      {/* Timer */}
      <div className={styles.timerCircle}>
        <svg width="100" height="100" viewBox="0 0 100 100">
          <circle
            cx="50" cy="50" r="45"
            fill="none"
            stroke="var(--line)"
            strokeWidth="4"
          />
          <circle
            cx="50" cy="50" r="45"
            fill="none"
            stroke={isLowTime ? 'var(--danger)' : 'var(--accent)'}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 1s linear', transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
          />
        </svg>
        <span className={styles.timerText} style={{ color: isLowTime ? 'var(--danger)' : 'var(--text)' }}>
          {formatTime(timeLeft)}
        </span>
      </div>

      {/* SSE Status */}
      <div className={styles.sseStatus}>
        {sseStatus === 'connected' && (
          <>
            <span className={styles.sseDot} style={{ background: 'var(--success)' }} />
            <span>Aguardando pagamento...</span>
            <span className={styles.dotsPulse}>
              <span /><span /><span />
            </span>
          </>
        )}
        {sseStatus === 'reconnecting' && (
          <>
            <span className={styles.sseDot} style={{ background: 'var(--muted)' }} />
            <span>Reconectando...</span>
          </>
        )}
        {sseStatus === 'failed' && (
          <>
            <span style={{ fontSize: '1rem' }}>📡</span>
            <span style={{ color: 'var(--danger)' }}>Conexão perdida</span>
          </>
        )}
      </div>

      {/* Instruction */}
      <p style={{ color: 'var(--muted)', fontSize: '0.84rem', marginTop: '14px', lineHeight: 1.5 }}>
        Abra o app do seu banco, escaneie o QR Code ou copie o código acima
      </p>

      {/* Security note */}
      <div className={styles.securityNote} style={{ marginTop: '14px' }}>
        <span>🔒</span>
        <span>Você será notificado automaticamente quando o pagamento for confirmado</span>
      </div>
    </div>
  );
}
