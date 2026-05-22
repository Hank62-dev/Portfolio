import styles from './Badge.module.css';

const Badge = ({ children, color, variant = 'default' }) => {
  return (
    <span
      className={`${styles.badge} ${styles[variant]}`}
      style={color ? { '--badge-color': color } : {}}
    >
      {children}
    </span>
  );
};

export default Badge;
