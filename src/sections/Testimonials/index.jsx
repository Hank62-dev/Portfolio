import SectionTitle from '../../components/common/SectionTitle';
import styles from './Testimonials.module.css';

const testimonials = [
  {
    id: 1,
    name: 'Văng Khánh Khuyên',
    role: 'Member',
    avatar: 'VKK',
    color: '#c8f043',
    text: 'Hank là một trong những engineer tốt nhất mình từng làm việc cùng. Không chỉ viết code sạch, anh ấy luôn chủ động đề xuất giải pháp tốt hơn và care về business impact.',
  },
  {
    id: 2,
    name: 'Nguyễn Văn Quốc Bảo',
    role: 'Member',
    avatar: 'NVQB',
    color: '#00e5cc',
    text: 'Khả năng biến thiết kế phức tạp thành code chạy mượt của anh ấy thật đáng kinh ngạc. Deadline không bao giờ trễ và communication luôn rõ ràng.',
  },
  {
    id: 3,
    name: 'Võ Nguyễn Thiên Phú',
    role: 'Member ',
    avatar: 'VNTF',
    color: '#f65cd7',
    text: 'Hợp tác với Hank là trải nghiệm tuyệt vời. Anh hiểu nhanh requirement, deliver đúng kỳ vọng và luôn đưa ra các best practice để codebase bền vững hơn.',
  },
];

const Testimonials = () => (
  <section id="testimonials" className={styles.testimonials}>
    <div className="container">
      <SectionTitle
        label="Nhận xét"
        title="Thành viên nói gì"
        align="center"
      />

      <div className={styles.grid}>
        {testimonials.map((t, i) => (
          <div
            key={t.id}
            className={`${styles.card} reveal`}
            style={{ animationDelay: `${i * 0.12}s`, '--t-color': t.color }}
          >
            <div className={styles.quote}>"</div>
            <p className={styles.text}>{t.text}</p>
            <div className={styles.author}>
              <div className={styles.avatar} style={{ background: `${t.color}18`, border: `1px solid ${t.color}33` }}>
                <span style={{ color: t.color }}>{t.avatar}</span>
              </div>
              <div>
                <div className={styles.name}>{t.name}</div>
                <div className={styles.role}>{t.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default Testimonials;
