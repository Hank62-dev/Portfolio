import { personalInfo } from '../../data/socials';
import { techStack } from '../../data/skills';
import SectionTitle from '../../components/common/SectionTitle';
import Button from '../../components/common/Button';
import styles from './About.module.css';

const About = () => {
  return (
    <section id="about" className={styles.about}>
      <div className="container">
        <div className={styles.layout}>
          {/* Left: avatar + floating cards */}
          <div className={`${styles.visual} reveal-left`}>
            <div className={styles.avatarWrap}>
              <div className={styles.avatar}>
                <span className={styles.avatarInitials}>Hank</span>
              </div>
              <div className={styles.ring} />
              <div className={styles.ring2} />
            </div>

            {/* Floating stat cards */}
            <div className={`${styles.floatCard} ${styles.floatCard1}`}>
              <span className={styles.floatIcon}></span>
              <div>
                <div className={styles.floatValue}>1+ năm</div>
                <div className={styles.floatLabel}>Kinh nghiệm</div>
              </div>
            </div>
            <div className={`${styles.floatCard} ${styles.floatCard2}`}>
              <span className={styles.floatIcon}></span>
              <div>
                <div className={styles.floatValue}>30+ dự án</div>
                <div className={styles.floatLabel}>Hoàn thành</div>
              </div>
            </div>
          </div>

          {/* Right: text content */}
          <div className={`${styles.text} reveal-right`}>
            <SectionTitle
              label="Về mình"
              title={<>Đam mê tạo ra<br /><em className={styles.italic}>trải nghiệm số</em></>}
            />

            <div className={styles.paragraphs}>
              <p>
                Mình là <strong>{personalInfo.name}</strong>, một Software Engineer tại{' '}
                <strong>{personalInfo.location}</strong>. Với hơn 1 năm trong nghề, mình đã xây dựng
                nhiều sản phẩm từ startup MVP đến platform enterprise.
              </p>
              <p>
                Mình tin rằng code tốt không chỉ là code chạy được — mà còn phải dễ đọc, dễ bảo trì
                và mang lại giá trị thực sự cho người dùng. Mình quan tâm đến cả kỹ thuật lẫn thiết kế.
              </p>
              <p>
                Ngoài công việc, mình hay viết blog kỹ thuật, đóng góp open source và học thêm về
                system design. Luôn sẵn sàng nhận dự án thú vị và collaborations mới.
              </p>
            </div>

            {/* Info grid */}
            <div className={styles.infoGrid}>
              {[
                { label: 'Email', value: personalInfo.email },
                { label: 'Địa điểm', value: personalInfo.location },
                { label: 'Trạng thái', value: personalInfo.available ? ' Available' : ' Busy' },
                { label: 'Ngôn ngữ', value: 'Vietnamese, English' },
              ].map((item) => (
                <div key={item.label} className={styles.infoItem}>
                  <span className={styles.infoLabel}>{item.label}</span>
                  <span className={styles.infoValue}>{item.value}</span>
                </div>
              ))}
            </div>

            <Button href="/cv.pdf" variant="primary" target="_blank">
              Tải CV
            </Button>
          </div>
        </div>

        {/* Tech marquee */}
        <div className={`${styles.marqueeWrap} reveal`}>
          <div className={styles.marquee}>
            <div className={styles.marqueeTrack}>
              {[...techStack, ...techStack].map((t, i) => (
                <span key={i} className={styles.marqueeItem}>
                  {t}
                  <span className={styles.marqueeDot}>✦</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
