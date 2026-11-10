import { tr } from '../../core/i18n/lang';
import { useEffect, useRef, useState } from 'react';
import { Copy, LogOut, RotateCcw, Share2, Shuffle } from 'lucide-react';
import { randomFleet } from './battleship';
import { Board } from './BattleBoard';
import { Captain, INK, InkBox, InkButton, Note, RED } from './ink';
import { Loading, Skeleton } from '../../../shared/ui';
import { describeShot, inviteLink, normalizeCode, saveName, savedName, statusOf, useBattle } from './online';
import { useBest } from './shared';

// Bắn tàu online: the paper sea battle against a friend on their own phone. One of you makes a room and sends the link or
// the four-letter code; the other opens it. The server deals the turns and keeps each fleet secret until a boat sinks.

const WAKING = tr('Máy chủ miễn phí đang thức dậy, có thể mất nửa phút. Cứ để màn hình mở nhé.');
const sunkIn = (fleet, shots) => fleet.filter((ship) => ship.cells.every((cell) => shots[cell] === 3)).length;

function Lobby({ battle, initialCode, onExit }) {
  const [name, setName] = useState(savedName);
  const [code, setCode] = useState(normalizeCode(initialCode));
  const busy = battle.link === 'connecting' || battle.link === 'lost';
  const who = name.trim() || 'Khách';
  const start = (action) => {
    saveName(name.trim());
    action();
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="font-hand text-[1.1rem] leading-snug">
        {initialCode ? tr('Bạn được mời vào phòng {0}. Điền tên rồi vào thôi.', normalizeCode(initialCode)) : tr('Mỗi người một điện thoại. Một người tạo phòng, gửi link hoặc mã 4 chữ cho người kia.')}
      </p>
      <label className="flex flex-col gap-1">
        <span className="font-pen text-[1.15rem] font-semibold">{tr('Tên của bạn')}</span>
        <InkBox tone={INK} fill="#fffdf3" className="block">
          <input value={name} onChange={(event) => setName(event.target.value.slice(0, 20))} maxLength={20} placeholder={tr('Khách')} autoComplete="nickname" className="w-full bg-transparent px-3 py-2 font-hand text-[1.15rem] outline-none placeholder:text-[#20296a]/40" />
        </InkBox>
      </label>

      {!initialCode && (
        <InkButton solid disabled={busy} onClick={() => start(() => battle.create(who))}>
          {tr('Tạo phòng mới')}
        </InkButton>
      )}

      <div className="flex items-end gap-2">
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="font-pen text-[1.15rem] font-semibold">{initialCode ? tr('Mã phòng') : tr('Hoặc nhập mã phòng')}</span>
          <InkBox tone={RED} fill="#fffdf3" className="block">
            <input value={code} onChange={(event) => setCode(normalizeCode(event.target.value))} inputMode="text" autoCapitalize="characters" autoComplete="off" maxLength={4} placeholder={tr('ABCD')} aria-label={tr('Room code')} className="w-full bg-transparent px-3 py-2 text-center font-pen text-[1.7rem] font-bold tracking-[0.3em] outline-none placeholder:text-[#cf3b33]/30" style={{ color: RED }} />
          </InkBox>
        </label>
        <InkButton tone={RED} solid={Boolean(initialCode)} disabled={busy || code.length !== 4} onClick={() => start(() => battle.join(code, who))}>
          {tr('Vào phòng')}
        </InkButton>
      </div>

      {busy ? (
        <Loading label={tr('Connecting to the game server')} className="flex min-h-6 items-center">
          <Skeleton className="h-4 w-44 rounded-full bg-[#2c3aa8]/20" />
        </Loading>
      ) : (
        <p className="min-h-6 font-pen text-[1.2rem] leading-tight font-semibold" style={{ color: RED }} role="status" aria-live="polite">
          {battle.error}
        </p>
      )}
      {busy && battle.slow && <p className="font-hand text-[0.95rem] text-[#20296a]/75">{WAKING}</p>}
      <InkButton onClick={onExit}>{tr('Quay lại')}</InkButton>
    </div>
  );
}

