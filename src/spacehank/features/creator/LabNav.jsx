import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Dialog } from '../../../shared/ui';
import { clsx } from '../../../shared/lib/format';
import { tr } from '../../core/i18n/lang';

/**
 * The Creator Lab's own navigation, in groups (make, sell, business, community), each place with a count of what waits there.
 * On a wide screen it stands as a column beside the work; on a phone it is one button that opens the list as a sheet.
 * `groups` [{ label, items: [{ id, label, icon, count, hot }] }].
 */
export default function LabNav({ groups, value, onChange }) {
  const [open, setOpen] = useState(false);
  const all = groups.flatMap((g) => g.items);
  const current = all.find((i) => i.id === value) ?? all[0];
  const CurrentIcon = current.icon;
  const waiting = all.filter((i) => i.hot && i.id !== value).reduce((n, i) => n + (i.count || 0), 0);

  const list = (onPick) =>
    groups.map((g) => (
      <div key={g.label} className="lab-nav-group">
        <p className="lab-nav-label">{g.label}</p>
        <ul>
          {g.items.map(({ id, label, icon: Icon, count, hot }) => (
            <li key={id}>
              <button type="button" aria-current={id === value ? 'page' : undefined} className={clsx('lab-nav-item', id === value && 'is-on')} onClick={() => onPick(id)}>
                <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{label}</span>
                {count > 0 && <b className={clsx('lab-nav-count', hot && 'is-hot')}>{count}</b>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    ));

  return (
    <>
      <nav className="lab-nav" aria-label={tr('Creator Lab')} data-lab-nav>
        {list(onChange)}
      </nav>

      <button type="button" className="lab-nav-phone" onClick={() => setOpen(true)} aria-haspopup="dialog" data-lab-nav-phone>
        <CurrentIcon size={17} aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-left">{current.label}</span>
        {waiting > 0 && <b className="lab-nav-count is-hot">{waiting}</b>}
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      <Dialog open={open} onOpenChange={setOpen} eyebrow={tr('CREATOR LAB')} title={tr('Go to')} description={tr('Everything in the Creator Lab, by what it is for.')}>
        <div className="lab-nav is-sheet">
          {list((id) => {
            onChange(id);
            setOpen(false);
          })}
        </div>
      </Dialog>
    </>
  );
}
