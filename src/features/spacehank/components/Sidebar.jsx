import SyncStatus from './SyncStatus';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, LockKeyhole, LogOut, PanelLeftClose, PanelLeftOpen, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { Avatar, Badge, Tooltip } from '../../../shared/ui';
import { clsx } from '../../../shared/lib/format';
import Logo from '../../../shared/ui/Logo';
import { owner } from '../config';
import { bySection, openModules, useNav } from '../modules';
import { tr } from '../lang';

const ITEM =
  'relative flex w-full items-center gap-3 rounded-sm px-3 py-2.5 font-mono text-fine transition-colors duration-200';

function NavButton({ rail, active, label, icon: Icon, badge, onClick }) {
  return (
    <Tooltip content={label} disabled={!rail}>
      <button
        onClick={onClick}
        aria-label={rail ? label : undefined}
        aria-current={active ? 'page' : undefined}
        className={clsx(ITEM, rail && 'justify-center px-0', active ? 'bg-ink-3 text-bone' : 'text-bone-dim hover:bg-ink-2 hover:text-bone')}
      >
        {active && <i className="absolute top-2 bottom-2 left-0 w-0.5 rounded-full bg-signal" aria-hidden="true" />}
        <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
        {!rail && <span className="flex-1 text-left">{label}</span>}
        {!rail && badge && <Badge tone="signal">{badge}</Badge>}
      </button>
    </Tooltip>
  );
}

/** True while the list can be scrolled further and has not been touched yet; false once it moves. */
function useMoreBelow(ref) {
  const [more, setMore] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const check = () => setMore(el.scrollTop < 8 && el.scrollHeight - el.clientHeight > 24);
    check();
    el.addEventListener('scroll', check, { passive: true });
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', check);
      observer.disconnect();
    };
  }, [ref]);
  return more;
}

export default function Sidebar({ tab, onTab, rail, guest, app, onNotify, canCollapse, onCollapse, onLogout, onResetDemo }) {
  const toggleLabel = rail ? tr('Expand sidebar') : tr('Collapse sidebar');
  const list = useRef(null);
  const more = useMoreBelow(list);
  const groups = bySection(useNav());
  return (
    <aside
      className={clsx(
        'sticky top-0 flex h-screen shrink-0 flex-col gap-6 border-r border-line bg-ink-1 py-5 transition-[width] duration-300 ease-out-expo',
        rail ? 'w-[68px] px-2.5' : 'w-64 px-3'
      )}
    >
      <div className={clsx('flex items-center gap-2.5 px-2', rail && 'justify-center px-0')}>
        <Logo className="size-9 rounded-lg" />
        {!rail && (
          <span className="leading-tight">
            <b className="font-display text-lead font-normal">
              {tr('Hank')}<span className="text-signal">62</span>
            </b>
            <small className="block font-mono text-[0.68rem] tracking-[0.14em] text-bone-faint">{tr('PRIVATE OS')}</small>
          </span>
        )}
      </div>

      <div className="relative min-h-0 flex-1">
        <nav ref={list} aria-label={tr('Workspace')} className="no-scrollbar flex h-full flex-col gap-5 overflow-y-auto">
          {groups.map(({ section, items }) => (
            <div className="flex flex-col gap-1" key={section}>
              {!rail && (
                <span className="px-3 pb-1 font-mono text-[0.68rem] tracking-[0.14em] text-bone-faint">{tr(section)}</span>
              )}
              {items.map((item) => (
                <NavButton key={item.id} rail={rail} active={tab === item.id} onClick={() => onTab(item.id)} {...item} />
              ))}
            </div>
          ))}
        </nav>
        <span aria-hidden="true" className={clsx('pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-ink-1 via-ink-1/80 to-transparent transition-opacity duration-300', more ? 'opacity-100' : 'opacity-0')} />
        <button
          type="button"
          tabIndex={more ? 0 : -1}
          aria-hidden={!more}
          aria-label={tr('Scroll down for more')}
          onClick={() => list.current?.scrollBy({ top: 200, behavior: 'smooth' })}
          className={clsx(
            'absolute bottom-1 left-1/2 grid size-8 -translate-x-1/2 place-items-center rounded-full border border-line bg-ink-2/85 text-bone-dim shadow-[0_8px_20px_-8px_rgb(var(--shadow-rgb)/0.8)] backdrop-blur transition-all duration-300 hover:text-bone',
            more ? 'opacity-100' : 'pointer-events-none translate-y-1 opacity-0'
          )}
          data-scroll-hint
        >
          <ChevronDown size={15} className="animate-nudge" aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-col gap-1 border-t border-line pt-4">
        {(app?.canInstall || app?.ios) && (
          <NavButton
            rail={rail}
            label={tr('Install app')}
            icon={Download}
            onClick={() => (app.canInstall ? app.install() : onNotify?.(tr('On iPhone: tap Share, then Add to Home Screen')))}
          />
        )}
        {!guest && !rail && <SyncStatus />}
        {guest && <NavButton rail={rail} label={tr('Reset demo data')} icon={RotateCcw} onClick={onResetDemo} />}
        {/* the three small actions share one row when the sidebar is open, and stack in the narrow rail */}
        <div className={clsx(rail ? 'flex flex-col gap-1' : 'flex items-center justify-between gap-1 px-1')}>
          {[
            { id: 'customise', label: tr('Customise'), icon: SlidersHorizontal, onClick: openModules },
            { id: 'lock', label: guest ? tr('Exit demo') : tr('Lock workspace'), icon: guest ? LogOut : LockKeyhole, onClick: onLogout },
            ...(canCollapse ? [{ id: 'collapse', label: toggleLabel, icon: rail ? PanelLeftOpen : PanelLeftClose, onClick: onCollapse }] : []),
          ].map((action) =>
            rail ? (
              <NavButton key={action.id} rail label={action.label} icon={action.icon} onClick={action.onClick} />
            ) : (
              <Tooltip key={action.id} content={action.label} side="top">
                <button type="button" aria-label={action.label} onClick={action.onClick} className="grid h-9 flex-1 place-items-center rounded-sm text-bone-dim transition-colors hover:bg-ink-2 hover:text-bone">
                  <action.icon size={17} strokeWidth={1.8} aria-hidden="true" />
                </button>
              </Tooltip>
            )
          )}
        </div>
        <div className={clsx('mt-2 flex items-center gap-3 px-2', rail && 'justify-center px-0')}>
          <Avatar>{guest ? tr('G') : owner.initials}</Avatar>
          {!rail && (
            <span className="leading-tight">
              <b className="block text-fine font-medium">{guest ? tr('Guest') : owner.name}</b>
              <small className="font-mono text-[0.7rem] text-bone-faint">{guest ? tr('Sample data') : tr('Owner online')}</small>
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}
