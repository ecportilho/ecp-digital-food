import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import GlassCard from '../components/ui/GlassCard';
import styles from './ProfilePage.module.css';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const api = useApi();
  const showToast = useToast();
  const [addresses, setAddresses] = useState([]);
  const [coupons, setCoupons] = useState([]);

  useEffect(() => {
    api.get('/api/consumer/addresses').then(setAddresses).catch(() => setAddresses([]));
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div>
      <div className={styles.screenTop}>
        <Button variant="back" onClick={() => navigate('/')}>&#8592;</Button>
        <h2 className="h2" style={{ flex: 1 }}>Meu Perfil</h2>
      </div>

      {/* Avatar */}
      <div className={styles.avatar}>
        {user.name?.[0]?.toUpperCase() || '👤'}
      </div>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h3 className="h3">{user.name}</h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>{user.email}</p>
      </div>

      {/* Personal data */}
      <GlassCard style={{ marginBottom: '16px' }}>
        <h3 className="h3" style={{ marginBottom: '14px' }}>Dados pessoais</h3>
        <div className={styles.profileItem}>
          <span className={styles.label}>Nome</span>
          <span className={styles.value}>{user.name}</span>
        </div>
        <div className={styles.profileItem}>
          <span className={styles.label}>Email</span>
          <span className={styles.value}>{user.email}</span>
        </div>
        <div className={styles.profileItem}>
          <span className={styles.label}>Telefone</span>
          <span className={styles.value}>{user.phone || 'Não informado'}</span>
        </div>
        <div className={styles.profileItem} style={{ borderBottom: 'none' }}>
          <span className={styles.label}>Tipo de conta</span>
          <span className={styles.value} style={{ textTransform: 'capitalize' }}>{user.role}</span>
        </div>
      </GlassCard>

      {/* Addresses */}
      <GlassCard style={{ marginBottom: '16px' }}>
        <h3 className="h3" style={{ marginBottom: '14px' }}>Endereços</h3>
        {addresses.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>Nenhum endereço cadastrado</p>
        ) : (
          addresses.map((addr) => (
            <div key={addr.id} className={styles.profileItem}>
              <span className={styles.label}>{addr.label}</span>
              <span className={styles.value}>{addr.street}, {addr.number} — {addr.neighborhood}</span>
            </div>
          ))
        )}
      </GlassCard>

      {/* Quick links */}
      <GlassCard style={{ marginBottom: '16px' }}>
        <h3 className="h3" style={{ marginBottom: '14px' }}>Atalhos</h3>
        <div className={styles.profileItem}>
          <Link to="/orders" style={{ fontWeight: 700 }}>📋 Meus Pedidos</Link>
        </div>
        <div className={styles.profileItem}>
          <Link to="/favorites" style={{ fontWeight: 700 }}>❤️ Favoritos</Link>
        </div>
        {user.role === 'restaurant' && (
          <div className={styles.profileItem}>
            <Link to="/restaurant-panel" style={{ fontWeight: 700 }}>🍽️ Painel do Restaurante</Link>
          </div>
        )}
        {user.role === 'admin' && (
          <div className={styles.profileItem}>
            <Link to="/admin" style={{ fontWeight: 700 }}>⚙️ Painel Admin</Link>
          </div>
        )}
      </GlassCard>

      <Button variant="danger" onClick={handleLogout} style={{ width: '100%' }}>
        Sair da conta
      </Button>
    </div>
  );
}
