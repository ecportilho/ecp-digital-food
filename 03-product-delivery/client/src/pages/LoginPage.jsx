import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import GlassCard from '../components/ui/GlassCard';
import { useToast } from '../components/ui/Toast';
import styles from './AuthPages.module.css';

const DEMO_ACCOUNTS = [
  { email: 'marina@email.com', name: 'Marina Silva', tag: 'Titular' },
  { email: 'carlos.mendes@email.com', name: 'Carlos Mendes', tag: 'Consumidor' },
  { email: 'aisha.santos@email.com', name: 'Aisha Santos', tag: 'Consumidora' },
  { email: 'roberto.tanaka@email.com', name: 'Roberto Tanaka', tag: 'Consumidor' },
  { email: 'francisca.lima@email.com', name: 'Francisca Lima', tag: 'Consumidora' },
  { email: 'lucas.ndongo@email.com', name: 'Lucas Ndongo', tag: 'Consumidor' },
  { email: 'patricia.werneck@email.com', name: 'Patrícia Werneck', tag: 'Consumidora' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDemo, setShowDemo] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();

  const handleQuickLogin = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('Senha@123');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      showToast('Bem-vindo ao ECP Food!', 'success');
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authPage}>
      <GlassCard className={styles.authCard}>
        <div className={styles.authHeader}>
          <div className={styles.brandIcon}>&#x2B21;</div>
          <h2 className="h2" style={{ fontSize: '1.5rem' }}>Entrar no ECP Food</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.84rem', marginTop: '8px' }}>
            Pedir comida pode ser lindo, rápido e viciante.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              className="input-field"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Senha</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="input-field"
                style={{ paddingRight: '48px' }}
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                style={{
                  position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                  background: 'var(--tag-bg)', border: 'none', borderRadius: '10px',
                  width: '36px', height: '36px', cursor: 'pointer',
                  display: 'grid', placeItems: 'center',
                  fontSize: '1rem', color: 'var(--tag-text)',
                  transition: 'opacity 0.18s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.75'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <Button variant="checkout" type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        <p className={styles.authFooter}>
          Não tem conta?{' '}
          <Link to="/register" style={{ fontWeight: 700 }}>Criar conta</Link>
        </p>
      </GlassCard>

      {/* Acesso rapido demo — escondido atras de link discreto */}
      {!showDemo && (
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button
            type="button"
            onClick={() => setShowDemo(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              fontSize: '11px',
              textDecoration: 'underline',
              textDecorationStyle: 'dotted',
              textUnderlineOffset: '3px',
              cursor: 'pointer',
              padding: '4px 8px',
              opacity: 0.6,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; }}
            aria-label="Mostrar contas de demo"
            title="Acesso rapido para demo"
          >
            ·
          </button>
        </div>
      )}

      {showDemo && (
        <GlassCard style={{ marginTop: '16px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Acesso rápido (demo) — Senha: Senha@123
            </div>
            <button
              type="button"
              onClick={() => setShowDemo(false)}
              aria-label="Fechar acesso rapido"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--muted)',
                cursor: 'pointer',
                fontSize: '14px',
                padding: '2px 6px',
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '280px', overflowY: 'auto' }}>
            {DEMO_ACCOUNTS.map((account) => {
              const active = email === account.email;
              return (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => handleQuickLogin(account.email)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    background: active ? 'rgba(123, 97, 255, 0.12)' : 'var(--surface-strong)',
                    border: `1px solid ${active ? 'var(--brand)' : 'var(--line)'}`,
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: '12px',
                    textAlign: 'left',
                    transition: 'border-color 0.15s',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{account.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--muted)' }}>{account.email}</div>
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: 'var(--muted)',
                    background: 'var(--tag-bg)',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    whiteSpace: 'nowrap',
                  }}>
                    {account.tag}
                  </div>
                </button>
              );
            })}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
