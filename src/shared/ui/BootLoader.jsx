import { word } from './words';

/**
 * The opening screen of the workspace, in the manner of an old book plate: deep ink, a gold ring drawn slowly round a serif
 * monogram that a sheen of light passes over, the name set wide in small capitals between two rules, and a hairline of gold
 * that fills and empties under it. Everything eases; nothing jumps. `label` is a line set under the name (e.g. while a free
 * server wakes up). Still when less motion is wanted.
 */
export default function BootLoader({ label }) {
  return (
    <div role="status" aria-label={word('Loading')} className="boot grid min-h-screen place-items-center px-6">
      <span className="boot-vignette" aria-hidden="true" />
      <div className="boot-plate relative flex flex-col items-center">
        <span className="boot-seal" aria-hidden="true">
          <svg viewBox="0 0 120 120">
            <defs>
              <linearGradient id="boot-gold" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f3e2b3" />
                <stop offset="45%" stopColor="#c9a45c" />
                <stop offset="100%" stopColor="#8a6a32" />
              </linearGradient>
            </defs>
            <circle cx="60" cy="60" r="56" className="boot-ring-faint" />
            <circle cx="60" cy="60" r="56" className="boot-ring" pathLength="1" />
            <circle cx="60" cy="60" r="49" className="boot-ring-inner" />
            {[0, 90, 180, 270].map((turn) => (
              <path key={turn} d="M60 8.5 l2.2 2.2 -2.2 2.2 -2.2 -2.2z" transform={`rotate(${turn} 60 60)`} className="boot-gem" />
            ))}
          </svg>
          <b className="boot-monogram">H</b>
        </span>

        <span className="boot-name">
          <i aria-hidden="true" />
          Hank<span>62</span>
          <i aria-hidden="true" />
        </span>
        <em className="boot-sub">{label || word('Private workspace')}</em>
        <span className="boot-hair" aria-hidden="true">
          <i />
        </span>
      </div>
    </div>
  );
}
