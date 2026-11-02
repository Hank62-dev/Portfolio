import { useEffect, useRef, useState } from 'react';
import { Bird, Fish, Flame, Hammer, Hand, Heart, Leaf, Moon, RotateCcw, Scissors, Star, Sun } from 'lucide-react';
import { clsx } from '../../../lib/format';
import { BAU_CUA, HANDS, duel, rollDice, settle, shuffle } from './logic';
import { Doodle, INK, InkBox, InkButton, Note, RED, Score } from './ink';
import { useBest } from './shared';

const PEN = { filter: 'url(#pen)' };

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
      window.setTimeout(() => setWrong(0), 260);
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
        <Score label="tìm số" value={done ? '-' : next} tone={RED} />
        <Score label="giây" value={time.toFixed(1)} />
        <Score label="kỷ lục" value={best === null ? '-' : best} />
      </div>
      <ul className="grid grid-cols-5 gap-2" aria-label="Numbers">
        {grid.map((n) => {
          const found = n < next;
          return (
            <li key={n}>
              <InkBox as="button" type="button" onClick={() => tap(n)} disabled={found} tone={wrong === n ? RED : INK} className={clsx('block aspect-square w-full transition-transform active:scale-90', wrong === n && 'animate-[shake_0.25s]')} fill={wrong === n ? 'rgb(207 59 51 / 0.12)' : undefined}>
                <span className={clsx('grid aspect-square w-full place-items-center font-pen text-[2rem] leading-none font-bold', found && 'opacity-35')} style={{ color: INK }}>
                  {n}
                </span>
                {found && (
                  <svg viewBox="0 0 40 40" className="absolute inset-0 size-full" aria-hidden="true">
                    <path d="M6 30C14 22 24 14 35 8" stroke={RED} strokeWidth="2.4" strokeLinecap="round" fill="none" filter="url(#pen)" />
                  </svg>
                )}
              </InkBox>
            </li>
          );
        })}
      </ul>
      {done && (
        <Note title={record ? 'Kỷ lục mới!' : 'Tìm đủ rồi!'} detail={`${time.toFixed(1)} giây`}>
          <InkButton onClick={again}>
            <RotateCcw size={15} aria-hidden="true" /> Chơi lại
          </InkButton>
        </Note>
      )}
    </div>
  );
}

// ---- Lật hình: find the pairs -----------------------------------------------------------------------------------------

const FACES = [
  { id: 'star', icon: Star },
  { id: 'heart', icon: Heart },
  { id: 'moon', icon: Moon },
  { id: 'sun', icon: Sun },
  { id: 'leaf', icon: Leaf },
  { id: 'flame', icon: Flame },
  { id: 'fish', icon: Fish },
  { id: 'bird', icon: Bird },
];
const deal = () => shuffle(FACES.flatMap((f, i) => [{ ...f, key: `${f.id}-a`, pen: i % 2 ? RED : INK }, { ...f, key: `${f.id}-b`, pen: i % 2 ? RED : INK }]));

