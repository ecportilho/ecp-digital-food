import { useState } from 'react';
import Button from '../ui/Button';
import { formatCurrency } from '../../lib/formatters';
import styles from './Payment.module.css';

export default function CardSelector({ cards = [], balance, orderTotal, onConfirm }) {
  const [selectedCard, setSelectedCard] = useState(cards[0]?.id || null);
  // balance em centavos (vem do backend), orderTotal em reais.
  // Convertemos para a mesma unidade antes de comparar.
  const sufficientBalance = (balance || 0) >= Math.round((orderTotal || 0) * 100);

  return (
    <div className={styles.cardSelector}>
      <h3 className="h3" style={{ marginBottom: '14px' }}>Selecione o cartão</h3>

      <div className={styles.cardList}>
        {cards.map((card) => {
          const blocked = card.status === 'blocked';
          return (
            <div
              key={card.id}
              className={`${styles.bankCardItem} ${selectedCard === card.id ? styles.selected : ''} ${blocked ? styles.blocked : ''}`}
              onClick={() => !blocked && setSelectedCard(card.id)}
              role="button"
              tabIndex={0}
            >
              <div className={styles.bankCardIcon}>💳</div>
              <div className={styles.bankCardInfo}>
                <div className={styles.bankCardName}>{card.name || 'Cartão Virtual'}</div>
                <div className={styles.bankCardNumber}>
                  &bull;&bull;&bull;&bull; {card.last4 || '****'}
                </div>
                {blocked && (
                  <span className={styles.blockedTag}>Bloqueado</span>
                )}
              </div>
              <div
                className={styles.bankCardBalance}
                style={{ color: blocked ? 'var(--danger)' : 'var(--brand)' }}
              >
                {blocked ? '—' : formatCurrency((card.balance || 0) / 100)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Balance summary */}
      <div className={styles.balanceSummary}>
        <div className={styles.balanceRow}>
          <span style={{ color: 'var(--muted)' }}>Saldo disponível</span>
          <span style={{ color: sufficientBalance ? 'var(--success)' : 'var(--danger)', fontWeight: 800 }}>
            {formatCurrency((balance || 0) / 100)}
          </span>
        </div>
        <div className={styles.balanceRow}>
          <span style={{ color: 'var(--muted)' }}>Total do pedido</span>
          <span style={{ fontWeight: 800 }}>{formatCurrency(orderTotal)}</span>
        </div>
      </div>

      {!sufficientBalance && (
        <div className={styles.errorMsg}>
          Saldo insuficiente para este pedido
        </div>
      )}

      <Button
        variant="checkout"
        disabled={!selectedCard || !sufficientBalance}
        onClick={() => onConfirm(selectedCard)}
        style={{ marginTop: '14px' }}
      >
        Confirmar pagamento — {formatCurrency(orderTotal)}
      </Button>
    </div>
  );
}
