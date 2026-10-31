import { LockKeyhole, PanelLeftClose, PanelLeftOpen, Sparkles } from 'lucide-react';
import { Avatar, Badge, Tooltip } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { owner } from '../config';
import { NAVIGATION, NAV_SECTIONS } from '../navigation';

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

export default function Sidebar({ tab, onTab, rail, canCollapse, onCollapse, onLogout }) {
  const toggleLabel = rail ? 'Expand sidebar' : 'Collapse sidebar';
  return (
    <aside
      className={clsx(
        'sticky top-0 flex h-screen shrink-0 flex-col gap-6 border-r border-line bg-ink-1 py-5 transition-[width] duration-300 ease-out-expo',
        rail ? 'w-[68px] px-2.5' : 'w-64 px-3'
      )}
    >
      <div className={clsx('flex items-center gap-2.5 px-2', rail && 'justify-center px-0')}>
        <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-signal text-ink-0">
          <Sparkles size={16} aria-hidden="true" />
        </span>
        {!rail && (
          <span className="leading-tight">
            <b className="font-display text-lead font-normal">
              Hank<span className="text-signal">62</span>
            </b>
            <small className="block font-mono text-[0.68rem] tracking-[0.14em] text-bone-faint">PRIVATE OS</small>
          </span>
        )}
      </div>

      <nav aria-label="Workspace" className="flex flex-1 flex-col gap-5 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div className="flex flex-col gap-1" key={section}>
            {!rail && (
              <span className="px-3 pb-1 font-mono text-[0.68rem] tracking-[0.14em] text-bone-faint">{section}</span>
            )}
            {NAVIGATION.filter((item) => item.section === section).map((item) => (
              <NavButton key={item.id} rail={rail} active={tab === item.id} onClick={() => onTab(item.id)} {...item} />
            ))}
          </div>
        ))}
      </nav>

      <div className="flex flex-col gap-1 border-t border-line pt-4">
        <NavButton rail={rail} label="Lock workspace" icon={LockKeyhole} onClick={onLogout} />
        {canCollapse && (
          <NavButton
            rail={rail}
            label={toggleLabel}
            icon={rail ? PanelLeftOpen : PanelLeftClose}
            onClick={onCollapse}
          />
        )}
        <div className={clsx('mt-2 flex items-center gap-3 px-2', rail && 'justify-center px-0')}>
          <Avatar>{owner.initials}</Avatar>
          {!rail && (
            <span className="leading-tight">
              <b className="block text-fine font-medium">{owner.name}</b>
              <small className="font-mono text-[0.7rem] text-bone-faint">Owner online</small>
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}
