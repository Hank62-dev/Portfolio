import { forwardRef, useEffect, useRef, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Clock } from 'lucide-react';
import { clsx } from '../lib/format';
import { control } from './Field';
import { useSoft } from './soft';
import { word } from './words';

const pad = (n) => String(n).padStart(2, '0');
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const QUICK = ['08:00', '12:00', '18:00', '19:00', '20:00', '21:00', '22:00'];

/** One column of numbers to pick from; the chosen one is scrolled to the middle when the column appears. */
function Column({ label, values, value, onPick }) {
  const list = useRef(null);
  useEffect(() => {
    const el = list.current?.querySelector('[aria-selected="true"]');
    el?.scrollIntoView({ block: 'center' });
  }, []);
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <p className="px-2 pb-1.5 text-center font-mono text-[0.64rem] tracking-[0.14em] text-bone-faint uppercase">{label}</p>
      <div ref={list} role="listbox" aria-label={label} className="tp-column no-scrollbar">
        {values.map((v) => (
          <button key={v} type="button" role="option" aria-selected={v === value} onClick={() => onPick(v)} className={clsx('tp-cell', v === value && 'is-on')}>
            {pad(v)}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * A time field that opens a picker in the manner of the date picker: a column of hours (00–23) and one of minutes, and a row of
 * the times most often wanted. `value` and `onChange` use "HH:MM" strings (24-hour), like a native time input, but onChange
 * receives the string itself. `step` is the minutes between choices (5 by default).
 */
export const TimePicker = forwardRef(function TimePicker({ value, onChange, placeholder = word('Pick a time'), step = 5, compact, className, disabled, ...rest }, ref) {
  const soft = useSoft();
  const [open, setOpen] = useState(false);
  const match = /^(\d{2}):(\d{2})$/.exec(value ?? '');
  const hour = match ? Number(match[1]) : null;
  const minute = match ? Number(match[2]) : null;
  // the steps, plus the minute already chosen if it falls between them
  const minutes = [...new Set([...Array.from({ length: Math.ceil(60 / step) }, (_, i) => i * step), ...(minute === null ? [] : [minute])])].sort((a, b) => a - b);
  const set = (h, m) => onChange?.(`${pad(h)}:${pad(m)}`);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button ref={ref} type="button" disabled={disabled} className={control(soft, compact, clsx('flex items-center justify-between gap-2 pr-3.5 text-left', className))} {...rest}>
          <span className={clsx('min-w-0 flex-1 truncate font-mono tabular-nums', !match && 'text-bone-faint')}>{match ? `${pad(hour)}:${pad(minute)}` : placeholder}</span>
          <Clock size={16} aria-hidden="true" className="shrink-0 text-bone-faint" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={8} collisionPadding={12} className="tp-panel z-[70] animate-fade-in focus-visible:outline-none">
          <div className="flex items-baseline justify-center gap-1 border-b border-wash/8 px-4 py-3 font-display text-[2rem] leading-none tabular-nums text-bone">
            <span>{hour === null ? '--' : pad(hour)}</span>
            <span className="text-bone-faint">:</span>
            <span>{minute === null ? '--' : pad(minute)}</span>
          </div>
          <div className="flex gap-1 p-2">
            <Column label={word('Hour')} values={HOURS} value={hour} onPick={(h) => set(h, minute ?? 0)} />
            <span className="my-8 w-px bg-wash/8" aria-hidden="true" />
            <Column label={word('Minute')} values={minutes} value={minute} onPick={(m) => set(hour ?? 9, m)} />
          </div>
          <div className="flex flex-wrap gap-1 border-t border-wash/8 p-2">
            {QUICK.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  onChange?.(t);
                  setOpen(false);
                }}
                className={clsx('tp-quick', value === t && 'is-on')}
              >
                {t}
              </button>
            ))}
            <button type="button" onClick={() => setOpen(false)} className="tp-done">
              {word('Done')}
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
});
