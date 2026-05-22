import styles from './Button.module.css';
import { clsx } from '../../../utils/helpers';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  href,
  target,
  onClick,
  className,
  disabled,
  ...rest
}) => {
  const classes = clsx(
    styles.btn,
    styles[variant],
    styles[size],
    disabled && styles.disabled,
    className
  );

  if (href) {
    return (
      <a href={href} target={target} className={classes} {...rest}>
        {children}
        {variant === 'primary' && <span className={styles.arrow}>→</span>}
      </a>
    );
  }

  return (
    <button onClick={onClick} className={classes} disabled={disabled} {...rest}>
      {children}
      {variant === 'primary' && <span className={styles.arrow}>→</span>}
    </button>
  );
};

export default Button;
