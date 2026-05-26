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

const getWeeklyContributionPoints = (items = [], maxWeeks = 52) => {
  if (!items.length) return [];

  const sorted = [...items].sort((a, b) => new Date(a.date) - new Date(b.date));
  const firstDate = new Date(sorted[0].date);
  const startOfWeek = new Date(firstDate);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

  const weeklyTotals = [];
  sorted.forEach((item) => {
    const date = new Date(item.date);
    const weekIndex = Math.floor((date - startOfWeek) / 86400000 / 7);
    weeklyTotals[weekIndex] = (weeklyTotals[weekIndex] ?? 0) + item.count;
  });

  const points = Array.from({ length: weeklyTotals.length }, (_, index) => weeklyTotals[index] ?? 0);
  return points.slice(-maxWeeks);
};

const ContributionWave = ({ points }) => {
  const width = 560;
  const height = 180;
  const max = Math.max(...points, 1);
  const step = points.length > 1 ? width / (points.length - 1) : width;

  const line = points
    .map((value, index) => {
      const x = Math.round(index * step);
      const y = Math.round(height - (value / max) * (height - 40) - 20);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={styles.waveSvg}>
      <defs>
        <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(90,176,255,0.45)" />
          <stop offset="100%" stopColor="rgba(90,176,255,0.08)" />
        </linearGradient>
      </defs>
      <path d={`${line} L ${width} ${height} L 0 ${height} Z`} fill="url(#waveGradient)" />
      <path d={line} fill="none" stroke="#5AB0FF" strokeWidth="3" strokeLinecap="round" />
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

  const weeklyPoints = useMemo(
    () => getWeeklyContributionPoints(contributions?.contributions ?? [], 52),
    [contributions]
  );

  const recentContributions = useMemo(
    () => contributions?.contributions.slice(-28) ?? [],
    [contributions]
  );

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
          label="GitHub"
          title="Dashboard đóng góp"
          subtitle="Quan sát trạng thái đóng góp GitHub với biểu đồ gợn sóng và số liệu hoạt động mới nhất."
        />

        <div className={styles.grid}>
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <span>Contributor graph</span>
              <span>{loading ? 'Đang tải...' : `${weeklyPoints.length} tuần gần nhất`}</span>
            </div>

            <div className={styles.chartBody}>
              {loading ? (
                <div className={styles.skeleton} />
              ) : contributions ? (
                <ContributionWave points={weeklyPoints} />
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
