import { useState } from 'react';
import Button from '../ui/Button';
import styles from './Payment.module.css';

export default function BankLoginForm({ onSuccess, onBack }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const token = localStorage.getItem('ff_token');
      const res = await fetch('/api/payments/bank-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Credenciais inválidas');
      }
      const data = await res.json();
      onSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.bankLogin}>
      <div className={styles.bankLoginHeader}>
        <div className={styles.bankLoginIcon}>🏦</div>
        <div>
          <h3 className="h3">Entrar no ECP Digital Bank</h3>
        </div>
      </div>
      <p style={{ color: 'var(--muted)', fontSize: '0.84rem', marginBottom: '18px' }}>
        Insira suas credenciais do banco digital para pagar com cartão virtual
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Email do banco</label>
          <input
            type="email"
            className="input-field"
            placeholder="seu@banco.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />
        </div>
        <div className="form-group">
          <label>Senha do banco</label>
          <input
            type="password"
            className="input-field"
            placeholder="Sua senha do banco"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        {error && (
          <div className={styles.errorMsg}>{error}</div>
        )}

        <Button
          variant="checkout"
          type="submit"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className={styles.spinner} />
              Autenticando...
            </>
          ) : (
            'Autenticar'
          )}
        </Button>
      </form>

      <div className={styles.securityNote}>
        <span>🛡️</span>
        <span>Suas credenciais são usadas apenas para esta transação e não são armazenadas</span>
      </div>
    </div>
  );
}
