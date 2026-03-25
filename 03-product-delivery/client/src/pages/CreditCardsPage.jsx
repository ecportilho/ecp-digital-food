import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import GlassCard from '../components/ui/GlassCard';
import styles from './CreditCardsPage.module.css';

export default function CreditCardsPage() {
  const navigate = useNavigate();
  const api = useApi();
  const showToast = useToast();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ cardNumber: '', cardHolder: '', cardExpiry: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      const data = await api.get('/api/credit-cards');
      setCards(Array.isArray(data) ? data : (data?.data || []));
    } catch {
      setCards([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const cleaned = formData.cardNumber.replace(/\s/g, '');
      const res = await api.post('/api/credit-cards', {
        cardNumber: cleaned,
        cardHolder: formData.cardHolder,
        cardExpiry: formData.cardExpiry,
      });
      if (res.success === false) {
        throw new Error(res.error?.message || 'Erro ao cadastrar cartao');
      }
      showToast('Cartao cadastrado com sucesso!', 'success');
      setShowForm(false);
      setFormData({ cardNumber: '', cardHolder: '', cardExpiry: '' });
      loadCards();
    } catch (err) {
      showToast(err.message || 'Erro ao cadastrar cartao', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cardId) => {
    try {
      await api.del(`/api/credit-cards/${cardId}`);
      showToast('Cartao removido', 'success');
      loadCards();
    } catch (err) {
      showToast(err.message || 'Erro ao remover cartao', 'error');
    }
  };

  const handleSetDefault = async (cardId) => {
    try {
      await api.patch(`/api/credit-cards/${cardId}/default`);
      showToast('Cartao definido como padrao', 'success');
      loadCards();
    } catch (err) {
      showToast(err.message || 'Erro ao definir padrao', 'error');
    }
  };

  const formatCardInput = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    const groups = digits.match(/.{1,4}/g);
    return groups ? groups.join(' ') : '';
  };

  const formatExpiryInput = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
      return digits.slice(0, 2) + '/' + digits.slice(2);
    }
    return digits;
  };

  return (
    <div>
      <div className={styles.screenTop}>
        <Button variant="back" onClick={() => navigate(-1)}>&#8592;</Button>
        <h2 className="h2" style={{ flex: 1 }}>Meus Cartoes</h2>
      </div>

      {/* Card list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
          Carregando...
        </div>
      ) : (
        <>
          {cards.length === 0 && !showForm && (
            <GlassCard style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '14px' }}>💳</div>
              <p style={{ color: 'var(--muted)', marginBottom: '18px' }}>
                Voce ainda nao tem cartoes cadastrados.
              </p>
              <Button variant="checkout" onClick={() => setShowForm(true)}>
                Cadastrar cartao
              </Button>
            </GlassCard>
          )}

          {cards.length > 0 && (
            <div className={styles.cardList}>
              {cards.map((card) => (
                <GlassCard key={card.id} style={{ marginBottom: '12px' }}>
                  <div className={styles.cardItem}>
                    <div className={styles.cardVisual}>
                      <div className={styles.cardChip}>💳</div>
                      <div className={styles.cardNumberDisplay}>
                        &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; {card.cardLast4}
                      </div>
                      <div className={styles.cardMeta}>
                        <div>
                          <div className={styles.cardLabel}>Titular</div>
                          <div className={styles.cardValue}>{card.cardHolder}</div>
                        </div>
                        <div>
                          <div className={styles.cardLabel}>Validade</div>
                          <div className={styles.cardValue}>{card.cardExpiry}</div>
                        </div>
                      </div>
                    </div>
                    <div className={styles.cardActions}>
                      {!card.isDefault && (
                        <button
                          className={styles.actionBtn}
                          onClick={() => handleSetDefault(card.id)}
                        >
                          Definir como padrao
                        </button>
                      )}
                      {card.isDefault && (
                        <span className={styles.defaultBadge}>Padrao</span>
                      )}
                      <button
                        className={`${styles.actionBtn} ${styles.dangerBtn}`}
                        onClick={() => handleDelete(card.id)}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}

          {/* Add card button */}
          {cards.length > 0 && !showForm && (
            <Button
              variant="theme"
              onClick={() => setShowForm(true)}
              style={{ width: '100%', marginTop: '14px' }}
            >
              Cadastrar novo cartao
            </Button>
          )}
        </>
      )}

      {/* Registration form */}
      {showForm && (
        <GlassCard style={{ marginTop: '16px' }}>
          <h3 className="h3" style={{ marginBottom: '18px' }}>Cadastrar cartao de credito</h3>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Numero do cartao</label>
              <input
                type="text"
                className="input-field"
                placeholder="0000 0000 0000 0000"
                value={formData.cardNumber}
                onChange={(e) => setFormData({
                  ...formData,
                  cardNumber: formatCardInput(e.target.value),
                })}
                maxLength={19}
                disabled={saving}
                required
              />
            </div>

            <div className="form-group">
              <label>Nome do titular</label>
              <input
                type="text"
                className="input-field"
                placeholder="NOME COMO ESTA NO CARTAO"
                value={formData.cardHolder}
                onChange={(e) => setFormData({
                  ...formData,
                  cardHolder: e.target.value.toUpperCase(),
                })}
                disabled={saving}
                required
              />
            </div>

            <div className="form-group">
              <label>Validade</label>
              <input
                type="text"
                className="input-field"
                placeholder="MM/AA"
                value={formData.cardExpiry}
                onChange={(e) => setFormData({
                  ...formData,
                  cardExpiry: formatExpiryInput(e.target.value),
                })}
                maxLength={5}
                disabled={saving}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
              <Button
                variant="theme"
                type="button"
                onClick={() => { setShowForm(false); setFormData({ cardNumber: '', cardHolder: '', cardExpiry: '' }); }}
                style={{ flex: 1 }}
              >
                Cancelar
              </Button>
              <Button
                variant="checkout"
                type="submit"
                disabled={saving}
                style={{ flex: 1 }}
              >
                {saving ? 'Salvando...' : 'Cadastrar'}
              </Button>
            </div>
          </form>

          <div style={{
            background: 'var(--tag-bg)',
            borderRadius: '16px',
            padding: '14px 16px',
            fontSize: '0.84rem',
            color: 'var(--tag-text)',
            marginTop: '18px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            lineHeight: 1.5,
          }}>
            <span>🔒</span>
            <span>Seus dados sao armazenados de forma segura e usados apenas para processar pagamentos</span>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
