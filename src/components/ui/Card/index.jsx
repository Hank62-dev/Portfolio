import styles from './Card.module.css';

const Card = ({ children, className = '', hoverable = false, ...rest }) => {
  return (
    <div
      className={`${styles.card} ${hoverable ? styles.hoverable : ''} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};

export default Card;
