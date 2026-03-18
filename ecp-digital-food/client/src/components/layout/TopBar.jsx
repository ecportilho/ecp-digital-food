import { useAuth } from '../../context/AuthContext';
import { StatusPill } from '../ui/Badge';
import styles from './TopBar.module.css';

export default function TopBar() {
  const { user } = useAuth();

  return (
    <header className={styles.topBar}>
      <div className={styles.brandMark}>
        <div className={styles.brandIcon}>🍜</div>
        <span className={styles.brandName}>ECP Food</span>
      </div>
      <div className={styles.pills}>
        {user && <StatusPill>📍 Rua Augusta, 1234</StatusPill>}
        <StatusPill>⚡ 24 online</StatusPill>
      </div>
    </header>
  );
}
