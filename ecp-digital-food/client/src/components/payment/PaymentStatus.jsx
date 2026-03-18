import styles from './Payment.module.css';
import Button from '../ui/Button';

export default function PaymentStatus({ status, message, onRetry }) {
  const configs = {
    processing: {
      icon: '⏳',
      bgClass: styles.statusProcessing,
      title: 'Processando pagamento...',
      desc: 'Aguarde enquanto confirmamos sua transação',
    },
    completed: {
      icon: '✓',
      bgClass: styles.statusSuccess,
      title: 'Pagamento confirmado!',
      desc: message || 'Seu pedido foi criado com sucesso',
    },
    failed: {
      icon: '✗',
      bgClass: styles.statusDanger,
      title: 'Pagamento falhou',
      desc: message || 'Não foi possível processar o pagamento',
    },
    expired: {
      icon: '⏱️',
      bgClass: styles.statusMuted,
      title: 'Tempo expirado',
      desc: 'O QR Code expirou. Gere um novo para continuar.',
    },
  };

  const config = configs[status] || configs.processing;

  return (
    <div className={styles.paymentStatusContainer}>
      <div className={`${styles.paymentStatusIcon} ${config.bgClass}`}>
        {config.icon}
      </div>
      <h3 className="h3" style={{ marginTop: '14px' }}>{config.title}</h3>
      <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginTop: '8px' }}>{config.desc}</p>
      {(status === 'failed' || status === 'expired') && onRetry && (
        <Button variant="mini" onClick={onRetry} style={{ marginTop: '18px' }}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
