import RestaurantCard from './RestaurantCard';
import styles from './RestaurantGrid.module.css';

export default function RestaurantGrid({ restaurants = [], selectedId }) {
  if (restaurants.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>🔎</div>
        <h3 className="h3">Nenhum restaurante encontrado</h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginTop: '8px' }}>
          Tente buscar por outro termo ou categoria
        </p>
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {restaurants.map((r) => (
        <RestaurantCard
          key={r.id}
          restaurant={r}
          selected={selectedId === r.id}
        />
      ))}
    </div>
  );
}
