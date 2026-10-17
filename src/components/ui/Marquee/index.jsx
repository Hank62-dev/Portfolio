import { useMemo } from 'react';
import { deriveStack, LAYERS } from '../../../data/projects';

/**
 * A slow ticker of technologies, ordered by how many projects use them.
 * Decorative (the real, accessible version is the Stack section), hence aria-hidden.
 */
const Marquee = () => {
  const items = useMemo(() => {
    const stack = deriveStack();
    const all = LAYERS.flatMap((l) => stack[l]);
    const seen = new Set();
    return all
      .sort((a, b) => b.slugs.length - a.slugs.length)
      .filter(({ tech }) => !seen.has(tech) && seen.add(tech))
      .slice(0, 16)
      .map(({ tech }) => tech);
  }, []);

  return (
    <div
      className="group overflow-hidden border-y border-line bg-ink-1 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]"
      aria-hidden="true"
    >
      <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        {[0, 1].map((copy) => (
          <ul key={copy} className="flex flex-none">
            {items.map((tech) => (
              <li
                key={tech}
                className="py-[18px] pl-7 font-mono text-fine tracking-[0.1em] whitespace-nowrap text-bone-dim uppercase"
              >
                {tech}
                <span className="ml-7 text-signal">/</span>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
};

export default Marquee;
