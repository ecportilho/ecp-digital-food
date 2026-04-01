import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import GlassCard from '../components/ui/GlassCard';
import { useToast } from '../components/ui/Toast';
import styles from './AuthPages.module.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();

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
    </div>
  );
}