export function Memory() {
  const [cards, setCards] = useState(deal);
  const [open, setOpen] = useState([]);
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
        <Score label="lượt" value={moves} />
        <Score label="cặp" value={`${matched.size}/${FACES.length}`} tone={RED} />
        <Score label="kỷ lục" value={best ?? '-'} />
      </div>
      <ul className="grid grid-cols-4 gap-2.5" aria-label="Cards">
        {cards.map((card, i) => {
          const up = open.includes(card.key) || matched.has(card.id);
          const Icon = card.icon;
          return (
            <li key={card.key} style={{ transform: `rotate(${((i * 37) % 5) - 2}deg)`, perspective: '700px' }}>
              {/* a button will not keep a ratio by itself, so a frame holds the shape and the button fills it */}
              <div className={clsx('relative aspect-[3/4] w-full', matched.has(card.id) && 'animate-[pop_0.45s_ease-out]')}>
              <button type="button" onClick={() => flip(card)} aria-label={up ? card.id : 'Hidden card'} aria-pressed={up} className="absolute inset-0 block active:scale-95">
                <span className="absolute inset-0 transition-transform duration-[550ms] ease-[cubic-bezier(0.4,0.1,0.2,1)] [transform-style:preserve-3d]" style={{ transform: up ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
                  <InkBox className="absolute inset-0 [-webkit-backface-visibility:hidden] [backface-visibility:hidden]" innerClassName="grid h-full place-items-center hatch rounded-md">
                    <span className="font-pen text-[2rem] font-bold" style={{ color: INK }}>?</span>
                  </InkBox>
                  <InkBox className="absolute inset-0 [-webkit-backface-visibility:hidden] [backface-visibility:hidden]" innerClassName="grid h-full place-items-center" tone={card.pen} fill="#fffdf3" style={{ transform: 'rotateY(180deg)' }}>
                    <Icon size={32} strokeWidth={2.2} color={card.pen} style={PEN} aria-hidden="true" />
                  </InkBox>
                </span>
              </button>
              </div>
            </li>
          );
        })}
      </ul>
      {done && (
        <Note title={record ? 'Kỷ lục mới!' : 'Lật hết rồi!'} detail={`${moves} lượt`}>
          <InkButton onClick={again}>
            <RotateCcw size={15} aria-hidden="true" /> Chơi lại
          </InkButton>
        </Note>
      )}
    </div>
  );
}

// ---- Kéo búa bao: best of any number of rounds against the computer ---------------------------------------------------

const HAND = { keo: { icon: Scissors, label: 'Kéo' }, bua: { icon: Hammer, label: 'Búa' }, bao: { icon: Hand, label: 'Bao' } };

export function Rps() {
  const [round, setRound] = useState(null);
  const [score, setScore] = useState({ win: 0, lose: 0 });
  const [streak, setStreak] = useState(0);
  const [best, report] = useBest('rps');

  const play = (mine) => {
    const theirs = HANDS[Math.floor(Math.random() * HANDS.length)];
    const result = duel(mine, theirs);
    setRound({ mine, theirs, result });
    if (result === 1) {
      setScore((s) => ({ ...s, win: s.win + 1 }));
      setStreak((n) => n + 1);
      report(streak + 1);
    } else if (result === -1) {
      setScore((s) => ({ ...s, lose: s.lose + 1 }));
      setStreak(0);
    }
  };

  const Face = ({ hand, label, tone }) => {
    const Icon = hand ? HAND[hand].icon : Hand;
    return (
      <div className="flex flex-1 flex-col items-center gap-1">
        <InkBox className="grid size-24 place-items-center" tone={tone} round={50}>
          <Icon size={42} strokeWidth={2} color={tone} style={PEN} aria-hidden="true" />
        </InkBox>
        <small className="font-hand text-[0.95rem]">{label}</small>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-2">
        <Score label="thắng" value={score.win} />
        <Score label="thua" value={score.lose} tone={RED} />
        <Score label="chuỗi" value={streak} />
        <Score label="kỷ lục" value={best ?? '-'} />
      </div>
      <div className="flex items-center gap-3">
        <Face hand={round?.mine} label="Bạn" tone={round?.result === 1 ? '#1f7a3a' : INK} />
        <b className="font-pen text-[2rem]" style={{ color: RED }}>
          vs
        </b>
        <Face hand={round?.theirs} label="Máy" tone={round?.result === -1 ? RED : INK} />
      </div>
      <p className="h-8 text-center font-pen text-[1.8rem] leading-none font-bold" style={{ color: round?.result === -1 ? RED : INK }} role="status">
        {round ? (round.result === 1 ? 'Bạn thắng!' : round.result === -1 ? 'Bạn thua…' : 'Hòa nhau') : 'Ra tay đi!'}
      </p>
      <div className="grid grid-cols-3 gap-3">
        {HANDS.map((hand) => {
          const Icon = HAND[hand].icon;
          return (
            <InkButton key={hand} onClick={() => play(hand)} className="py-3">
              <span className="flex flex-col items-center gap-1">
                <Icon size={26} strokeWidth={2} style={PEN} aria-hidden="true" />
                {HAND[hand].label}
              </span>
            </InkButton>
          );
        })}
      </div>
    </div>
  );
}

// ---- Bầu cua tôm cá: the folk dice game, with pretend coins -------------------------------------------------------------

const NAME = { bau: 'Bầu', cua: 'Cua', tom: 'Tôm', ca: 'Cá', ga: 'Gà', nai: 'Nai' };
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
        report(c + delta);
        return c + delta;
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
        <Score label="xu" value={coins} tone={RED} />
        <Score label="đã cược" value={staked} />
        <Score label="kỷ lục" value={best ?? '-'} />
      </div>
      <div className="flex items-center justify-center gap-3" role="img" aria-label="Dice">
        {(dice ?? [null, null, null]).map((d, i) => (
          <InkBox key={i} className={clsx('grid size-[4.6rem] place-items-center', rolling && 'animate-[shake_0.18s_infinite]')} tone={RED} fill="#fffdf3">
            {d ? <Doodle name={d} size={44} tone={RED} /> : <span className="font-pen text-[2rem] font-bold" style={{ color: RED }}>?</span>}
          </InkBox>
        ))}
      </div>
      <p className="h-8 text-center font-pen text-[1.7rem] leading-none font-bold" role="status">
        {net === null ? <span style={{ color: INK }}>Đặt cược đi nào</span> : net > 0 ? <span style={{ color: '#1f7a3a' }}>Lời {net} xu!</span> : net < 0 ? <span style={{ color: RED }}>Lỗ {-net} xu…</span> : <span style={{ color: INK }}>Hòa vốn</span>}
      </p>
      <ul className="grid grid-cols-3 gap-2.5" aria-label="Symbols">
        {BAU_CUA.map((symbol) => (
          <li key={symbol}>
            <InkBox as="button" type="button" onClick={() => bet(symbol)} className="block w-full transition-transform active:scale-95" tone={INK}>
              <span className="flex flex-col items-center gap-0.5 py-2.5">
                <Doodle name={symbol} size={50} />
                <b className="font-pen text-[1.35rem] leading-none" style={{ color: INK }}>
                  {NAME[symbol]}
                </b>
              </span>
              {bets[symbol] ? (
                <span className="absolute -top-2 -right-1 grid min-w-8 place-items-center rounded-full border-2 bg-[#fffdf3] px-1.5 font-pen text-[1.05rem] leading-none font-bold" style={{ borderColor: RED, color: RED }}>
                  {bets[symbol]}
                </span>
              ) : null}
            </InkBox>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <div className="flex gap-1.5" role="radiogroup" aria-label="Chip">
          {CHIPS.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={chip === c} onClick={() => setChip(c)} className="grid size-11 place-items-center rounded-full font-pen text-[1.2rem] font-bold" style={{ border: `2.5px solid ${chip === c ? RED : INK}`, color: chip === c ? RED : INK, background: chip === c ? 'rgb(207 59 51 / 0.1)' : 'transparent' }}>
              {c}
            </button>
          ))}
        </div>
        <InkButton className="ml-auto" disabled={!staked || rolling} onClick={() => setBets({})}>
          Xóa
        </InkButton>
        {coins <= 0 && !staked ? (
          <InkButton solid tone={RED} onClick={restart}>
            Ván mới
          </InkButton>
        ) : (
          <InkButton solid tone={RED} disabled={!staked || rolling} onClick={roll}>
            Lắc!
          </InkButton>
        )}
      </div>
    </div>
  );
}
