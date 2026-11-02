import { lazy, Suspense, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Brain, ChevronLeft, Dices, Grid3x3, Hand, Hash, LayoutGrid, Ship, Swords, Worm } from 'lucide-react';
import { Spinner } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { PageHead } from '../components/Page';
import { BauCua, FindNumbers, Memory, Rps } from '../games/small';

const Sudoku = lazy(() => import('../games/Sudoku'));
const Caro = lazy(() => import('../games/Caro'));
const Snake = lazy(() => import('../games/Snake'));
const PaperBoats = lazy(() => import('../games/PaperBoats'));

const GAMES = [
  { id: 'numbers', name: 'Tìm số', hint: 'Tap 1 to 25 in order, fast.', icon: Hash, hue: 200, play: FindNumbers },
  { id: 'boats', name: 'Bắn tàu giấy', hint: 'Sink the paper boats on the stream.', icon: Ship, hue: 215, play: PaperBoats },
  { id: 'sudoku', name: 'Sudoku', hint: 'Fill the grid, no digit twice.', icon: Grid3x3, hue: 270, play: Sudoku },
  { id: 'baucua', name: 'Bầu cua tôm cá', hint: 'The Tết dice game, with pretend coins.', icon: Dices, hue: 12, play: BauCua },
  { id: 'caro', name: 'Cờ caro', hint: 'Five in a row against the computer.', icon: LayoutGrid, hue: 150, play: Caro },
  { id: 'memory', name: 'Lật hình', hint: 'Find all the pairs.', icon: Brain, hue: 330, play: Memory },
  { id: 'snake', name: 'Rắn săn mồi', hint: 'Eat, grow, do not crash.', icon: Worm, hue: 100, play: Snake },
  { id: 'rps', name: 'Kéo búa bao', hint: 'The oldest duel of all.', icon: Hand, hue: 45, play: Rps },
];

/** "Ra chơi": a handful of small games for a break, easy to learn and played in a minute. */
export default function GamesView() {
  const [params, setParams] = useSearchParams();
  const current = useMemo(() => GAMES.find((g) => g.id === params.get('game')), [params]);
  const open = (id) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set('game', id);
      return next;
    });
  const close = () =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.delete('game');
      return next;
    });

  if (current) {
    const Play = current.play;
    return (
      <div className="mx-auto flex w-full max-w-[34rem] flex-col gap-4" data-game={current.id}>
        <div className="flex items-center gap-3">
          <button type="button" onClick={close} aria-label="Back to the games" className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-ink-1 text-bone active:scale-90">
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl text-white" style={{ background: `linear-gradient(150deg, hsl(${current.hue} 70% 46%), hsl(${(current.hue + 40) % 360} 62% 28%))` }}>
            <current.icon size={19} aria-hidden="true" />
          </span>
          <div className="min-w-0 leading-tight">
            <h2 className="truncate font-display text-[1.5rem] text-bone">{current.name}</h2>
            <p className="truncate font-mono text-[0.7rem] text-bone-faint">{current.hint}</p>
          </div>
        </div>
        <Suspense fallback={<p className="flex items-center gap-3 py-10 font-mono text-fine text-bone-dim"><Spinner label="Loading" /> Loading…</p>}>
          <Play />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHead eyebrow="Life" title="Ra" accent="chơi." description="Small games for a break: easy to learn, over in a minute, and your best scores stay on this device." />
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Games">
        {GAMES.map(({ id, name, hint, icon: Icon, hue }) => (
          <li key={id}>
            <button type="button" onClick={() => open(id)} className="group flex h-full w-full flex-col gap-3 rounded-[1.6rem] border border-line bg-ink-1 p-4 text-left transition-all active:scale-[0.97] md:hover:-translate-y-0.5 md:hover:border-line-strong">
              <span className={clsx('grid size-12 place-items-center rounded-2xl text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.18)]')} style={{ background: `linear-gradient(150deg, hsl(${hue} 70% 46%), hsl(${(hue + 40) % 360} 62% 28%))` }}>
                <Icon size={24} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <span className="leading-tight">
                <b className="block font-display text-[1.25rem] font-normal text-bone">{name}</b>
                <small className="mt-1 block text-[0.78rem] leading-snug text-bone-dim">{hint}</small>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="flex items-center gap-2 font-mono text-[0.7rem] text-bone-faint">
        <Swords size={13} aria-hidden="true" /> More games are easy to add: each one is a small file in <code>src/features/spacehank/games</code>.
      </p>
    </div>
  );
}
