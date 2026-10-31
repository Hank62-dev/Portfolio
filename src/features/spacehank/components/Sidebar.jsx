import { CircleDot, LockKeyhole, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Sparkles } from 'lucide-react';
import { owner } from '../config';
import { NAVIGATION, NAV_SECTIONS } from '../navigation';

export default function Sidebar({ tab, onTab, collapsed, onCollapse, onLogout }) {
  return (
    <aside className={`modern-sidebar ${collapsed ? 'is-collapsed' : ''}`}>
      <div className="modern-brand">
        <span className="modern-brand-mark">
          <Sparkles size={17} />
        </span>
        <span className="modern-brand-copy">
          <b>
            Hank<span>62</span>
          </b>
          <small>PRIVATE OS</small>
        </span>
      </div>
      <button className="workspace-switcher" onClick={() => onTab('hank')}>
        <span className="workspace-avatar">{owner.initials}</span>
        <span className="workspace-copy">
          <b>Personal workspace</b>
          <small>Local command center</small>
        </span>
        <MoreHorizontal size={16} />
      </button>
      <nav className="modern-nav">
        {NAV_SECTIONS.map((section) => (
          <div className="modern-nav-group" key={section}>
            <span className="modern-nav-label">{section}</span>
            {NAVIGATION.filter((item) => item.section === section).map(({ id, label, icon: Icon, badge }) => (
              <button
                key={id}
                className={`modern-nav-item ${tab === id ? 'active' : ''}`}
                onClick={() => onTab(id)}
                title={label}
              >
                <span className="modern-nav-icon">
                  <Icon size={17} strokeWidth={1.8} />
                </span>
                <span className="modern-nav-text">{label}</span>
                {badge && <em>{badge}</em>}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div className="modern-sidebar-bottom">
        <button className="modern-nav-item" onClick={onLogout} title="Lock workspace">
          <span className="modern-nav-icon">
            <LockKeyhole size={17} />
          </span>
          <span className="modern-nav-text">Lock workspace</span>
        </button>
        <button className="sidebar-collapse" onClick={onCollapse} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <span>{collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}</span>
          <span className="modern-nav-text">{collapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span>
        </button>
        <div className="modern-profile">
          <span className="profile-avatar">{owner.initials}</span>
          <span className="modern-nav-text">
            <b>{owner.initials}</b>
            <small>Owner online</small>
          </span>
          <CircleDot size={13} className="profile-dot" />
        </div>
      </div>
    </aside>
  );
}
