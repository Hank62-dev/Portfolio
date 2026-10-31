export function SectionIntro({ eyebrow, title, description, action }) {
  return (
    <div className="section-intro">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

export function Metric({ icon: Icon, label, value, change, tone = 'cyan' }) {
  return (
    <article className={`metric-card ${tone}`}>
      <div className="metric-icon">
        <Icon size={16} />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      {change && <small>{change}</small>}
    </article>
  );
}

export function EmptyState({ icon: Icon, size = 22, children }) {
  return (
    <div className="empty-document">
      <Icon size={size} />
      {children}
    </div>
  );
}

export function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="toast" role="status">
      <span>✓</span>
      {message}
    </div>
  );
}
