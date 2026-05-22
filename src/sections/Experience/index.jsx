import { useState } from 'react';
import { experiences } from '../../data/socials';
import SectionTitle from '../../components/common/SectionTitle';
import Badge from '../../components/ui/Badge';
import styles from './Experience.module.css';

const Experience = () => {
  const [active, setActive] = useState(0);
  const exp = experiences[active];

  return (
    <section id="experience" className={styles.experience}>
      <div className="container">
        <SectionTitle
          label="Kinh nghiệm"
          title="Hành trình sự nghiệp"
          subtitle="Những vai trò đã giúp mình trưởng thành như một developer."
        />

        <div className={styles.layout}>
          {/* Sidebar tabs */}
          <div className={styles.sidebar}>
            {experiences.map((e, i) => (
              <button
                key={e.id}
                className={`${styles.tab} ${active === i ? styles.activeTab : ''}`}
                onClick={() => setActive(i)}
                style={active === i ? { '--exp-color': e.color } : {}}
              >
                <div className={styles.tabDot} style={{ background: e.color }} />
                <div className={styles.tabText}>
                  <span className={styles.tabRole}>{e.role}</span>
                  <span className={styles.tabCompany}>{e.company}</span>
                </div>
              </button>
            ))}

            {/* Timeline line */}
            <div className={styles.timelineLine} />
          </div>

          {/* Content */}
          <div className={styles.content} key={active}>
            <div className={styles.header}>
              <div>
                <h3 className={styles.role} style={{ color: exp.color }}>{exp.role}</h3>
                <div className={styles.company}>
                  <span>{exp.company}</span>
                  <span className={styles.dot}>·</span>
                  <span>{exp.location}</span>
                </div>
              </div>
              <div className={styles.period}>
                <span className={styles.periodBadge}>{exp.period}</span>
                <span className={styles.type}>{exp.type}</span>
              </div>
            </div>

            <p className={styles.description}>{exp.description}</p>

            <div className={styles.highlights}>
              <h4 className={styles.highlightsTitle}>Thành tựu nổi bật</h4>
              <ul className={styles.highlightList}>
                {exp.highlights.map((h, i) => (
                  <li key={i} className={styles.highlight}>
                    <span className={styles.check} style={{ color: exp.color }}>✓</span>
                    {h}
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.techStack}>
              {exp.tech.map((t) => (
                <Badge key={t} variant="tech">{t}</Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Experience;
