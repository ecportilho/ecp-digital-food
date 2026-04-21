import { useAuth } from '../../context/AuthContext';
import { useAddress, formatAddressShort } from '../../hooks/useAddress';
import { StatusPill } from '../ui/Badge';
import styles from './TopBar.module.css';

export default function TopBar() {
  const { user } = useAuth();
  const { defaultAddress } = useAddress();

  const addressLabel = defaultAddress ? formatAddressShort(defaultAddress) : 'Cadastrar endereco';

  return (
    <header className={styles.topBar}>
      <div className={styles.brandMark}>
        <div className={styles.brandIcon}>&#x2B21;</div>
        <span className={styles.brandName}>ECP Food</span>
      </div>
      <div className={styles.pills}>
        {user && <StatusPill>📍 {addressLabel}</StatusPill>}
        <StatusPill>⚡ 24 online</StatusPill>
      </div>
    </header>
  );
}
