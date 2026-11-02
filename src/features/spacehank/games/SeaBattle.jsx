import { useEffect, useReducer, useRef } from 'react';
import { RotateCcw, Shuffle } from 'lucide-react';
import { FLEET, SIZE, afloat, aiPick, blankShots, randomFleet, shoot } from './battleship';
import { Captain, INK, InkButton, Note, RED } from './ink';
import { useBest } from './shared';

// Bắn tàu giấy: the paper-and-pen sea battle for two. Two ten by ten boards, a fleet of ten paper boats each, and you take
// turns to name a square. A hit lets you shoot again. Play against the captain in the notebook, or pass the phone around.

const C = 30; // a square, in the board's own drawing units
const LETTERS = 'ABCDEFGHIJ';
const PLAYERS = {
  ai: ['Bạn', 'Thuyền trưởng Sóng'],
  duo: ['Người 1', 'Người 2'],
};

const fresh = (mode) => ({
  mode,
  phase: 'place', // place | cover | play | over
  who: 0, // who is placing, or whose turn it is
  cover: null, // while the phone changes hands: { to, then }
  players: PLAYERS[mode].map((name) => ({ name, fleet: randomFleet(), shots: blankShots() })),
  last: '',
  winner: null,
});

const reducer = (state, action) => {
  switch (action.type) {
    case 'start':
      return fresh(action.mode);
    case 'reroll':
      return { ...state, players: state.players.map((p, i) => (i === state.who ? { ...p, fleet: randomFleet() } : p)) };
    case 'ready':
      if (state.mode === 'duo' && state.who === 0) return { ...state, phase: 'cover', cover: { to: 1, then: 'place' } };
      return { ...state, phase: state.mode === 'duo' ? 'cover' : 'play', cover: state.mode === 'duo' ? { to: 0, then: 'play' } : null, who: 0 };
    case 'uncover':
      return { ...state, phase: state.cover.then, who: state.cover.to, cover: null };
    case 'fire': {
      const target = 1 - state.who;
      const result = shoot(state.players[target].fleet, state.players[target].shots, action.cell);
      if (result.outcome === 'repeat') return state;
      const players = state.players.map((p, i) => (i === target ? { ...p, shots: result.shots } : p));
      if (result.done) return { ...state, players, phase: 'over', winner: state.who, last: 'sunk' };
      if (result.outcome === 'miss') {
        const to = target;
        return state.mode === 'duo' ? { ...state, players, phase: 'cover', cover: { to, then: 'play' }, last: 'miss' } : { ...state, players, who: to, last: 'miss' };
      }
      return { ...state, players, last: result.outcome };
    }
    default:
      return state;
  }
};

// ---- a board, drawn in pen -----------------------------------------------------------------------------------------------

