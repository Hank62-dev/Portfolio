import { useEffect, useMemo, useState } from 'react';
import SectionTitle from '../../components/common/SectionTitle';
import { fetchGithubContributions } from '../../services/githubService';
import styles from './GithubDashboard.module.css';

const formatNumber = (value) => new Intl.NumberFormat('en-US').format(value);

const computeStreaks = (items = []) => {
  if (!items.length) return { current: 0, longest: 0 };

  const sorted = [...items].sort((a, b) => new Date(a.date) - new Date(b.date));
  let longest = 0;
  let streak = 0;
  let lastDate = null;

  sorted.forEach((item) => {
    const date = new Date(item.date);
    const isNextDay = lastDate ? (date - lastDate) / 86400000 === 1 : false;

    if (!isNextDay) {
      streak = 0;
    }

    if (item.count > 0) {
      streak += 1;
    } else {
      streak = 0;
    }

    longest = Math.max(longest, streak);
    lastDate = date;
  });

  let current = 0;
  const reversed = sorted.slice().reverse();
  for (let i = 0; i < reversed.length; i += 1) {
    if (reversed[i].count === 0) break;
    if (i === 0) {
      current = 1;
      continue;
    }
    const previousDate = new Date(reversed[i - 1].date);
    const currentDate = new Date(reversed[i].date);
    if ((previousDate - currentDate) / 86400000 === 1) {
      current += 1;
    } else {
      break;
    }
  }

  return {
    current,
    longest,
  };
};

const formatLabelDate = (dateString) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(dateString));

const getRecentDailyContributionData = (items = [], days = 28) => {
  // Build a map from date (YYYY-MM-DD) to count for fast lookup
  const map = new Map();
  items.forEach((it) => {
    map.set(it.date, it.count);
  });

  const points = [];
  const labels = [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));

  for (let i = 0; i < days; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    labels.push(iso);
    points.push(map.get(iso) ?? 0);
  }

  return { points, labels };
};

const ContributionWave = ({ points, labels }) => {
  const width = 820;
  const height = 180;
  const labelArea = 38;
  const totalHeight = height + labelArea;
  const max = Math.max(...points, 1);
  const step = points.length > 1 ? width / (points.length - 1) : width;

  const line = points
    .map((value, index) => {
      const x = Math.round(index * step);
      const y = Math.round(height - (value / max) * (height - 40) - 20);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  const labelStep = Math.ceil(points.length / 7);
  const labelIndexes = points.map((_, index) => index).filter((index) => index % labelStep === 0 || index === points.length - 1);

  return (
    <svg viewBox={`0 0 ${width} ${totalHeight}`} className={styles.waveSvg}>
      <defs>
        <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(90,176,255,0.45)" />
          <stop offset="100%" stopColor="rgba(90,176,255,0.08)" />
        </linearGradient>
      </defs>

      <path d={`${line} L ${width} ${height} L 0 ${height} Z`} fill="url(#waveGradient)" />
      <path d={line} fill="none" stroke="#5AB0FF" strokeWidth="3" strokeLinecap="round" />

      <line x1="0" y1={height + 4} x2={width} y2={height + 4} className={styles.axisLine} />
      {labelIndexes.map((index) => {
        const x = Math.round(index * step);
        const label = formatLabelDate(labels[index]);
        return (
          <g key={index}>
            <line x1={x} y1={height + 4} x2={x} y2={height + 10} className={styles.tickLine} />
            <text x={x} y={height + 28} className={styles.axisLabel}>
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const GithubDashboard = () => {
  const [contributions, setContributions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let canceled = false;

    fetchGithubContributions()
      .then((data) => {
        if (!canceled) setContributions(data);
      })
      .catch((err) => {
        if (!canceled) setError(err.message || 'Không thể tải dữ liệu đóng góp.');
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, []);

  const recentContributions = useMemo(
    () => contributions?.contributions.slice(-28) ?? [],
    [contributions]
  );

  const { points: dailyPoints, labels: dailyLabels } = useMemo(() => {
    return getRecentDailyContributionData(contributions?.contributions ?? [], 28);
  }, [contributions]);

  const totalThisYear = useMemo(() => {
    if (!contributions) return 0;
    return Object.values(contributions.total).reduce((sum, value) => sum + value, 0);
  }, [contributions]);

  const activeDays = useMemo(
    () => recentContributions.filter((item) => item.count > 0).length,
    [recentContributions]
  );

  const { current, longest } = useMemo(
    () => computeStreaks(contributions?.contributions ?? []),
    [contributions]
  );

  return (
    <section id="github-dashboard" className={styles.githubDashboard}>
      <div className="container">
        <SectionTitle
          label="Đóng góp"
          title="Dashboard"
          subtitle="Quan sát trạng thái đóng góp GitHub với biểu đồ gợn sóng và số liệu hoạt động mới nhất."
        />

        <div className={styles.grid}>
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <span>Contributor graph</span>
              <span>{loading ? 'Đang tải...' : '28 ngày gần nhất'}</span>
            </div>

            <div className={styles.chartBody}>
              {loading ? (
                <div className={styles.skeleton} />
              ) : contributions ? (
                <div className={styles.waveFrame}>
                  <ContributionWave points={dailyPoints} labels={dailyLabels} />
                </div>
              ) : (
                <div className={styles.fallbackBlock}>
                  <p>{error || 'Không thể tải biểu đồ gợn sóng.'}</p>
                  <img
                    className={styles.fallbackImage}
                    src="https://ghchart.rshah.org/Hank62-dev"
                    alt="GitHub contributions"
                  />
                </div>
              )}
            </div>
          </div>

          <div className={styles.statsCard}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Tổng đóng góp năm</span>
              <span className={styles.statValue}>{loading ? '---' : formatNumber(totalThisYear)}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Ngày có hoạt động</span>
              <span className={styles.statValue}>{loading ? '---' : activeDays}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Streak hiện tại</span>
              <span className={styles.statValue}>{loading ? '---' : current}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Streak dài nhất</span>
              <span className={styles.statValue}>{loading ? '---' : longest}</span>
            </div>
            <div className={styles.cardFooter}>
              <a href="https://github.com/Hank62-dev" target="_blank" rel="noreferrer" className={styles.ctaButton}>
                Xem hồ sơ GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GithubDashboard;
