import { useRef, useState, useSyncExternalStore } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { clsx } from '../lib/format';
import { word } from './words';

// Short messages the workspace shows about what just happened ("Saved", "Server offline"). They slide in from the top of the
// screen, stack (newest last), go away by themselves, and can be swiped or tapped away. Anything can call `pushToast`.

const MAX = 3; // more than this at once is noise: the oldest goes
const FOR = { info: 3200, success: 2600, error: 5200 };

let items = [];
let next = 1;
const listeners = new Set();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Which kind a plain message is, when the caller did not say: failures and offline notices read as errors, confirmations as success. */
export const toneOf = (message) => {
  const text = String(message).toLowerCase();
  if (/\b(offline|failed|could not|cannot|can't|error|wrong|denied|not sent|not dispatched|too many)\b/.test(text)) return 'error';
  if (/\b(saved|added|done|copied|connected|reconnected|deleted|removed|sent|updated|created|ready)\b/.test(text)) return 'success';
  return 'info';
};

/** The messages on show, oldest first. Pure; used by the store and by its tests. */
export const withToast = (list, toast) => [...list.filter((t) => t.message !== toast.message), toast].slice(-MAX);

/** Shows a message. `tone` is 'info' | 'success' | 'error' (guessed from the words when left out). Returns its id. */
export const pushToast = (message, { tone } = {}) => {
  const text = String(message ?? '').trim();
  if (!text) return 0;
  const kind = tone ?? toneOf(text);
  const toast = { id: next++, message: text, tone: kind, ms: FOR[kind] ?? FOR.info };
  items = withToast(items, toast);
  emit();
  return toast.id;
};

export const dismissToast = (id) => {
  if (!items.some((t) => t.id === id)) return;
  items = items.filter((t) => t.id !== id);
  emit();
};

const useToasts = () => useSyncExternalStore(subscribe, () => items, () => items);

const LOOK = {
  info: { Icon: Info, ring: 'text-signal bg-signal/15', edge: 'bg-signal' },
  success: { Icon: CheckCircle2, ring: 'text-ok bg-ok/15', edge: 'bg-ok' },
  error: { Icon: AlertTriangle, ring: 'text-danger bg-danger/15', edge: 'bg-danger' },
};

const SWIPE = 70; // px to drag a toast before letting go sends it away

function Item({ toast }) {
  const { Icon, ring, edge } = LOOK[toast.tone] ?? LOOK.info;
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const [held, setHeld] = useState(false); // a finger or the pointer on it holds the timer
  const from = useRef(null);

  const release = () => {
    const far = Math.abs(drag.x) > SWIPE || drag.y < -SWIPE / 1.4;
    from.current = null;
    setHeld(false);
    if (far) dismissToast(toast.id);
    else setDrag({ x: 0, y: 0, active: false });
  };

  return (
    <li
      role={toast.tone === 'error' ? 'alert' : 'status'}
      className="pointer-events-auto relative touch-pan-y overflow-hidden rounded-2xl border border-line-strong bg-ink-2/95 shadow-[0_20px_50px_-18px_rgb(var(--shadow-rgb)/0.95)] backdrop-blur-2xl select-none [animation:toast-in_0.4s_var(--ease-out-expo)_backwards] motion-reduce:[animation:none]"
      style={{ transform: drag.x || drag.y ? `translate(${drag.x}px, ${Math.min(0, drag.y)}px)` : undefined, opacity: drag.active ? Math.max(0.35, 1 - Math.abs(drag.x) / 220 - Math.max(0, -drag.y) / 160) : 1, transition: drag.active ? 'none' : 'transform 0.25s var(--ease-out-expo), opacity 0.25s' }}
      onPointerDown={(e) => {
        from.current = { x: e.clientX, y: e.clientY };
        setHeld(true);
        e.currentTarget.setPointerCapture?.(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!from.current) return;
        setDrag({ x: e.clientX - from.current.x, y: e.clientY - from.current.y, active: true });
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => !from.current && setHeld(false)}
      data-toast={toast.tone}
    >
      <div className="flex items-start gap-3 py-3 pr-2 pl-3.5">
        <span className={clsx('mt-px grid size-8 shrink-0 place-items-center rounded-full', ring)}>
          <Icon size={16} aria-hidden="true" />
        </span>
        <p className="min-w-0 flex-1 py-1 text-[0.9rem] leading-snug break-words text-bone">{toast.message}</p>
        <button type="button" aria-label={word('Dismiss')} onClick={() => dismissToast(toast.id)} onPointerDown={(e) => e.stopPropagation()} className="grid size-8 shrink-0 place-items-center rounded-full text-bone-faint transition-colors hover:text-bone active:scale-90">
          <X size={14} aria-hidden="true" />
        </button>
      </div>
      {/* the time left, running down; it stops while the toast is held */}
      <i
        key={toast.id}
        className={clsx('absolute bottom-0 left-0 block h-0.5 w-full origin-left [animation:toast-life_linear_forwards] motion-reduce:hidden', edge)}
        style={{ animationDuration: `${toast.ms}ms`, animationPlayState: held ? 'paused' : 'running' }}
        onAnimationEnd={() => dismissToast(toast.id)}
        aria-hidden="true"
      />
    </li>
  );
}

/** Where the messages appear: the top of the screen (below the notch on a phone), a column in the corner on a computer. Mount once. */
export const Toast = () => {
  const list = useToasts();
  if (!list.length) return null;
  return (
    <ol className="pointer-events-none fixed inset-x-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-[95] mx-auto flex max-w-sm flex-col gap-2 md:inset-x-auto md:right-6 md:mx-0 md:w-96 md:max-w-none" aria-label="Notifications" data-toasts>
      {list.map((toast) => (
        <Item key={toast.id} toast={toast} />
      ))}
    </ol>
  );
};
