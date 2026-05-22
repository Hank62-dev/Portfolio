import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import styles from './NotFound.module.css';

const NotFound = () => {
  const nav = useNavigate();
  return (
    <div className={styles.wrap}>
      <div className={styles.code}>404</div>
      <h1 className={styles.title}>Trang không tìm thấy</h1>
      <p className={styles.sub}>Trang bạn đang tìm có vẻ đã biến mất vào không gian.</p>
      <Button onClick={() => nav('/')} variant="primary" size="lg">← Về trang chủ</Button>
    </div>
  );
};

export default NotFound;
