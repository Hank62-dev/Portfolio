import { useEffect, useState } from 'react';
import { BellOff, CalendarClock, Layers, Pause, Play, RotateCcw, Sparkles, Timer } from 'lucide-react';
import { Button } from '../../../shared/ui';
import { clsx } from '../../../shared/lib/format';
import { MODES, dismiss, focus, pause, reset, setMode, start } from '../focus/store';
import FocusStats from '../focus/FocusStats';
import { Figure, PageHead, Segmented, Tile } from '../../ui/Page';
import CardsPanel from './cards/CardsPanel';
import Overview from './overview/Overview';
import { clock } from './model';
import { courses, flashcards } from './store';
import { useStore } from '../../core/store';
import { tr } from '../../core/i18n/lang';

const TABS = [
  { id: 'overview', label: tr('Overview'), icon: CalendarClock },
  { id: 'cards', label: tr('Flashcards'), icon: Layers },
  { id: 'focus', label: tr('Focus'), icon: Timer },
];

function Focus({ onFocusMusic }) {
  const { mode, status, total, left, sessions } = useStore(focus);
  const running = status === 'running';
  const ringing = status === 'done';
  const r = 96;
  const c = 2 * Math.PI * r;

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <section className="flex flex-col items-center gap-6 ink-panel rounded-3xl p-8">
        <Segmented value={mode} onChange={setMode} options={MODES.map((m) => ({ id: m.id, label: m.label }))} label={tr('Timer mode')} />
        <div className="relative size-60" role="timer" aria-live="off" aria-label={tr('{0} left', clock(left))}>
          <svg viewBox="0 0 220 220" className="-rotate-90">
            <circle cx="110" cy="110" r={r} fill="none" stroke="var(--color-line)" strokeWidth="10" />
            <circle cx="110" cy="110" r={r} fill="none" stroke="url(#pomo)" strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - left / total)} className="transition-[stroke-dashoffset] duration-300" />
            <defs>
              <linearGradient id="pomo" x1="0" x2="1">
                <stop offset="0" stopColor="var(--color-signal)" />
                <stop offset="1" stopColor="hsl(var(--tab) 62% 76%)" />
              </linearGradient>
            </defs>
          </svg>
          <span className="absolute inset-0 grid place-items-center">
            <b className={clsx('numeral text-bone [font-size:clamp(3.2rem,8vw,4.8rem)]', ringing && 'animate-pulse text-signal')} data-clock>
              {clock(left)}
            </b>
          </span>
        </div>
        {ringing ? (
          <Button onClick={dismiss}>
            <BellOff size={16} aria-hidden="true" /> {tr('Stop the alarm')}
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label={tr('Reset the timer')} onClick={reset}>
              <RotateCcw size={15} aria-hidden="true" />
            </Button>
            <button type="button" onClick={running ? pause : start} aria-label={running ? tr('Pause the timer') : tr('Start the timer')} className="grid size-16 place-items-center rounded-full bg-gradient-to-br from-signal to-[hsl(var(--tab)_70%_66%)] text-ink-0 shadow-[0_10px_30px_-10px_var(--color-signal)] transition-transform hover:scale-105 active:scale-95">
              {running ? <Pause size={24} fill="currentColor" aria-hidden="true" /> : <Play size={24} fill="currentColor" className="translate-x-px" aria-hidden="true" />}
            </button>
            <Button variant="ghost" size="sm" onClick={onFocusMusic}>
              <Sparkles size={14} aria-hidden="true" /> {tr('Focus music')}
            </Button>
          </div>
        )}
      </section>
      <div className="flex flex-col gap-3">
        <Figure value={sessions} label={tr('Focus sessions today')} tone="text-signal" />
        <FocusStats />
        <Tile title={tr('How it works')}>
          <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-fine text-bone-dim">
            <li>{tr('Focus for 25 minutes on one thing.')}</li>
            <li>{tr('Take a 5 minute break. After four sessions, a longer one.')}</li>
            <li>{tr('The timer floats above every screen while it runs, shows on your lock screen, and rings when the time is up.')}</li>
          </ol>
        </Tile>
      </div>
    </div>
  );
}

export default function StudyView({ onFocusMusic }) {
  const { items: courseList } = useStore(courses.store);
  const { items: cardList } = useStore(flashcards.store);
  const [tab, setTab] = useState(() => (focus.get().status === 'idle' ? 'overview' : 'focus'));

  useEffect(() => {
    void courses.load();
    void flashcards.load();
  }, []);

  const hasSample = courseList.some((c) => c.sample);

  return (
    <div className="flex flex-col gap-6">
      <PageHead keepOnPhone eyebrow={tr('Learn')} title={tr('Study')} accent="Hub." description={tr('Courses and deadlines, flashcards that come back just before you forget, and a focus timer.')}>
        {hasSample && (
          <Button variant="ghost" size="sm" className="max-md:hidden" onClick={async () => { await Promise.all(courseList.filter((c) => c.sample).map((c) => courses.remove(c.id))); await Promise.all(cardList.filter((c) => c.sample).map((c) => flashcards.remove(c.id))); }}>
            {tr('Remove samples')}
          </Button>
        )}
        <Segmented value={tab} onChange={setTab} options={TABS} label={tr('Study')} />
      </PageHead>

      {tab === 'overview' && <Overview list={courseList} cardList={cardList} onTab={setTab} />}
      {tab === 'cards' && <CardsPanel />}
      {tab === 'focus' && <Focus onFocusMusic={onFocusMusic} />}
    </div>
  );
}
