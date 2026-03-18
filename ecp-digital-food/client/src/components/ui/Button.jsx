import styles from './Button.module.css';

export default function Button({
  variant = 'primary',
  children,
  className = '',
  disabled = false,
  onClick,
  type = 'button',
  style,
  ...rest
}) {
  const variantClass = styles[variant] || styles.primary;

  return (
    <button
      type={type}
      className={`${styles.btn} ${variantClass} ${className}`}
      disabled={disabled}
      onClick={onClick}
      style={style}
      {...rest}
    >
      {children}
    </button>
  );
}
