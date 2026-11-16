import { useCallback, useEffect, useRef, useState } from 'react';
import { useLang } from '../../i18n';
import { clsx, timeAgo } from '../../../shared/lib/format';
import { burst } from '../../motion/burst';
import { sound } from '../../motion/sound';
import { gsap, MOTION } from '../../motion/gsap';
import { useGsap } from '../../motion/useGsap';
import { fetchWhispers, flagOf, guessCountry, sendWhisper } from '../../services/whispersService';
import Sky from './Sky';

const MAX = 80;
const HIT = 26; // px: how near the pointer must be to a flame to read it

/**
 * A guestbook as a night sky: every visitor may light a small flame with a line of their own, and only the
 * newest thirty burn. Click (or press the button) to light one; hover a flame to read it. When the server is
 * not there the sky is simply empty and says so.
 */
const Whispers = () => {
  const { c, lang } = useLang();
  const w = c.whispers;
  const [list, setList] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | offline
  const [pending, setPending] = useState(null); // { x, y } where a whisper is being written
  const [hovered, setHovered] = useState(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const sky = useRef(null);
  const input = useRef(null);
  const state = useRef({ flames: [], hovered: null, pending: null });
  state.current = { flames: list, hovered: hovered?.id ?? null, pending };
  const getState = useCallback(() => state.current, []);

  useEffect(() => {
    let alive = true;
    fetchWhispers()
      .then((items) => {
        if (!alive) return;
        setList(items);
        setStatus('ready');
      })
      .catch(() => alive && setStatus('offline'));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (pending) input.current?.focus();
  }, [pending]);

  const scope = useGsap(({ scope: ref, mm }) => {
    mm.add(MOTION, () => {
      gsap.from(ref.current.querySelectorAll('[data-whisper-fade]'), {
        y: 36,
        opacity: 0,
        duration: 1.1,
        ease: 'expo.out',
        stagger: 0.1,
        scrollTrigger: { trigger: ref.current, start: 'top 75%', once: true },
      });
      gsap.fromTo(ref.current.querySelector('[data-sky]'), { clipPath: 'inset(18% 8% 18% 8% round 28px)' }, { clipPath: 'inset(0% 0% 0% 0% round 16px)', ease: 'none', scrollTrigger: { trigger: ref.current.querySelector('[data-sky]'), start: 'top bottom', end: 'top 35%', scrub: true } });
    });
  }, []);

  const at = (e) => {
    const r = sky.current.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, r };
  };

  const onMove = (e) => {
    const { x, y, r } = at(e);
    let best = HIT;
    let near = null;
    list.forEach((f) => {
      const d = Math.hypot((f.x - x) * r.width, (f.y - y) * r.height);
      if (d < best) {
        best = d;
        near = f;
      }
    });
    if (near?.id !== hovered?.id) {
      if (near) sound.tick();
      setHovered(near);
    }
  };

  const open = (x, y) => {
    if (status !== 'ready') return;
    setError('');
    setPending({ x: Math.min(0.94, Math.max(0.06, x)), y: Math.min(0.9, Math.max(0.16, y)) });
  };

  const onClick = (e) => {
    if (e.target !== e.currentTarget) return;
    if (hovered) return;
    const { x, y } = at(e);
    open(x, y);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!pending || !draft.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      const whisper = await sendWhisper({ message: draft.trim(), x: pending.x, y: pending.y, country: guessCountry() });
      setList((items) => [whisper, ...items.filter((i) => i.id !== whisper.id)].slice(0, 30));
      const r = sky.current.getBoundingClientRect();
      burst(r.left + pending.x * r.width, r.top + pending.y * r.height);
      sound.click();
      setPending(null);
      setDraft('');
    } catch (err) {
      setError(err.status === 429 ? w.tooSoon : err.status === 400 ? err.message : w.failed);
    } finally {
      setSending(false);
    }
  };

  const tip = hovered ?? null;

  return (
    <section id="whispers" ref={scope} className="relative py-section" aria-labelledby="whispers-title">
      <div className="wrap">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p data-whisper-fade className="mb-4 font-mono text-[0.72rem] tracking-[0.1em] text-signal uppercase">
              {w.label}
            </p>
            <h2 data-whisper-fade id="whispers-title" className="font-display text-h2 leading-[1.02]">
              {w.title}
            </h2>
            <p data-whisper-fade className="mt-4 max-w-[52ch] text-bone-dim">
              {w.lede}
            </p>
          </div>
          <div data-whisper-fade className="flex flex-col items-end gap-2 font-mono text-fine text-bone-dim">
            <span>
              {status === 'ready' ? w.count(list.length) : status === 'loading' ? w.loading : w.offline}
            </span>
            <button
              type="button"
              disabled={status !== 'ready'}
              onClick={() => open(0.2 + Math.random() * 0.6, 0.3 + Math.random() * 0.45)}
              className="min-h-[42px] rounded-full border border-line-strong px-4 text-bone transition-colors hover:border-signal hover:text-signal disabled:opacity-40"
            >
              {w.light} ✦
            </button>
          </div>
        </div>

        <div
          ref={sky}
          data-sky
          data-cursor={status === 'ready' && !hovered ? 'light' : undefined}
          onPointerMove={onMove}
          onPointerLeave={() => setHovered(null)}
          onClick={onClick}
          className={clsx(
            'relative h-[min(560px,68svh)] overflow-hidden rounded-card border border-line-strong bg-ink-1',
            status === 'ready' && 'cursor-crosshair'
          )}
        >
          <Sky getState={getState} />
          <i className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-signal/10 to-transparent" aria-hidden="true" />
          {status !== 'ready' && (
            <p className="pointer-events-none absolute inset-0 grid place-items-center px-6 text-center font-mono text-fine text-bone-faint">
              {status === 'loading' ? w.loading : w.offlineLong}
            </p>
          )}
          {status === 'ready' && list.length === 0 && !pending && (
            <p className="pointer-events-none absolute inset-0 grid place-items-center px-6 text-center font-display text-h3 text-bone-dim">{w.empty}</p>
          )}

          {tip && (
            <div
              className="pointer-events-none absolute z-10 w-max max-w-[min(320px,80%)] -translate-x-1/2 -translate-y-[calc(100%+26px)] rounded-xl border border-signal/60 bg-ink-0/90 px-4 py-3 shadow-pop backdrop-blur"
              style={{ left: `${tip.x * 100}%`, top: `${tip.y * 100}%` }}
              role="status"
            >
              <p className="text-bone">“{tip.message}”</p>
              <p className="mt-1.5 font-mono text-[0.68rem] tracking-[0.06em] text-bone-faint uppercase">
                <span className="mr-1.5 text-[0.9rem] normal-case">{flagOf(tip.country)}</span>
                {timeAgo(new Date(tip.at).toISOString(), lang)}
              </p>
            </div>
          )}

          {pending && (
            <form
              onSubmit={submit}
              onClick={(e) => e.stopPropagation()}
              className="absolute z-20 w-[min(340px,86%)] -translate-x-1/2 translate-y-5 rounded-xl border border-line-strong bg-ink-0/95 p-3 shadow-pop backdrop-blur"
              style={{ left: `${Math.min(80, Math.max(20, pending.x * 100))}%`, top: `${Math.min(62, pending.y * 100)}%` }}
            >
              <label htmlFor="whisper-input" className="mb-2 block font-mono text-[0.68rem] tracking-[0.08em] text-bone-faint uppercase">
                {w.prompt}
              </label>
              <input
                ref={input}
                id="whisper-input"
                value={draft}
                maxLength={MAX}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setPending(null)}
                placeholder={w.placeholder}
                className="w-full rounded-lg border border-line bg-ink-2 px-3 py-2.5 text-bone outline-none placeholder:text-bone-faint focus:border-signal"
              />
              <div className="mt-2.5 flex items-center justify-between gap-3 font-mono text-[0.7rem] text-bone-faint">
                <span aria-live="polite" className={error ? 'text-danger' : undefined}>
                  {error || `${[...draft].length}/${MAX}`}
                </span>
                <span className="flex gap-2">
                  <button type="button" onClick={() => setPending(null)} className="rounded-full px-3 py-1.5 hover:text-bone">
                    {w.cancel}
                  </button>
                  <button type="submit" disabled={!draft.trim() || sending} className="rounded-full bg-signal px-3.5 py-1.5 text-ink-0 disabled:opacity-50">
                    {sending ? '…' : w.send}
                  </button>
                </span>
              </div>
            </form>
          )}
        </div>

        {/* the whispers as plain text, for assistive technology */}
        <ul className="sr-only">
          {list.map((f) => (
            <li key={f.id}>
              {f.message} — {flagOf(f.country)} {timeAgo(new Date(f.at).toISOString(), lang)}
            </li>
          ))}
        </ul>
        <p className="mt-4 font-mono text-[0.7rem] text-bone-faint">{w.note}</p>
      </div>
    </section>
  );
};

export default Whispers;
