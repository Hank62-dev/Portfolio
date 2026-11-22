import { useMemo } from 'react';
import { deriveStack, LAYERS } from '../../data/projects';
import Blueprint from './Blueprint';

/** The tools each layer is drawn with in the callouts: its three most used. */
export const useLayerTechs = () =>
  useMemo(() => {
    const stack = deriveStack();
    return Object.fromEntries(
      LAYERS.map((layer) => [
        layer,
        [...(stack[layer] ?? [])]
          .sort((a, b) => b.slugs.length - a.slugs.length)
          .slice(0, 3)
          .map((e) => e.tech),
      ])
    );
  }, []);

/**
 * The hero's picture on wide screens: the system drawn as an architect's exploded view (see Blueprint), on the right half
 * behind the text. Purely decorative, so it is hidden from assistive technology and takes no pointer events. Narrow screens
 * get the same drawing inline in the Hero.
 */
export default function HeroVisual({ labels }) {
  const techs = useLayerTechs();
  return (
    <div
      className="pointer-events-none absolute inset-y-0 right-0 bottom-36 hidden w-[52%] [mask-image:linear-gradient(90deg,transparent,#000_16%)] lg:block"
      aria-hidden="true"
    >
      <div className="absolute inset-0 grid place-items-center px-8 pt-[var(--spacing-header)]">
        <Blueprint labels={labels} techs={techs} className="h-full max-h-[640px] w-full" />
      </div>
    </div>
  );
}
