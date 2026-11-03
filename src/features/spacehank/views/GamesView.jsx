import { lazy, Suspense, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, Brain, Grid3x3, Hand, Hash, Worm } from 'lucide-react';
import { Desk, Doodle, INK, InkBox, InkButton, RED, Title } from '../games/ink';
import { BauCua, FindNumbers, Memory, Rps } from '../games/small';

const Sudoku = lazy(() => import('../games/Sudoku'));
const Caro = lazy(() => import('../games/Caro'));
const Snake = lazy(() => import('../games/Snake'));
const Battleship = lazy(() => import('../games/SeaBattle'));

const PEN = { filter: 'url(#pen)' };
const GAMES = [
  { id: 'boats', name: 'Bắn tàu giấy', hint: 'Sea battle for two, drawn in pen.', icon: () => <Doodle name="boat" size={46} />, tone: INK, play: Battleship },
  { id: 'caro', name: 'Cờ caro', hint: 'Five in a row, X against O.', icon: () => <Doodle name="cross" size={44} />, tone: RED, play: Caro },
  { id: 'sudoku', name: 'Sudoku', hint: 'Fill the grid, no digit twice.', icon: () => <Grid3x3 size={42} strokeWidth={2} color={INK} style={PEN} aria-hidden="true" />, tone: INK, play: Sudoku },
  { id: 'baucua', name: 'Bầu cua tôm cá', hint: 'The Tết dice game, pretend coins.', icon: () => <Doodle name="cua" size={46} tone={RED} />, tone: RED, play: BauCua },
  { id: 'numbers', name: 'Tìm số', hint: 'Tap 1 to 25 in order, fast.', icon: () => <Hash size={42} strokeWidth={2.2} color={INK} style={PEN} aria-hidden="true" />, tone: INK, play: FindNumbers },
  { id: 'memory', name: 'Lật hình', hint: 'Find all the pairs.', icon: () => <Brain size={42} strokeWidth={2} color={RED} style={PEN} aria-hidden="true" />, tone: RED, play: Memory },
  { id: 'snake', name: 'Rắn săn mồi', hint: 'Eat, grow, do not crash.', icon: () => <Worm size={42} strokeWidth={2} color={INK} style={PEN} aria-hidden="true" />, tone: INK, play: Snake },
  { id: 'rps', name: 'Kéo búa bao', hint: 'The oldest duel of all.', icon: () => <Hand size={42} strokeWidth={2} color={RED} style={PEN} aria-hidden="true" />, tone: RED, play: Rps },
];

/** The page of a game while its code arrives: a few lines in pale ink, where the game will be drawn. */
const GameLoading = () => (
  <div role="status" aria-busy="true" aria-label="Opening the game" className="flex flex-col gap-3">
    <i className="block h-5 w-2/3 animate-pulse rounded-full" style={{ background: `${INK}26` }} />
    <i className="block h-40 animate-pulse rounded-md" style={{ background: `${INK}14` }} />
    <i className="block h-12 animate-pulse rounded-md" style={{ background: `${INK}1f` }} />
  </div>
);

/** "Ra chơi": small games for a break, all drawn in blue pen on a squared page. */
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
      <Desk>
        <div data-game={current.id} className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <InkButton onClick={close} aria-label="Back to the games" className="shrink-0">
              <ArrowLeft size={18} strokeWidth={2.6} aria-hidden="true" />
            </InkButton>
            <Title hint={current.hint}>{current.name}</Title>
          </div>
          <Suspense fallback={<GameLoading />}>
            <Play />
          </Suspense>
        </div>
      </Desk>
    );
  }

  return (
    <Desk>
      <div className="flex flex-col gap-5">
        <Title hint="Games for a break. Easy to learn, over in a minute. Your best scores stay on this device.">Ra chơi</Title>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-5" aria-label="Games">
          {GAMES.map(({ id, name, hint, icon: Icon, tone }, i) => (
            <li key={id} style={{ transform: `rotate(${i % 2 ? 1.2 : -1.2}deg)` }}>
              <InkBox as="button" type="button" onClick={() => open(id)} tone={tone} fill="#fffdf3" className="block h-full w-full text-left transition-transform active:scale-95">
                <i className="absolute -top-2 left-1/2 h-4 w-12 -translate-x-1/2 rotate-2 bg-[#e9d9a0]/85" aria-hidden="true" />
                <span className="flex flex-col gap-2 p-3.5 pt-5">
                  <Icon />
                  <b className="font-pen text-[1.55rem] leading-none" style={{ color: tone }}>
                    {name}
                  </b>
                  <small className="font-hand text-[0.88rem] leading-snug text-[#20296a]/80">{hint}</small>
                </span>
              </InkBox>
            </li>
          ))}
        </ul>
      </div>
    </Desk>
  );
}
