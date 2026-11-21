import { Fragment } from 'react';
import { Dialog } from '../../shared/ui';
import { tr } from '../core/i18n/lang';
import { NAVIGATION } from '../core/navigation';
import { shortcutGroups } from './shortcuts';

const labelOf = (tab) => NAVIGATION.find((item) => item.id === tab)?.label ?? tab;

/** Every key the workspace answers to, as keycaps (opened with ?). */
export default function ShortcutsSheet({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} eyebrow={tr('KEYBOARD')} title={tr('Shortcuts')} description={tr('Keys work anywhere except while you are typing.')}>
      <div className="grid gap-6 sm:grid-cols-2">
        {shortcutGroups(labelOf).map((group) => (
          <section key={group.title}>
            <h3 className="mb-2 font-mono text-[0.68rem] tracking-[0.14em] text-bone-faint uppercase">{group.title}</h3>
            <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2">
              {group.rows.map(([keys, what]) => (
                <Fragment key={what}>
                  <dt className="flex gap-1">
                    {keys.map((k, i) => (
                      <kbd key={i} className="kbd">
                        {k}
                      </kbd>
                    ))}
                  </dt>
                  <dd className="text-fine text-bone-dim">{what}</dd>
                </Fragment>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Dialog>
  );
}
