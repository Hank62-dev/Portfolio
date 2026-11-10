import { Check, Lock } from 'lucide-react';
import { Dialog } from '../../shared/ui';
import { clsx } from '../../shared/lib/format';
import { CORE, bySection, modules, modulesUi, setVisible } from '../modules';
import { NAVIGATION, tabAccent } from '../navigation';
import { useStore } from '../store';
import { tr } from '../lang';

/**
 * Choose which places of the workspace to see. A place that is off leaves the menus, the home screen and the search; what is
 * kept in it stays, and it comes back when switched on. The heart of the workspace (home, Hank, notes, music) stays on.
 */
export default function ModulesSheet() {
  const { open } = useStore(modulesUi);
  const hidden = useStore(modules, (s) => s.hidden);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => modulesUi.set({ open: next })}
      eyebrow={tr('CUSTOMISE')}
      title={tr('Which places do you use?')}
      description={tr('Switch off what you do not need. Nothing is deleted, and you can bring a place back any time.')}
    >
      <div className="flex flex-col gap-5">
        {bySection(NAVIGATION).map(({ section, items }) => (
          <div key={section}>
            <p className="mb-2 font-mono text-[0.68rem] tracking-[0.16em] text-bone-faint uppercase">{tr(section)}</p>
            <ul className="flex flex-col">
              {items.map((item) => {
                const core = CORE.includes(item.id);
                const on = !hidden.includes(item.id);
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      disabled={core}
                      onClick={() => setVisible(item.id, !on)}
                      className="flex w-full items-center gap-3 border-t border-line py-2.5 text-left first:border-t-0 disabled:opacity-60"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-line-strong bg-ink-2" style={{ color: tabAccent(item.id) }}>
                        <Icon size={17} strokeWidth={1.5} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-fine text-bone">{item.label}</span>
                        <small className="block truncate font-mono text-[0.68rem] text-bone-faint">{item.blurb}</small>
                      </span>
                      {core ? (
                        <Lock size={14} className="text-bone-faint" aria-label={tr('Always on')} />
                      ) : (
                        <span className={clsx('relative h-6 w-10 shrink-0 rounded-full border transition-colors', on ? 'border-signal bg-signal' : 'border-line-strong bg-ink-3')} aria-hidden="true">
                          <i className={clsx('absolute top-0.5 grid size-4.5 place-items-center rounded-full bg-ink-0 transition-all', on ? 'left-[1.1rem] text-signal' : 'left-0.5 text-transparent')}>
                            <Check size={11} />
                          </i>
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </Dialog>
  );
}
