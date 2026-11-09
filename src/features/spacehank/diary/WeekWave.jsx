import MoodFace from './MoodFace';

// The last seven days as a wave: a panda for each day, higher the better the day went, joined to the next written day by a soft line.
// A day without a page is an empty panda drawn in dots, low on the wave. `week` is weekMoods(...).

const top = (mood) => (mood ? 62 - mood * 9.6 : 70); // percent from the top: mood 5 is high, no page is low
const left = (i) => ((i + 0.5) / 7) * 100;

export default function WeekWave({ week, todayKey }) {
  const pts = week.map((d, i) => ({ x: left(i), y: top(d.mood), on: d.written }));
  const lines = pts.slice(1).flatMap((p, i) => {
    const a = pts[i];
    if (!a.on || !p.on) return [];
    const mid = (a.x + p.x) / 2;
    return [`M${a.x} ${a.y} C${mid} ${a.y} ${mid} ${p.y} ${p.x} ${p.y}`];
  });
  return (
    <div className="relative h-[7.6rem]">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
        {lines.map((d) => (
          <path key={d} d={d} fill="none" stroke="var(--dz-trail)" strokeOpacity="0.7" strokeWidth="2.4" strokeLinecap="round" vectorEffect="non-scaling-stroke" className="week-line" />
        ))}
      </svg>
      <ol className="absolute inset-0">
        {week.map((d, i) => (
          <li key={d.day} className="absolute flex w-[14.2%] -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={{ left: `${pts[i].x}%`, top: `${pts[i].y}%` }}>
            <span className={d.day === todayKey ? 'week-face week-face-now' : 'week-face'} style={{ '--i': i }}>
              <MoodFace mood={d.mood} size="100%" ring={d.day === todayKey && Boolean(d.mood)} />
            </span>
          </li>
        ))}
      </ol>
      <ol className="absolute inset-x-0 bottom-0 flex">
        {week.map((d) => (
          <li key={d.day} className={`flex-1 text-center font-mono text-[0.62rem] uppercase ${d.day === todayKey ? 'font-semibold text-[color:var(--dz-text)]' : 'text-[color:var(--dz-text)]/70'}`}>
            {d.weekday}
          </li>
        ))}
      </ol>
    </div>
  );
}
