import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import GlassCard from '../components/ui/GlassCard';
import { Tag } from '../components/ui/Badge';
import { formatCurrency, formatDate } from '../lib/formatters';
import styles from './RestaurantPanelPage.module.css';

export default function RestaurantPanelPage() {
  const navigate = useNavigate();
  const api = useApi();
  const { user } = useAuth();
  const showToast = useToast();
  const [activeTab, setActiveTab] = useState('menu');
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [settings, setSettings] = useState(null);
  const [settlements, setSettlements] = useState(null);
  const [loading, setLoading] = useState(true);

  // New item form
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', price: '', emoji: '🍽️', badge: '' });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'menu') {
        const data = await api.get('/api/restaurant-admin/menu');
        setMenuItems(data || []);
      } else if (activeTab === 'orders') {
        const data = await api.get('/api/restaurant-admin/orders');
        setOrders(data || []);
      } else if (activeTab === 'settings') {
        const data = await api.get('/api/restaurant-admin/settings');
        setSettings(data || {});
      } else if (activeTab === 'settlements') {
        const data = await api.get('/api/restaurant-admin/settlements');
        setSettlements(data || null);
      }
    } catch {}
    setLoading(false);
  };

  const addMenuItem = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/restaurant-admin/menu', {
        ...formData,
        price: parseFloat(formData.price),
      });
      showToast('Item adicionado!', 'success');
      setShowForm(false);
      setFormData({ name: '', description: '', price: '', emoji: '🍽️', badge: '' });
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const toggleAvailability = async (itemId, currentAvailable) => {
    try {
      await api.patch(`/api/restaurant-admin/menu/${itemId}`, { is_available: currentAvailable ? 0 : 1 });
      loadData();
    } catch {}
  };

  const deleteMenuItem = async (itemId) => {
    try {
      await api.del(`/api/restaurant-admin/menu/${itemId}`);
      showToast('Item removido', 'success');
      loadData();
    } catch {}
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await api.patch(`/api/orders/${orderId}/status`, { status: newStatus });
      showToast('Status atualizado', 'success');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const tabs = [
    { id: 'menu', label: '🍽️ Cardápio' },
    { id: 'orders', label: '📋 Pedidos' },
    { id: 'settlements', label: '💰 Repasses' },
    { id: 'settings', label: '⚙️ Config' },
  ];

  return (
    <div>
      <div className={styles.screenTop}>
        <Button variant="back" onClick={() => navigate('/profile')}>&#8592;</Button>
        <h2 className="h2" style={{ flex: 1 }}>Painel do Restaurante</h2>
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
          {/* Menu Tab */}
          {activeTab === 'menu' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 className="h3">Itens do cardapio ({menuItems.length})</h3>
                <Button variant="mini" onClick={() => setShowForm(!showForm)}>
                  {showForm ? 'Cancelar' : '+ Novo item'}
                </Button>
              </div>

              {showForm && (
                <GlassCard style={{ marginBottom: '16px' }}>
                  <form onSubmit={addMenuItem}>
                    <div className="form-group">
                      <label>Nome</label>
                      <input className="input-field" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>Descrição</label>
                      <input className="input-field" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      <div className="form-group">
                        <label>Preco (R$)</label>
                        <input className="input-field" type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required />
                      </div>
                      <div className="form-group">
                        <label>Emoji</label>
                        <input className="input-field" value={formData.emoji} onChange={(e) => setFormData({ ...formData, emoji: e.target.value })} />
                      </div>
                    </div>
                    <Button variant="checkout" type="submit">Salvar item</Button>
                  </form>
                </GlassCard>
              )}

              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Preco</th>
                    <th>Status</th>
                    <th>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {menuItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <span style={{ marginRight: '8px' }}>{item.emoji || '🍽️'}</span>
                        {item.name}
                      </td>
                      <td>{formatCurrency(item.price)}</td>
                      <td>
                        <button
                          className={`${styles.toggle} ${item.is_available ? styles.toggleOn : ''}`}
                          onClick={() => toggleAvailability(item.id, item.is_available)}
                          aria-label="Toggle disponibilidade"
                        />
                      </td>
                      <td>
                        <Button variant="danger" onClick={() => deleteMenuItem(item.id)} style={{ padding: '8px 12px', fontSize: '0.78rem' }}>
                          Remover
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div>
              <h3 className="h3" style={{ marginBottom: '14px' }}>Pedidos recebidos ({orders.length})</h3>
              {orders.length === 0 ? (
                <p style={{ color: 'var(--muted)' }}>Nenhum pedido recebido ainda</p>
              ) : (
                orders.map((order) => (
                  <GlassCard key={order.id} style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div>
                        <div style={{ fontWeight: 800 }}>Pedido #{order.id?.slice(0, 8)}</div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>{formatDate(order.created_at)}</div>
                      </div>
                      <Tag>{order.status}</Tag>
                    </div>
                    <div style={{ fontSize: '0.88rem', color: 'var(--muted)', marginBottom: '10px' }}>
                      Total: {formatCurrency(order.total || 0)}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {order.status === 'confirmed' && (
                        <Button variant="mini" onClick={() => updateOrderStatus(order.id, 'preparing')}>Iniciar preparo</Button>
                      )}
                      {order.status === 'preparing' && (
                        <Button variant="success" onClick={() => updateOrderStatus(order.id, 'out_for_delivery')}>Saiu p/ entrega</Button>
                      )}
                      {order.status === 'out_for_delivery' && (
                        <Button variant="success" onClick={() => updateOrderStatus(order.id, 'delivered')}>Marcar entregue</Button>
                      )}
                    </div>
                  </GlassCard>
                ))
              )}
            </div>
          )}

          {/* Settlements Tab */}
          {activeTab === 'settlements' && (
            <div>
              <h3 className="h3" style={{ marginBottom: '14px' }}>Repasses (85% do valor do pedido)</h3>
              {!settlements ? (
                <p style={{ color: 'var(--muted)' }}>Sem dados de repasse ainda.</p>
              ) : (
                <>
                  <GlassCard style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                      <div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Pedidos
                        </div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text)' }}>
                          {settlements.summary?.total_orders || 0}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Total a receber
                        </div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--success)' }}>
                          {formatCurrency(Number(settlements.summary?.total_earned || 0))}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Chave PIX do restaurante
                        </div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text)', wordBreak: 'break-all' }}>
                          {settlements.restaurant?.pj_pix_key || '—'}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--muted)', marginTop: '4px' }}>
                          CNPJ: {settlements.restaurant?.pj_cnpj || '—'}
                        </div>
                      </div>
                    </div>
                  </GlassCard>

                  {settlements.settlements?.length === 0 ? (
                    <p style={{ color: 'var(--muted)' }}>
                      Nenhum pedido pago ainda. Assim que um pedido for pago, o repasse aparecera aqui.
                    </p>
                  ) : (
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>Pedido</th>
                          <th>Data</th>
                          <th>Total do pedido</th>
                          <th>Seu repasse (85%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {settlements.settlements.map((s) => (
                          <tr key={s.order_id}>
                            <td>#{s.order_id?.slice(0, 8)}</td>
                            <td>{formatDate(s.order_date)}</td>
                            <td>{formatCurrency(Number(s.order_total))}</td>
                            <td style={{ fontWeight: 700, color: 'var(--success)' }}>
                              {formatCurrency(Number(s.restaurant_share))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && settings && (
            <GlassCard>
              <h3 className="h3" style={{ marginBottom: '14px' }}>Configurações do restaurante</h3>
              <div className="form-group">
                <label>Nome</label>
                <input className="input-field" value={settings.name || ''} readOnly />
              </div>
              <div className="form-group">
                <label>Culinaria</label>
                <input className="input-field" value={settings.cuisine || ''} readOnly />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label>ETA min</label>
                  <input className="input-field" value={settings.eta_min || ''} readOnly />
                </div>
                <div className="form-group">
                  <label>ETA max</label>
                  <input className="input-field" value={settings.eta_max || ''} readOnly />
                </div>
              </div>
              <div className="form-group">
                <label>Taxa de entrega</label>
                <input className="input-field" value={settings.delivery_fee || ''} readOnly />
              </div>
              <div className="form-group">
                <label>Pedido mínimo</label>
                <input className="input-field" value={settings.min_order || ''} readOnly />
              </div>
              {settings.promo_text && (
                <div className="form-group">
                  <label>Promoção</label>
                  <input className="input-field" value={settings.promo_text || ''} readOnly />
                </div>
              )}
            </GlassCard>
          )}
        </>
      )}
    </div>
  );
}
