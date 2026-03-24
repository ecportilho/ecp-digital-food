import styles from './GlassCard.module.css';

export default function GlassCard({ children, className = '', padded = true, style }) {
  return (
    <div
      className={`${styles.glassCard} ${padded ? styles.padded : ''} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
