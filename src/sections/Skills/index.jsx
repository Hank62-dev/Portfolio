import { useState } from 'react';
import { skillGroups } from '../../data/skills';
import SectionTitle from '../../components/common/SectionTitle';
import styles from './Skills.module.css';

const SkillBar = ({ name, level, color, index }) => (
  <div className={styles.skillItem} style={{ animationDelay: `${index * 0.06}s` }}>
    <div className={styles.skillTop}>
      <span className={styles.skillName}>{name}</span>
      <span className={styles.skillLevel} style={{ color }}>{level}%</span>
    </div>
    <div className={styles.skillTrack}>
      <div
        className={styles.skillFill}
        style={{ '--width': `${level}%`, '--color': color }}
      />
    </div>
  </div>
);

const Skills = () => {
  const [active, setActive] = useState('frontend');
  const group = skillGroups.find((g) => g.id === active);

  return (
    <section id="skills" className={styles.skills}>
      <div className="container">
        <SectionTitle
          label="Kỹ năng"
          title="Công nghệ & Tools"
          subtitle="Những ngôn ngữ, framework và công cụ mình dùng hàng ngày."
        />

        <div className={styles.tabs}>
          {skillGroups.map((g) => (
            <button
              key={g.id}
              className={`${styles.tab} ${active === g.id ? styles.activeTab : ''}`}
              onClick={() => setActive(g.id)}
              style={active === g.id ? { '--tab-color': g.color } : {}}
            >
              <span className={styles.tabIcon}>{g.icon}</span>
              {g.label}
            </button>
          ))}
        </div>

        <div className={styles.panel}>
          <div className={styles.panelLeft}>
            <div className={styles.groupHeader}>
              <span className={styles.groupIcon} style={{ color: group.color }}>{group.icon}</span>
              <div>
                <div className={styles.groupName}>{group.label}</div>
                <div className={styles.groupCount}>{group.skills.length} kỹ năng</div>
              </div>
            </div>
            <div className={styles.skillList}>
              {group.skills.map((s, i) => (
                <SkillBar key={s.name} {...s} color={group.color} index={i} />
              ))}
            </div>
          </div>

          <div className={styles.panelRight}>
            <div className={styles.radarWrap}>
              <svg viewBox="0 0 280 280" className={styles.radar}>
                {/* Background rings */}
                {[1, 2, 3, 4].map((r) => (
                  <circle key={r} cx="140" cy="140" r={r * 30} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                ))}
                {/* Axes */}
                {group.skills.slice(0, 6).map((_, i) => {
                  const angle = (i / Math.min(group.skills.length, 6)) * Math.PI * 2 - Math.PI / 2;
                  return (
                    <line key={i} x1="140" y1="140"
                      x2={140 + Math.cos(angle) * 120}
                      y2={140 + Math.sin(angle) * 120}
                      stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                  );
                })}
                {/* Filled polygon */}
                <polygon
                  points={group.skills.slice(0, 6).map((s, i) => {
                    const n = Math.min(group.skills.length, 6);
                    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
                    const r = (s.level / 100) * 120;
                    return `${140 + Math.cos(angle) * r},${140 + Math.sin(angle) * r}`;
                  }).join(' ')}
                  fill={`${group.color}18`}
                  stroke={group.color}
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                {/* Points */}
                {group.skills.slice(0, 6).map((s, i) => {
                  const n = Math.min(group.skills.length, 6);
                  const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
                  const r = (s.level / 100) * 120;
                  return (
                    <circle key={i}
                      cx={140 + Math.cos(angle) * r}
                      cy={140 + Math.sin(angle) * r}
                      r="4" fill={group.color}
                    />
                  );
                })}
              </svg>
            </div>

            <div className={styles.topSkill}>
              <span className={styles.topLabel}>Top skill</span>
              <span className={styles.topName} style={{ color: group.color }}>
                {group.skills.sort((a, b) => b.level - a.level)[0].name}
              </span>
              <span className={styles.topPct}>
                {group.skills.sort((a, b) => b.level - a.level)[0].level}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Skills;
