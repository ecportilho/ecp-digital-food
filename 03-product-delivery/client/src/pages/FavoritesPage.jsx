import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import RestaurantGrid from '../components/restaurant/RestaurantGrid';
import styles from './FavoritesPage.module.css';

export default function FavoritesPage() {
  const navigate = useNavigate();
  const api = useApi();
  const showToast = useToast();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/favorites')
      .then((data) => setFavorites(data || []))
      .catch(() => setFavorites([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className={styles.screenTop}>
        <Button variant="back" onClick={() => navigate('/')}>&#8592;</Button>
        <h2 className="h2" style={{ flex: 1 }}>Favoritos</h2>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>Carregando...</div>
      ) : favorites.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '14px' }}>❤️</div>
          <h3 className="h3" style={{ marginBottom: '8px' }}>Nenhum favorito ainda</h3>
          <p style={{ fontSize: '0.88rem' }}>Toque no coracao em um restaurante para salvar aqui</p>
        </div>
      ) : (
        <RestaurantGrid restaurants={favorites} />
      )}
    </div>
  );
}
