import styles from './Skeleton.module.css';

export function Skeleton({ width = '100%', height = '1rem', radius = '8px', style, className }) {
  return (
    <div
      className={`${styles.skeleton} ${className || ''}`}
      style={{ width, height, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  );
}

export function RestaurantCardSkeleton() {
  return (
    <div className={styles.cardSkeleton}>
      <Skeleton height="160px" radius="14px" />
      <div className={styles.cardSkeletonBody}>
        <Skeleton width="70%" height="1.1rem" />
        <Skeleton width="50%" height="0.82rem" />
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <Skeleton width="56px" height="0.78rem" />
          <Skeleton width="72px" height="0.78rem" />
        </div>
      </div>
    </div>
  );
}

export function RestaurantGridSkeleton({ count = 6 }) {
  return (
    <div className={styles.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <RestaurantCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function OrderRowSkeleton() {
  return (
    <div className={styles.orderSkeleton}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <Skeleton width="45%" height="1.1rem" />
        <Skeleton width="80px" height="1.4rem" radius="999px" />
      </div>
      <Skeleton width="60%" height="0.84rem" style={{ marginBottom: '10px' }} />
      <Skeleton width="100%" height="0.84rem" />
    </div>
  );
}

export function OrderListSkeleton({ count = 3 }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <OrderRowSkeleton key={i} />
      ))}
    </div>
  );
}

export default Skeleton;
