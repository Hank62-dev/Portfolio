import { clsx } from '../../../shared/lib/format';
import { statusTone } from './model';
import { outfitOf } from './outfits';
import { tr } from '../../core/i18n/lang';

// Small pieces the station's cards and the task dialog share (the 3D scene has its own, in Station3D).

const STATUS_WORD = {
  busy: () => tr('Working'),
  done: () => tr('Done'),
  failed: () => tr('Failed'),
  idle: () => tr('Ready'),
  offline: () => tr('Offline'),
};
export const statusWord = (status) => STATUS_WORD[statusTone(status)]();

/** The name a crew member goes by on the station: "Codex" for Minh Codex, "Mira" for Mira Core. */
export const shortName = (agent) => {
  const words = agent.name.split(' ');
  return words.at(-1) === 'Core' ? words[0] : words.at(-1);
};

/** A crew member's helmet, flat: in their suit's colour with its trim round it, a visor tinted with their colour, their initial on it. */
export function Helmet({ agent, size = 44, className }) {
  return (
    <span className={clsx('station-helmet', className)} style={{ '--c': agent.color, '--suit': outfitOf(agent.id).suit, '--trim': outfitOf(agent.id).trim, width: size, height: size, fontSize: Math.max(9, size * 0.3) }} aria-hidden="true">
      <span className="station-visor">{shortName(agent).slice(0, 1)}</span>
    </span>
  );
}
