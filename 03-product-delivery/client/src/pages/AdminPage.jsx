import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import GlassCard from '../components/ui/GlassCard';
import { Tag } from '../components/ui/Badge';
import { formatCurrency } from '../lib/formatters';
import styles from './AdminPage.module.css';

export default function AdminPage() {
  const navigate = useNavigate();
  const api = useApi();
  const { user } = useAuth();
  const showToast = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Category form
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', emoji: '', sort_order: 0 });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        const data = await api.get('/api/admin/stats');
        setStats(data || {});
      } else if (activeTab === 'restaurants') {
        const data = await api.get('/api/admin/restaurants');
        setRestaurants(data || []);
      } else if (activeTab === 'categories') {
        const data = await api.get('/api/categories');
        setCategories(data || []);
      }
    } catch {}
    setLoading(false);
  };

  const toggleRestaurant = async (id, isActive) => {
    try {
      await api.patch(`/api/admin/restaurants/${id}`, { is_active: isActive ? 0 : 1 });
      showToast('Status atualizado', 'success');
      loadData();
    } catch {}
  };

  const addCategory = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/admin/categories', categoryForm);
      showToast('Categoria criada!', 'success');
      setShowCategoryForm(false);
      setCategoryForm({ name: '', emoji: '', sort_order: 0 });
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const tabs = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'restaurants', label: '🍽️ Restaurantes' },
    { id: 'categories', label: '📁 Categorias' },
  ];

  return (
    <div>
      <div className={styles.screenTop}>
        <Button variant="back" onClick={() => navigate('/profile')}>&#8592;</Button>
        <h2 className="h2" style={{ flex: 1 }}>Painel Admin</h2>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.activeTab : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>Carregando...</div>
      ) : (
        <>
          {/* Dashboard */}
          {activeTab === 'dashboard' && stats && (
            <div>
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{stats.restaurant_count || 0}</div>
                  <div className={styles.statLabel}>Restaurantes</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{stats.order_count || 0}</div>
                  <div className={styles.statLabel}>Pedidos</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{stats.user_count || 0}</div>
                  <div className={styles.statLabel}>Usuarios</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{formatCurrency(stats.avg_ticket || 0)}</div>
                  <div className={styles.statLabel}>Ticket medio</div>
                </div>
              </div>
              <GlassCard style={{ marginTop: '18px' }}>
                <h3 className="h3" style={{ marginBottom: '14px' }}>Resumo</h3>
                <div className={styles.summaryRow}>
                  <span style={{ color: 'var(--muted)' }}>Total de receita</span>
                  <span style={{ fontWeight: 800 }}>{formatCurrency(stats.total_revenue || 0)}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span style={{ color: 'var(--muted)' }}>Pedidos hoje</span>
                  <span style={{ fontWeight: 800 }}>{stats.orders_today || 0}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span style={{ color: 'var(--muted)' }}>Categorias ativas</span>
                  <span style={{ fontWeight: 800 }}>{stats.category_count || 0}</span>
                </div>
              </GlassCard>
            </div>
          )}

          {/* Restaurants */}
          {activeTab === 'restaurants' && (
            <div>
              <h3 className="h3" style={{ marginBottom: '14px' }}>
                Restaurantes ({restaurants.length})
              </h3>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Culinaria</th>
                    <th>Avaliacao</th>
                    <th>Status</th>
                    <th>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {restaurants.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 700 }}>{r.name}</td>
                      <td>{r.cuisine}</td>
                      <td>⭐ {r.rating?.toFixed(1) || '0.0'}</td>
                      <td>
                        <Tag>{r.is_active ? '✓ Ativo' : '✗ Inativo'}</Tag>
                      </td>
                      <td>
                        <Button
                          variant={r.is_active ? 'danger' : 'success'}
                          onClick={() => toggleRestaurant(r.id, r.is_active)}
                          style={{ padding: '8px 12px', fontSize: '0.78rem' }}
                        >
                          {r.is_active ? 'Suspender' : 'Ativar'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Categories */}
          {activeTab === 'categories' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 className="h3">Categorias ({categories.length})</h3>
                <Button variant="mini" onClick={() => setShowCategoryForm(!showCategoryForm)}>
                  {showCategoryForm ? 'Cancelar' : '+ Nova'}
                </Button>
              </div>

              {showCategoryForm && (
                <GlassCard style={{ marginBottom: '16px' }}>
                  <form onSubmit={addCategory}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '14px' }}>
                      <div className="form-group">
                        <label>Nome</label>
                        <input className="input-field" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} required />
                      </div>
                      <div className="form-group">
                        <label>Emoji</label>
                        <input className="input-field" value={categoryForm.emoji} onChange={(e) => setCategoryForm({ ...categoryForm, emoji: e.target.value })} style={{ width: '80px' }} />
                      </div>
                      <div className="form-group">
                        <label>Ordem</label>
                        <input className="input-field" type="number" value={categoryForm.sort_order} onChange={(e) => setCategoryForm({ ...categoryForm, sort_order: parseInt(e.target.value) || 0 })} style={{ width: '80px' }} />
                      </div>
                    </div>
                    <Button variant="checkout" type="submit">Salvar</Button>
                  </form>
                </GlassCard>
              )}

              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Emoji</th>
                    <th>Nome</th>
                    <th>Ordem</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <tr key={cat.id}>
                      <td style={{ fontSize: '1.3rem' }}>{cat.emoji}</td>
                      <td style={{ fontWeight: 700 }}>{cat.name}</td>
                      <td>{cat.sort_order}</td>
                      <td>
                        <Tag>{cat.is_active ? '✓ Ativa' : '✗ Inativa'}</Tag>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
