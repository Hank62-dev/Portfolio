import { burstFrom } from '../../shared/fx/burst';
import { sound } from './sound';

// The moment something is finished (a habit watered, a card moved to Done, a focus block over, a deck of cards learnt): a
// burst of pieces in the colours of the tab from where it happened, and a chime if the sounds are on.

const colorsFor = (from) => {
  const el = from?.currentTarget ?? from?.target ?? (from instanceof Element ? from : null);
  const shell = el?.closest?.('.app-shell') ?? document.querySelector('.app-shell');
  const hue = Number(shell ? getComputedStyle(shell).getPropertyValue('--app-hue') : '') || 16;
  return [`hsl(${hue} 70% 62%)`, `hsl(${hue} 55% 78%)`, `hsl(${(hue + 40) % 360} 65% 66%)`, 'hsl(40 30% 92%)'];
};

/** Celebrates from `from` (a pointer event, an element, or nothing for the middle of the screen). */
export const celebrate = (from, { count = 26, colors } = {}) => {
  burstFrom(from, { colors: colors ?? colorsFor(from), count });
  sound.done();
};
