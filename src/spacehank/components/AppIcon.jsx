import { clsx } from '../../shared/lib/format';
import { tabAccent } from '../navigation';

/**
 * A place in the workspace as an app icon: a thin line icon in the tab's own muted tone, on a dark rounded square, with its
 * name under it. The home screen's launcher and the "everything" sheet share it, so they look the same.
 */
export default function AppIcon({ item, onPick, current = false, index, className }) {
  const { id, label, icon: Icon } = item;
  return (
    <li className={className} style={index === undefined ? undefined : { '--i': index }}>
      <button type="button" onClick={() => onPick(id)} aria-current={current ? 'page' : undefined} className="group flex w-full flex-col items-center gap-1.5 active:scale-95">
        <span
          className={clsx('grid size-[3.6rem] place-items-center rounded-[1.25rem] border bg-ink-2/80 transition-all group-active:scale-95', current ? 'border-signal/70 shadow-[0_0_0_3px_var(--color-signal-soft)]' : 'border-line-strong')}
          style={{ color: tabAccent(id) }}
        >
          <Icon size={25} strokeWidth={1.4} aria-hidden="true" />
        </span>
        <span className={clsx('line-clamp-2 w-full text-center font-mono text-[0.6rem] leading-tight tracking-tight [overflow-wrap:anywhere]', current ? 'text-bone' : 'text-bone-dim')}>{label}</span>
      </button>
    </li>
  );
}
