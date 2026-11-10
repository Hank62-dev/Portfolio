import { tr } from '../../core/i18n/lang';
import { useEffect, useReducer, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RotateCcw, Shuffle, Wifi } from 'lucide-react';
import { FLEET, SIZE, afloat, aiPick, blankShots, randomFleet, shoot } from './battleship';
import { Board } from './BattleBoard';
import OnlineBattle from './OnlineBattle';
import { hasBattleSession } from './online';
import { Captain, INK, InkButton, Note, RED } from './ink';
import { useBest } from './shared';

// Bắn tàu giấy: the paper-and-pen sea battle for two. Two ten by ten boards, a fleet of ten paper boats each, and you take
// turns to name a square. A hit lets you shoot again. Play against the captain in the notebook, or pass the phone around.

const PLAYERS = {
  ai: ['Bạn', tr('Thuyền trưởng Sóng')],
  duo: [tr('Người 1'), tr('Người 2')],
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

// ---- the game -------------------------------------------------------------------------------------------------------------

const WORDS = {
  hit: tr('Trúng rồi! Bắn tiếp nào.'),
  sunk: tr('Chìm một chiếc! Bắn tiếp nào.'),
  miss: tr('Trượt… đổi lượt.'),
};

export default function SeaBattle() {
  const [game, dispatch] = useReducer(reducer, null);
  // a friend's invite link carries the room (?room=ABCD) and lands straight in the online game
  const [params, setParams] = useSearchParams();
  const invited = params.get('room') ?? '';
  const [online, setOnline] = useState(() => Boolean(invited) || hasBattleSession());
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

  if (online) {
    const exit = () => {
      setOnline(false);
      if (invited) {
        setParams((previous) => {
          const next = new URLSearchParams(previous);
          next.delete('room');
          return next;
        });
      }
    };
    return <OnlineBattle initialCode={invited} onExit={exit} />;
  }

  if (!game) {
    return (
      <div className="flex flex-col gap-5">
        <p className="font-hand text-[1.1rem] leading-snug">
          {tr('The game kids play in the back row: hide ten paper boats on your page, then guess where the other fleet is. A hit means shoot again. Boats may not touch.')}
        </p>
        <div className="flex items-center gap-3">
          <Captain kind="captain" />
          <span className="font-pen text-[1.6rem] font-bold" style={{ color: RED }}>{tr('vs')}</span>
          <Captain kind="sailor" tone={RED} />
        </div>
        <InkButton onClick={() => dispatch({ type: 'start', mode: 'ai' })}>{tr('Chơi với thuyền trưởng Sóng')}</InkButton>
        <InkButton tone={RED} onClick={() => dispatch({ type: 'start', mode: 'duo' })}>
          {tr('2 người, đưa máy qua lại')}
        </InkButton>
        <InkButton solid onClick={() => setOnline(true)}>
          <Wifi size={17} aria-hidden="true" /> {tr('Chơi online với bạn')}
        </InkButton>
        <p className="font-hand text-[0.9rem] text-[#20296a]/65">{tr('Games won against the captain:')} {wins ?? 0}</p>
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
          {tr('Đưa máy cho')} {game.players[game.cover.to].name}
        </p>
        <p className="max-w-[16rem] font-hand text-[1.05rem]">{game.cover.then === 'place' ? tr('Đến lúc xếp tàu của bạn. Người kia đừng nhìn nhé.') : tr('Đến lượt bạn bắn. Người kia đừng nhìn màn hình.')}</p>
        <InkButton onClick={() => dispatch({ type: 'uncover' })}>{tr('Tôi là')} {game.players[game.cover.to].name}</InkButton>
      </div>
    );
  }

  if (game.phase === 'place') {
    return (
      <div className="flex flex-col gap-4">
        <p className="font-hand text-[1.1rem]">
          {you.name}{tr(', đây là hạm đội của bạn. Không vừa ý thì xếp lại.')}
        </p>
        <Board fleet={you.fleet} shots={blankShots()} reveal label={tr('Your fleet')} />
        <div className="flex gap-2">
          <InkButton className="flex-1" onClick={() => dispatch({ type: 'reroll' })}>
            <Shuffle size={16} aria-hidden="true" /> {tr('Xếp lại')}
          </InkButton>
          <InkButton className="flex-1" solid onClick={() => dispatch({ type: 'ready' })}>
            {tr('Xong, ra khơi')}
          </InkButton>
        </div>
        <p className="font-hand text-[0.9rem] text-[#20296a]/65">{FLEET.length} {tr('boats: 1 of four squares, 2 of three, 3 of two, 4 of one.')}</p>
      </div>
    );
  }

  const status =
    game.phase === 'over'
      ? ''
      : game.mode === 'ai' && game.who === 1
        ? tr('Thuyền trưởng Sóng đang ngắm…')
        : game.last && WORDS[game.last]
          ? WORDS[game.last]
          : tr('{0}: chạm một ô để bắn.', you.name);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Captain kind="captain" size={38} />
          <span className="font-pen text-[1.2rem] leading-none font-bold">
            {game.players[0].name}
            <small className="block font-hand text-[0.8rem] font-normal text-[#20296a]/70">{tr('chìm')} {sunk(game.players[1])}/10</small>
          </span>
        </div>
        <div className="flex flex-row-reverse items-center gap-2">
          <Captain kind="sailor" tone={RED} size={38} />
          <span className="text-right font-pen text-[1.2rem] leading-none font-bold" style={{ color: RED }}>
            {game.players[1].name}
            <small className="block font-hand text-[0.8rem] font-normal text-[#20296a]/70">{tr('chìm')} {sunk(game.players[0])}/10</small>
          </span>
        </div>
      </div>

      <p className="min-h-6 font-pen text-[1.35rem] leading-none font-semibold" style={{ color: game.last === 'miss' ? RED : INK }} role="status" aria-live="polite">
        {status}
      </p>

      <div className="relative">
        <Board fleet={foe.fleet} shots={foe.shots} label={tr('{0}\'s waters', foe.name)} onShoot={humanTurn ? (cell) => dispatch({ type: 'fire', cell }) : undefined} />
        {!humanTurn && game.phase === 'play' && <div className="absolute inset-0 rounded-md bg-[#f8f3e5]/25" aria-hidden="true" />}
      </div>

      <div>
        <p className="font-pen text-[1.1rem] font-semibold">{tr('Hạm đội của')} {you.name}</p>
        <div className="w-[58%]">
          <Board fleet={you.fleet} shots={you.shots} reveal label={tr('Your fleet')} />
        </div>
      </div>

      {game.phase === 'over' && (
        <Note title={game.mode === 'ai' ? (game.winner === 0 ? tr('Bạn thắng rồi!') : tr('Thuyền trưởng Sóng thắng')) : tr('{0} thắng!', game.players[game.winner].name)} detail={tr('Chìm hết hạm đội đối phương.')}>
          <InkButton onClick={() => dispatch({ type: 'start', mode: game.mode })}>
            <RotateCcw size={15} aria-hidden="true" /> {tr('Ván mới')}
          </InkButton>
        </Note>
      )}
    </div>
  );
}