function Waiting({ room, onLeave }) {
  const link = inviteLink(room.code);
  const [copied, setCopied] = useState(false);
  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: tr('Bắn tàu giấy'), text: tr('Chơi Bắn tàu giấy với mình nhé! Mã phòng: {0}', room.code), url: link });
        return;
      }
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* the share sheet was closed, or the browser would not copy: the code on the page still works */
    }
  };
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* the code is right there to read out */
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <p className="font-hand text-[1.1rem]">{tr('Đọc mã này cho bạn của bạn, hoặc gửi link:')}</p>
      <InkBox tone={RED} fill="#fff8c9" className="rotate-[-1.5deg]">
        <p className="px-6 py-3 font-pen text-[3.4rem] leading-none font-bold tracking-[0.25em] select-all" style={{ color: RED }} data-room-code>
          {room.code}
        </p>
      </InkBox>
      <div className="flex w-full gap-2">
        <InkButton className="flex-1" solid onClick={share}>
          <Share2 size={16} aria-hidden="true" /> {tr('Gửi link')}
        </InkButton>
        <InkButton className="flex-1" onClick={copyCode} aria-label={tr('Copy the room code')}>
          <Copy size={16} aria-hidden="true" /> {copied ? tr('Đã chép') : tr('Chép mã')}
        </InkButton>
      </div>
      <p className="font-pen text-[1.3rem] font-semibold" role="status">
        {statusOf(room)}
      </p>
      <InkButton tone={RED} onClick={onLeave}>
        <LogOut size={15} aria-hidden="true" /> {tr('Huỷ phòng')}
      </InkButton>
    </div>
  );
}

function Placing({ room, battle }) {
  const [fleet, setFleet] = useState(() => randomFleet());
  const seat = room.seat;
  const sent = room.ready[seat];
  // a rematch starts from a new fleet
  const phase = useRef(room.phase);
  useEffect(() => {
    if (phase.current !== room.phase && room.phase === 'place') setFleet(randomFleet());
    phase.current = room.phase;
  }, [room.phase]);

  return (
    <div className="flex flex-col gap-4">
      <p className="font-hand text-[1.1rem]">{room.names[seat]}{tr(', đây là hạm đội của bạn.')} {sent ? '' : tr('Không vừa ý thì xếp lại.')}</p>
      <Board fleet={fleet} shots={Array(100).fill(0)} reveal label={tr('Your fleet')} />
      <div className="flex gap-2">
        <InkButton className="flex-1" disabled={sent} onClick={() => setFleet(randomFleet())}>
          <Shuffle size={16} aria-hidden="true" /> {tr('Xếp lại')}
        </InkButton>
        <InkButton className="flex-1" solid disabled={sent} onClick={() => battle.ready(fleet)}>
          {tr('Xong, ra khơi')}
        </InkButton>
      </div>
      <p className="min-h-6 font-pen text-[1.25rem] font-semibold" role="status" aria-live="polite">
        {statusOf(room)}
      </p>
      {!room.present[1 - seat] && <p className="font-hand text-[0.95rem]" style={{ color: RED }}>{room.names[1 - seat]} {tr('đang mất kết nối.')}</p>}
    </div>
  );
}