/** A paper boat seen from above, drawn along its squares. `tone` is the colour of the pen it is drawn with. */
function Boat({ ship, tone }) {
  const [first, last] = [ship.cells[0], ship.cells[ship.cells.length - 1]];
  const r0 = Math.floor(first / SIZE);
  const c0 = first % SIZE;
  const r1 = Math.floor(last / SIZE);
  const c1 = last % SIZE;
  const cx = ((c0 + c1 + 1) / 2 + 1) * C;
  const cy = ((r0 + r1 + 1) / 2 + 1) * C;
  const w = ship.size * C - 8;
  const h = C - 10;
  const vertical = ship.cells.length > 1 && c0 === c1;
  const bow = Math.min(h / 2 + 2, w / 2);
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${vertical ? 90 : 0})`} stroke={tone} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
      <path d={`M ${-w / 2} ${-h / 2} L ${w / 2 - bow} ${-h / 2} Q ${w / 2} 0 ${w / 2 - bow} ${h / 2} L ${-w / 2} ${h / 2} Z`} fill="#fdfaf0" />
      <path d={`M ${-w / 2 + 3} ${-h / 2 + 3.5} L ${w / 2 - bow - 2} ${-h / 2 + 3.5} M ${-w / 2 + 3} ${h / 2 - 3.5} L ${w / 2 - bow - 2} ${h / 2 - 3.5}`} strokeWidth="1" opacity="0.55" />
      {ship.size > 1 && <rect x={-w / 2 + 6} y={-h / 4} width={Math.min(14, w / 3)} height={h / 2} rx="2" fill="none" strokeWidth="1.4" />}
      {ship.size > 2 && <path d={`M ${w / 6} 0 L ${w / 6 + 8} 0`} strokeWidth="1.4" />}
      {ship.size === 1 && <circle r="3" fill="none" strokeWidth="1.4" />}
    </g>
  );
}

/** A splash of ink where a boat was hit: a scribbled blot with a cross over it. */
const Blot = ({ cx, cy, seed }) => (
  <g transform={`translate(${cx} ${cy})`} filter="url(#pen)">
    {[0, 1, 2, 3].map((k) => {
      const a = (seed * 7 + k * 2.1) % 6.28;
      return <circle key={k} cx={Math.cos(a) * 3.2} cy={Math.sin(a) * 3.2} r={5.5 - k} fill={INK} opacity="0.42" />;
    })}
    <path d="M-6.5 -6.5L6.5 6.5M6.5 -6.5L-6.5 6.5" stroke={INK} strokeWidth="2" strokeLinecap="round" />
  </g>
);

/**
 * One ten by ten board. `reveal` shows the boats (your own fleet); otherwise only boats that have sunk show, in red.
 * `onShoot` makes the squares tappable.
 */
function Board({ fleet, shots, reveal = false, onShoot, label }) {
  const side = (SIZE + 1) * C;
  return (
    <svg viewBox={`0 0 ${side} ${side}`} className="block w-full" role="group" aria-label={label}>
      <defs>
        <pattern id="hatch-bs" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke={INK} strokeWidth="1" opacity="0.4" />
        </pattern>
      </defs>
      {[...LETTERS].map((l, r) => (
        <text key={l} x={C * 0.5} y={(r + 1.5) * C + 6} textAnchor="middle" className="font-pen" fontSize="19" fontWeight="700" fill={INK}>
          {l}
        </text>
      ))}
      {Array.from({ length: SIZE }, (_, c) => (
        <text key={c} x={(c + 1.5) * C} y={C * 0.72} textAnchor="middle" className="font-pen" fontSize="19" fontWeight="700" fill={INK}>
          {c + 1}
        </text>
      ))}
      <rect x={C} y={C} width={SIZE * C} height={SIZE * C} fill="#fdfaf0" />
      {Array.from({ length: SIZE * SIZE }, (_, i) => {
        const r = Math.floor(i / SIZE);
        const c = i % SIZE;
        return (r + c) % 2 === 0 ? <rect key={i} x={(c + 1) * C} y={(r + 1) * C} width={C} height={C} fill="url(#hatch-bs)" /> : null;
      })}
      <g filter="url(#pen)" fill="none" stroke={INK} strokeLinecap="round">
        <rect x={C} y={C} width={SIZE * C} height={SIZE * C} strokeWidth="2.4" />
        <rect x={C - 1.5} y={C + 1} width={SIZE * C + 2} height={SIZE * C - 1} strokeWidth="1" opacity="0.5" />
      </g>
      <g filter="url(#pen)">
        {fleet.map((ship) => {
          const sunk = ship.cells.every((cell) => shots[cell] === 3);
          if (!reveal && !sunk) return null;
          return <Boat key={ship.id} ship={ship} tone={sunk ? RED : INK} />;
        })}
      </g>
      {shots.map((s, i) => {
        const cx = ((i % SIZE) + 1.5) * C;
        const cy = (Math.floor(i / SIZE) + 1.5) * C;
        if (s === 1) return <circle key={i} cx={cx} cy={cy} r="2.6" fill={INK} opacity="0.75" />;
        if (s >= 2) return <Blot key={i} cx={cx} cy={cy} seed={i} />;
        return null;
      })}
      {onShoot &&
        shots.map((s, i) =>
          s === 0 ? (
            <rect key={i} x={((i % SIZE) + 1) * C} y={(Math.floor(i / SIZE) + 1) * C} width={C} height={C} fill="transparent" className="cursor-pointer" role="button" aria-label={`${LETTERS[Math.floor(i / SIZE)]}${(i % SIZE) + 1}`} tabIndex={0} onClick={() => onShoot(i)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onShoot(i)} />
          ) : null
        )}
    </svg>
  );
}

// ---- the game -------------------------------------------------------------------------------------------------------------

const WORDS = {
  hit: 'Trúng rồi! Bắn tiếp nào.',
  sunk: 'Chìm một chiếc! Bắn tiếp nào.',
  miss: 'Trượt… đổi lượt.',
};

export default function SeaBattle() {
  const [game, dispatch] = useReducer(reducer, null);
  const [wins, reportWin] = useBest('battleship');
  const reported = useRef(false);

  // the computer's turn: a moment of thought, a shot, and another if it hits
  useEffect(() => {
    if (!game || game.mode !== 'ai' || game.phase !== 'play' || game.who !== 1) return undefined;
    const timer = window.setTimeout(() => {
      const mine = game.players[0];
      dispatch({ type: 'fire', cell: aiPick(mine.shots, afloat(mine.fleet, mine.shots)) });
    }, 750);
    return () => window.clearTimeout(timer);
  }, [game]);

  useEffect(() => {
    if (game?.phase === 'over' && game.mode === 'ai' && game.winner === 0 && !reported.current) {
      reported.current = true;
      reportWin((wins ?? 0) + 1);
    }
    if (game?.phase !== 'over') reported.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- count a win once per game
  }, [game?.phase]);

  if (!game) {
    return (
      <div className="flex flex-col gap-5">
        <p className="font-hand text-[1.1rem] leading-snug">
          The game kids play in the back row: hide ten paper boats on your page, then guess where the other fleet is. A hit means shoot again. Boats may not touch.
        </p>
        <div className="flex items-center gap-3">
          <Captain kind="captain" />
          <span className="font-pen text-[1.6rem] font-bold" style={{ color: RED }}>vs</span>
          <Captain kind="sailor" tone={RED} />
        </div>
        <InkButton onClick={() => dispatch({ type: 'start', mode: 'ai' })}>Chơi với thuyền trưởng Sóng</InkButton>
        <InkButton tone={RED} onClick={() => dispatch({ type: 'start', mode: 'duo' })}>
          2 người, đưa máy qua lại
        </InkButton>
        <p className="font-hand text-[0.9rem] text-[#20296a]/65">Games won against the captain: {wins ?? 0}</p>
      </div>
    );
  }

  const me = game.who;
  const you = game.players[me];
  const foe = game.players[1 - me];
  const sunk = (p) => p.fleet.filter((s) => s.cells.every((cell) => p.shots[cell] === 3)).length;
  const humanTurn = game.phase === 'play' && (game.mode === 'duo' || game.who === 0);

  if (game.phase === 'cover') {
    return (
      <div className="flex flex-col items-center gap-5 py-10 text-center">
        <Captain kind={game.cover.to === 0 ? 'captain' : 'sailor'} tone={game.cover.to === 0 ? INK : RED} size={72} />
        <p className="font-pen text-[2rem] leading-none font-bold" style={{ color: INK }}>
          Đưa máy cho {game.players[game.cover.to].name}
        </p>
        <p className="max-w-[16rem] font-hand text-[1.05rem]">{game.cover.then === 'place' ? 'Đến lúc xếp tàu của bạn. Người kia đừng nhìn nhé.' : 'Đến lượt bạn bắn. Người kia đừng nhìn màn hình.'}</p>
        <InkButton onClick={() => dispatch({ type: 'uncover' })}>Tôi là {game.players[game.cover.to].name}</InkButton>
      </div>
    );
  }

  if (game.phase === 'place') {
    return (
      <div className="flex flex-col gap-4">
        <p className="font-hand text-[1.1rem]">
          {you.name}, đây là hạm đội của bạn. Không vừa ý thì xếp lại.
        </p>
        <Board fleet={you.fleet} shots={blankShots()} reveal label="Your fleet" />
        <div className="flex gap-2">
          <InkButton className="flex-1" onClick={() => dispatch({ type: 'reroll' })}>
            <Shuffle size={16} aria-hidden="true" /> Xếp lại
          </InkButton>
          <InkButton className="flex-1" solid onClick={() => dispatch({ type: 'ready' })}>
            Xong, ra khơi
          </InkButton>
        </div>
        <p className="font-hand text-[0.9rem] text-[#20296a]/65">{FLEET.length} boats: 1 of four squares, 2 of three, 3 of two, 4 of one.</p>
      </div>
    );
  }

  const status =
    game.phase === 'over'
      ? ''
      : game.mode === 'ai' && game.who === 1
        ? 'Thuyền trưởng Sóng đang ngắm…'
        : game.last && WORDS[game.last]
          ? WORDS[game.last]
          : `${you.name}: chạm một ô để bắn.`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Captain kind="captain" size={38} />
          <span className="font-pen text-[1.2rem] leading-none font-bold">
            {game.players[0].name}
            <small className="block font-hand text-[0.8rem] font-normal text-[#20296a]/70">chìm {sunk(game.players[1])}/10</small>
          </span>
        </div>
        <div className="flex flex-row-reverse items-center gap-2">
          <Captain kind="sailor" tone={RED} size={38} />
          <span className="text-right font-pen text-[1.2rem] leading-none font-bold" style={{ color: RED }}>
            {game.players[1].name}
            <small className="block font-hand text-[0.8rem] font-normal text-[#20296a]/70">chìm {sunk(game.players[0])}/10</small>
          </span>
        </div>
      </div>

      <p className="min-h-6 font-pen text-[1.35rem] leading-none font-semibold" style={{ color: game.last === 'miss' ? RED : INK }} role="status" aria-live="polite">
        {status}
      </p>

      <div className="relative">
        <Board fleet={foe.fleet} shots={foe.shots} label={`${foe.name}'s waters`} onShoot={humanTurn ? (cell) => dispatch({ type: 'fire', cell }) : undefined} />
        {!humanTurn && game.phase === 'play' && <div className="absolute inset-0 rounded-md bg-[#f8f3e5]/25" aria-hidden="true" />}
      </div>

      <div>
        <p className="font-pen text-[1.1rem] font-semibold">Hạm đội của {you.name}</p>
        <div className="w-[58%]">
          <Board fleet={you.fleet} shots={you.shots} reveal label="Your fleet" />
        </div>
      </div>

      {game.phase === 'over' && (
        <Note title={game.mode === 'ai' ? (game.winner === 0 ? 'Bạn thắng rồi!' : 'Thuyền trưởng Sóng thắng') : `${game.players[game.winner].name} thắng!`} detail="Chìm hết hạm đội đối phương.">
          <InkButton onClick={() => dispatch({ type: 'start', mode: game.mode })}>
            <RotateCcw size={15} aria-hidden="true" /> Ván mới
          </InkButton>
        </Note>
      )}
    </div>
  );
}
