import { forwardRef, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { DayPicker } from 'react-day-picker';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { clsx } from '../lib/format';
import { control } from './Field';
import { useSoft } from './soft';

// The calendar and date picker follow shadcn/ui's Calendar + Popover recipe: react-day-picker for the grid, Radix for
// the popover, and every part of the grid styled here with the workspace's tokens.

const CHEVRONS = { left: ChevronLeft, right: ChevronRight, up: ChevronUp, down: ChevronDown };

const DAY = 'grid size-9 place-items-center rounded-full text-fine text-bone-dim transition-colors hover:bg-white/10 hover:text-bone focus-visible:ring-2 focus-visible:ring-signal/50 focus-visible:outline-none';

export function Calendar({ className, classNames, ...props }) {
  return (
    <DayPicker
      showOutsideDays
      weekStartsOn={1}
      className={clsx('p-3', className)}
      classNames={{
        months: 'relative flex flex-col',
        month: 'flex flex-col gap-2',
        month_caption: 'flex h-9 items-center justify-center px-10',
        caption_label: 'font-display text-lead text-bone',
        nav: 'absolute inset-x-0 top-0 z-10 flex h-9 items-center justify-between',
        button_previous: 'grid size-9 place-items-center rounded-full text-bone-dim transition-colors hover:bg-white/10 hover:text-bone',
        button_next: 'grid size-9 place-items-center rounded-full text-bone-dim transition-colors hover:bg-white/10 hover:text-bone',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'size-9 text-center font-mono text-[0.66rem] font-normal tracking-wide text-bone-faint uppercase',
        week: 'mt-1 flex',
        day: 'size-9 p-0 text-center',
        day_button: DAY,
        selected: '[&>button]:bg-bone [&>button]:text-ink-0 [&>button]:hover:bg-bone [&>button]:hover:text-ink-0',
        today: '[&>button]:text-bone [&>button]:ring-1 [&>button]:ring-signal/70',
        outside: '[&>button]:opacity-35',
        disabled: 'pointer-events-none [&>button]:opacity-30',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation = 'left', className: iconClass }) => {
          const Icon = CHEVRONS[orientation] ?? ChevronLeft;
          return <Icon size={16} className={iconClass} aria-hidden="true" />;
        },
      }}
      {...props}
    />
  );
}

const pad = (n) => String(n).padStart(2, '0');
/** "2026-11-02" → a Date at local midnight (or undefined). */
const parse = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : undefined;
};
const format = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/**
 * A date field that opens a calendar. `value` and `onChange` use "YYYY-MM-DD" strings (an empty string for no date),
 * like a native date input, but onChange receives the string itself rather than an event.
 */
export const DatePicker = forwardRef(function DatePicker({ value, onChange, placeholder = 'Pick a date', compact, className, clearable = true, disabled, ...rest }, ref) {
  const soft = useSoft();
  const [open, setOpen] = useState(false);
  const selected = parse(value);
  const choose = (next) => {
    onChange?.(next);
    setOpen(false);
  };
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button ref={ref} type="button" disabled={disabled} className={control(soft, compact, clsx('flex items-center justify-between gap-2 pr-3.5 text-left', className))} {...rest}>
          <span className={clsx('min-w-0 flex-1 truncate tabular-nums', !selected && 'text-bone-faint')}>
            {selected ? selected.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : placeholder}
          </span>
          <CalendarDays size={16} aria-hidden="true" className="shrink-0 text-bone-faint" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          collisionPadding={12}
          className="z-[70] animate-fade-in rounded-3xl border border-white/10 bg-ink-1/95 shadow-[0_28px_70px_-24px_rgb(0_0_0/0.95)] backdrop-blur-xl focus-visible:outline-none"
        >
          <Calendar mode="single" selected={selected} defaultMonth={selected} onSelect={(date) => date && choose(format(date))} autoFocus />
          <div className="flex items-center justify-between border-t border-white/8 px-3 py-2 font-mono text-[0.78rem]">
            <button type="button" onClick={() => choose(format(new Date()))} className="rounded-full px-3 py-1.5 text-bone-dim transition-colors hover:bg-white/8 hover:text-bone">
              Today
            </button>
            {clearable && (
              <button type="button" disabled={!selected} onClick={() => choose('')} className="rounded-full px-3 py-1.5 text-bone-faint transition-colors hover:bg-white/8 hover:text-bone disabled:opacity-35 disabled:hover:bg-transparent">
                Clear
              </button>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
});