function Fight({ room, battle, onLeave }) {
  const [wins, reportWin] = useBest('battleship-online');
  const counted = useRef(false);
  const { seat, phase } = room;
  const foe = 1 - seat;
  const myTurn = phase === 'play' && room.turn === seat && room.present[foe];
  const over = phase === 'over';

  useEffect(() => {
    if (over && room.winner === seat && !counted.current) {
      counted.current = true;
      reportWin((wins ?? 0) + 1);
    }
    if (!over) counted.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- count a win once per game
  }, [over]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Captain kind="captain" size={38} />
          <span className="font-pen text-[1.2rem] leading-none font-bold">
            {room.names[seat]}
            <small className="block font-hand text-[0.8rem] font-normal text-[#20296a]/70">{tr('chìm')} {sunkIn(room.theirs.sunk, room.theirs.shots)}/10</small>
          </span>
        </div>
        <div className="flex flex-row-reverse items-center gap-2">
          <Captain kind="sailor" tone={RED} size={38} />
          <span className="text-right font-pen text-[1.2rem] leading-none font-bold" style={{ color: RED }}>
            {room.names[foe]}
            {!room.present[foe] && <i className="ml-1 font-hand text-[0.8rem] font-normal not-italic">{tr('(mất kết nối)')}</i>}
            <small className="block font-hand text-[0.8rem] font-normal text-[#20296a]/70">{tr('chìm')} {sunkIn(room.mine.fleet, room.mine.shots)}/10</small>
          </span>
        </div>
      </div>

      <p className="min-h-6 font-pen text-[1.35rem] leading-none font-semibold" style={{ color: room.last && room.last.by !== seat && room.last.outcome !== 'miss' ? RED : INK }} role="status" aria-live="polite">
        {over ? '' : statusOf(room)}
      </p>
      {room.last && !over && <p className="-mt-1 font-hand text-[1rem] text-[#20296a]/80">{describeShot(room.last, seat, room.names)}</p>}

      <div className="relative">
        <Board fleet={room.theirs.sunk} shots={room.theirs.shots} reveal={over} label={tr('{0}\'s waters', room.names[foe])} onShoot={myTurn ? battle.fire : undefined} />
        {!myTurn && phase === 'play' && <div className="absolute inset-0 rounded-md bg-[#f8f3e5]/25" aria-hidden="true" />}
      </div>

      <div>
        <p className="font-pen text-[1.1rem] font-semibold">{tr('Hạm đội của')} {room.names[seat]}</p>
        <div className="w-[58%]">
          <Board fleet={room.mine.fleet} shots={room.mine.shots} reveal label={tr('Your fleet')} />
        </div>
      </div>

      {over && (
        <Note title={room.winner === seat ? tr('Bạn thắng rồi!') : tr('{0} thắng', room.names[foe])} detail={tr('Chìm hết hạm đội đối phương.')}>
          <InkButton disabled={room.rematch[seat]} onClick={battle.rematch}>
            <RotateCcw size={15} aria-hidden="true" /> {room.rematch[seat] ? tr('Đợi {0}…', room.names[foe]) : room.rematch[foe] ? tr('{0} muốn chơi lại', room.names[foe]) : tr('Ván mới')}
          </InkButton>
        </Note>
      )}
      <InkButton tone={RED} onClick={onLeave}>
        <LogOut size={15} aria-hidden="true" /> {tr('Rời phòng')}
      </InkButton>
      <p className="font-hand text-[0.9rem] text-[#20296a]/65">{tr('Thắng bạn bè trên máy này:')} {wins ?? 0}</p>
    </div>
  );
}

/** The whole online game: the lobby, the waiting room, placing boats, the fight. */
export default function OnlineBattle({ initialCode = '', onExit }) {
  const battle = useBattle();
  const { room } = battle;
  const leave = () => {
    battle.leave();
    onExit();
  };

  if (!room) {
    // reopening the app in the middle of a game: the connection is being picked up again
    if (battle.hasSession && (battle.link === 'connecting' || battle.link === 'lost')) {
      return (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <Loading label={tr('Rejoining your game')} className="w-full">
            <Skeleton className="aspect-square w-full rounded-md bg-[#2c3aa8]/15" />
          </Loading>
          {battle.slow && <p className="max-w-[18rem] font-hand text-[1rem]">{WAKING}</p>}
          <InkButton tone={RED} onClick={leave}>
            {tr('Thôi, quay lại')}
          </InkButton>
        </div>
      );
    }
    return <Lobby battle={battle} initialCode={initialCode} onExit={onExit} />;
  }
  if (room.phase === 'wait') return <Waiting room={room} onLeave={leave} />;
  if (room.phase === 'place') return <Placing room={room} battle={battle} />;
  return <Fight room={room} battle={battle} onLeave={leave} />;
}
