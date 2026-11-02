import { useEffect, useRef, useState } from 'react';
import { Bird, Flame, Fish, Hand, Hammer, Leaf, Moon, RotateCcw, Scissors, Star, Sun, Heart } from 'lucide-react';
import { Button } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { BAU_CUA, HANDS, duel, rollDice, settle, shuffle } from './logic';
import { Result, Stat, useBest } from './shared';

// ---- Tìm số: tap 1 to 25 in order, as fast as you can -------------------------------------------------------------

export function FindNumbers() {
  const [grid, setGrid] = useState(() => shuffle(Array.from({ length: 25 }, (_, i) => i + 1)));
  const [next, setNext] = useState(1);
  const [started, setStarted] = useState(0);
  const [time, setTime] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [best, report] = useBest('numbers', true);
  const [record, setRecord] = useState(false);
  const done = next > 25;

  useEffect(() => {
    if (!started || done) return undefined;
    const timer = window.setInterval(() => setTime((Date.now() - started) / 1000), 100);
    return () => window.clearInterval(timer);
  }, [started, done]);

  const tap = (n) => {
    if (done) return;
    if (!started) setStarted(Date.now());
    if (n !== next) {
      setWrong(n);
      navigator.vibrate?.(30);
      window.setTimeout(() => setWrong(0), 250);
      return;
    }
    if (n === 25) {
      const final = (Date.now() - (started || Date.now())) / 1000;
      setTime(final);
      setRecord(report(Math.round(final * 10) / 10));
    }
    setNext(n + 1);
  };
  const again = () => {
    setGrid(shuffle(Array.from({ length: 25 }, (_, i) => i + 1)));
    setNext(1);
    setStarted(0);
    setTime(0);
    setRecord(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Stat label="Next" value={done ? '-' : next} tone="text-signal" />
        <Stat label="Time" value={`${time.toFixed(1)}s`} />
        <Stat label="Best" value={best === null ? '-' : `${best}s`} />
      </div>
      <ul className="grid grid-cols-5 gap-2" aria-label="Numbers">
        {grid.map((n) => (
          <li key={n}>
            <button type="button" onClick={() => tap(n)} disabled={n < next} className={clsx('grid aspect-square w-full place-items-center rounded-2xl border font-display text-[1.5rem] transition-all active:scale-90', n < next ? 'border-transparent bg-white/4 text-bone-faint/30' : wrong === n ? 'border-danger bg-danger/20 text-danger' : 'border-line bg-ink-1 text-bone')}>
              {n}
            </button>
          </li>
        ))}
      </ul>
      {done && (
        <Result title={record ? 'A new record' : 'All found'} detail={`${time.toFixed(1)} seconds`}>
          <Button size="sm" onClick={again}>
            <RotateCcw size={14} aria-hidden="true" /> Play again
          </Button>
        </Result>
      )}
    </div>
  );
}

// ---- Lật hình: find the pairs -----------------------------------------------------------------------------------------

const FACES = [
  { id: 'star', icon: Star, hue: 48 },
  { id: 'heart', icon: Heart, hue: 350 },
  { id: 'moon', icon: Moon, hue: 250 },
  { id: 'sun', icon: Sun, hue: 28 },
  { id: 'leaf', icon: Leaf, hue: 140 },
  { id: 'flame', icon: Flame, hue: 12 },
  { id: 'fish', icon: Fish, hue: 195 },
  { id: 'bird', icon: Bird, hue: 290 },
];
const deal = () => shuffle(FACES.flatMap((f) => [{ ...f, key: `${f.id}-a` }, { ...f, key: `${f.id}-b` }]));

export function Memory() {
  const [cards, setCards] = useState(deal);
  const [open, setOpen] = useState([]); // keys turned up and not yet matched
  const [matched, setMatched] = useState(new Set());
  const [moves, setMoves] = useState(0);
  const [best, report] = useBest('memory', true);
  const [record, setRecord] = useState(false);
  const locked = useRef(false);
  const done = matched.size === FACES.length;

  const flip = (card) => {
    if (locked.current || open.includes(card.key) || matched.has(card.id)) return;
    const turned = [...open, card.key];
    setOpen(turned);
    if (turned.length < 2) return;
    setMoves((m) => m + 1);
    const [a, b] = turned.map((key) => cards.find((c) => c.key === key));
    if (a.id === b.id) {
      const all = new Set(matched).add(a.id);
      setMatched(all);
      setOpen([]);
      if (all.size === FACES.length) setRecord(report(moves + 1));
    } else {
      locked.current = true;
      window.setTimeout(() => {
        setOpen([]);
        locked.current = false;
      }, 750);
    }
  };
  const again = () => {
    setCards(deal());
    setOpen([]);
    setMatched(new Set());
    setMoves(0);
    setRecord(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Stat label="Moves" value={moves} />
        <Stat label="Pairs" value={`${matched.size}/${FACES.length}`} tone="text-signal" />
        <Stat label="Best" value={best ?? '-'} />
      </div>
      <ul className="grid grid-cols-4 gap-2.5" aria-label="Cards">
        {cards.map((card) => {
          const up = open.includes(card.key) || matched.has(card.id);
          const Icon = card.icon;
          return (
            <li key={card.key}>
              <button type="button" onClick={() => flip(card)} aria-label={up ? card.id : 'Hidden card'} className={clsx('grid aspect-[3/4] w-full place-items-center rounded-2xl border transition-all duration-300 active:scale-95', up ? 'border-transparent' : 'border-line bg-ink-2')} style={up ? { background: `linear-gradient(150deg, hsl(${card.hue} 70% 46%), hsl(${(card.hue + 40) % 360} 62% 28%))` } : undefined}>
                {up ? <Icon size={30} className="text-white" aria-hidden="true" /> : <span className="font-display text-[1.6rem] text-bone-faint/40">?</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {done && (
        <Result title={record ? 'A new record' : 'All pairs found'} detail={`${moves} moves`}>
          <Button size="sm" onClick={again}>
            <RotateCcw size={14} aria-hidden="true" /> Play again
          </Button>
        </Result>
      )}
    </div>
  );
}

// ---- Kéo búa bao: best of any number of rounds against the computer ---------------------------------------------------

const HAND = { keo: { icon: Scissors, label: 'Kéo' }, bua: { icon: Hammer, label: 'Búa' }, bao: { icon: Hand, label: 'Bao' } };

export function Rps() {
  const [round, setRound] = useState(null); // { mine, theirs, result }
  const [score, setScore] = useState({ win: 0, lose: 0, draw: 0 });
  const [streak, setStreak] = useState(0);
  const [best, report] = useBest('rps');

  const play = (mine) => {
    const theirs = HANDS[Math.floor(Math.random() * HANDS.length)];
    const result = duel(mine, theirs);
    setRound({ mine, theirs, result });
    setScore((s) => ({ ...s, [result === 1 ? 'win' : result === -1 ? 'lose' : 'draw']: s[result === 1 ? 'win' : result === -1 ? 'lose' : 'draw'] + 1 }));
    if (result === 1) {
      setStreak((n) => n + 1);
      report(streak + 1);
    } else if (result === -1) setStreak(0);
  };

  const Face = ({ hand, label, tone }) => {
    const Icon = hand ? HAND[hand].icon : Hand;
    return (
      <div className="flex flex-1 flex-col items-center gap-2">
        <span className={clsx('grid size-24 place-items-center rounded-full border bg-ink-1', tone)}>
          <Icon size={40} aria-hidden="true" />
        </span>
        <small className="font-mono text-[0.66rem] tracking-[0.14em] text-bone-faint uppercase">{label}</small>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-2">
        <Stat label="Won" value={score.win} tone="text-ok" />
        <Stat label="Lost" value={score.lose} tone="text-danger" />
        <Stat label="Streak" value={streak} tone="text-signal" />
        <Stat label="Best" value={best ?? '-'} />
      </div>
      <div className="flex items-center gap-3 rounded-3xl border border-line bg-ink-1 p-5">
        <Face hand={round?.mine} label="You" tone={round?.result === 1 ? 'border-ok text-ok' : 'border-line text-bone'} />
        <b className="font-display text-[1.4rem] font-normal text-bone-faint">vs</b>
        <Face hand={round?.theirs} label="Computer" tone={round?.result === -1 ? 'border-danger text-danger' : 'border-line text-bone'} />
      </div>
      <p className="h-6 text-center font-display text-[1.3rem] text-bone" role="status">
        {round ? (round.result === 1 ? 'You win' : round.result === -1 ? 'You lose' : 'A draw') : 'Pick a hand'}
      </p>
      <div className="grid grid-cols-3 gap-3">
        {HANDS.map((hand) => {
          const Icon = HAND[hand].icon;
          return (
            <button key={hand} type="button" onClick={() => play(hand)} className="flex flex-col items-center gap-2 rounded-3xl border border-line bg-ink-2 py-5 font-display text-[1.1rem] text-bone transition-transform active:scale-90">
              <Icon size={28} aria-hidden="true" /> {HAND[hand].label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---- Bầu cua tôm cá: the folk dice game, with pretend coins -------------------------------------------------------------

const SYMBOL = {
  bau: { name: 'Bầu', hue: 135 },
  cua: { name: 'Cua', hue: 12 },
  tom: { name: 'Tôm', hue: 28 },
  ca: { name: 'Cá', hue: 200 },
  ga: { name: 'Gà', hue: 48 },
  nai: { name: 'Nai', hue: 30 },
};
const CHIPS = [5, 10, 20];

export function BauCua() {
  const [coins, setCoins] = useState(100);
  const [chip, setChip] = useState(10);
  const [bets, setBets] = useState({});
  const [dice, setDice] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [net, setNet] = useState(null);
  const [best, report] = useBest('baucua');
  const staked = Object.values(bets).reduce((a, b) => a + b, 0);

  const bet = (symbol) => {
    if (rolling || chip > coins - staked) return;
    setNet(null);
    setBets((b) => ({ ...b, [symbol]: (b[symbol] ?? 0) + chip }));
  };
  const clear = () => !rolling && setBets({});
  const roll = () => {
    if (rolling || !staked) return;
    setRolling(true);
    setNet(null);
    let spins = 0;
    const shake = window.setInterval(() => {
      setDice(rollDice());
      spins += 1;
      if (spins < 9) return;
      window.clearInterval(shake);
      const final = rollDice();
      const delta = settle(bets, final);
      setDice(final);
      setNet(delta);
      setCoins((c) => {
        const total = c + delta;
        report(total);
        return total;
      });
      setBets({});
      setRolling(false);
    }, 90);
  };
  const restart = () => {
    setCoins(100);
    setBets({});
    setDice(null);
    setNet(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Stat label="Coins" value={coins} tone="text-signal" />
        <Stat label="Staked" value={staked} />
        <Stat label="Best" value={best ?? '-'} />
      </div>
      <div className="flex items-center justify-center gap-3 rounded-3xl border border-line bg-ink-1 p-4" aria-label="Dice" role="img">
        {(dice ?? ['?', '?', '?']).map((d, i) => (
          <span key={i} className={clsx('grid size-20 place-items-center rounded-2xl border border-white/15 font-display text-[1.4rem] text-white', rolling && 'animate-pulse')} style={{ background: d === '?' ? 'var(--color-ink-3)' : `linear-gradient(150deg, hsl(${SYMBOL[d].hue} 70% 46%), hsl(${(SYMBOL[d].hue + 40) % 360} 62% 28%))` }}>
            {d === '?' ? '?' : SYMBOL[d].name}
          </span>
        ))}
      </div>
      <p className="h-6 text-center font-display text-[1.2rem]" role="status">
        {net === null ? 'Place your bets' : net > 0 ? <span className="text-ok">+{net} coins</span> : net < 0 ? <span className="text-danger">{net} coins</span> : <span className="text-bone-dim">Even</span>}
      </p>
      <ul className="grid grid-cols-3 gap-2.5" aria-label="Symbols">
        {BAU_CUA.map((symbol) => (
          <li key={symbol}>
            <button type="button" onClick={() => bet(symbol)} className="relative grid aspect-square w-full place-items-center rounded-2xl border border-white/10 font-display text-[1.5rem] text-white transition-transform active:scale-90" style={{ background: `linear-gradient(150deg, hsl(${SYMBOL[symbol].hue} 65% 42%), hsl(${(SYMBOL[symbol].hue + 40) % 360} 60% 24%))` }}>
              {SYMBOL[symbol].name}
              {bets[symbol] ? <span className="absolute top-1.5 right-1.5 grid min-w-7 place-items-center rounded-full bg-bone px-1.5 font-mono text-[0.7rem] font-medium text-ink-0">{bets[symbol]}</span> : null}
            </button>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <div className="flex gap-1.5" role="radiogroup" aria-label="Chip">
          {CHIPS.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={chip === c} onClick={() => setChip(c)} className={clsx('grid size-11 place-items-center rounded-full border font-mono text-[0.78rem]', chip === c ? 'border-signal bg-signal-soft text-signal' : 'border-line text-bone-dim')}>
              {c}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={clear} disabled={!staked || rolling} className="ml-auto">
          Clear
        </Button>
        {coins <= 0 && !staked ? (
          <Button size="sm" onClick={restart}>
            New game
          </Button>
        ) : (
          <Button size="sm" onClick={roll} disabled={!staked || rolling}>
            Shake
          </Button>
        )}
      </div>
    </div>
  );
}
