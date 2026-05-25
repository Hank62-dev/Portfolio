import { useTypingEffect } from '../../hooks/useTypingEffect';
import { personalInfo, socials } from '../../data/socials';
import Button from '../../components/common/Button';
import styles from './Hero.module.css';

const ROLES = ['Fullstack Developer', 'UI Engineer', 'Consultant', 'Software Engineer'];

const Hero = () => {
  const typed = useTypingEffect(ROLES, { typeSpeed: 75, deleteSpeed: 35, delayBetween: 2200 });

  return (
    <section className={styles.hero} id="hero">
      {/* Background grid */}
      <div className={styles.grid} aria-hidden />

      {/* Glow orb */}
      <div className={styles.orb} aria-hidden />

      <div className={`container ${styles.content}`}>
        <div className={styles.badge} style={{ animationDelay: '0s' }}>
          <span className={styles.dot} />
          <span>Đang nhận dự án mới</span>
        </div>

        <h1 className={styles.heading}>
          <span className={`${styles.hi} animate-fade-up`} style={{ animationDelay: '0.1s' }}>
            Xin chào, mình là
          </span>
          <span className={`${styles.name} animate-fade-up`} style={{ animationDelay: '0.2s' }}>
            {personalInfo.name}
          </span>
          <span className={`${styles.roleRow} animate-fade-up`} style={{ animationDelay: '0.3s' }}>
            <span className={styles.roleStatic}>Một </span>
            <span className={styles.roleTyped}>
              {typed}
              <span className={styles.cursor}>|</span>
            </span>
          </span>
        </h1>

        <p className={`${styles.bio} animate-fade-up`} style={{ animationDelay: '0.45s' }}>
          {personalInfo.bio}
        </p>

        <div className={`${styles.actions} animate-fade-up`} style={{ animationDelay: '0.55s' }}>
          <Button href="#projects" variant="primary" size="lg">
            Xem dự án
          </Button>
          <Button href="#contact" variant="secondary" size="lg">
            Liên hệ ngay
          </Button>
        </div>

        <div className={`${styles.stats} animate-fade-up`} style={{ animationDelay: '0.65s' }}>
          {[
            { value: `${personalInfo.yearsExp}+`, label: 'Năm kinh nghiệm' },
            { value: `${personalInfo.projectsDone}+`, label: 'Dự án hoàn thành' },
            { value: `${personalInfo.clients}+`, label: 'Khách hàng' },
          ].map((s) => (
            <div key={s.label} className={styles.stat}>
              <span className={styles.statValue}>{s.value}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>

        <div className={`${styles.socialRow} animate-fade-up`} style={{ animationDelay: '0.75s' }}>
          {socials.map((s) => (
            <a
              key={s.id}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialLink}
              aria-label={s.label}
            >
              {s.icon}
            </a>
          ))}
        </div>
      </div>

      {/* Scroll hint */}
      <div className={styles.scrollHint}>
        <div className={styles.scrollLine} />
        <span>scroll</span>
      </div>
    </section>
  );
};

export default Hero;
