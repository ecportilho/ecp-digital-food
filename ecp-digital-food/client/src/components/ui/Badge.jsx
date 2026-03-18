import styles from './Badge.module.css';

export function Tag({ children, className = '' }) {
  return <span className={`${styles.tag} ${className}`}>{children}</span>;
}

export function BadgeHero({ children, className = '' }) {
  return <span className={`${styles.badgeHero} ${className}`}>{children}</span>;
}

export function CoverTag({ children, className = '' }) {
  return <span className={`${styles.coverTag} ${className}`}>{children}</span>;
}

export function MetaPill({ children, className = '' }) {
  return <span className={`${styles.metaPill} ${className}`}>{children}</span>;
}

export function StatusPill({ children, className = '' }) {
  return <span className={`${styles.statusPill} ${className}`}>{children}</span>;
}

export function NavBadge({ count, hidden = false }) {
  if (hidden || count <= 0) return null;
  return <span className={styles.navBadge}>{count}</span>;
}
