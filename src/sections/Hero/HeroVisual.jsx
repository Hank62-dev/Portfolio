import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { deriveStack, LAYERS } from '../../data/projects';
import { can3D, qualityTier, readEnvironment } from '../../lib/capabilities';
import { clsx } from '../../lib/format';
import { useTheme } from '../../lib/theme';
import { motionStore } from '../../motion/store';
import { heroStore } from './heroStore';
import StackIllustration from './StackIllustration';

// three.js is a separate chunk: it only downloads after first paint, on devices that can use it.
const StackScene = lazy(() => import('../../scene/stack/StackScene'));

const getInput = () => ({
  pointerX: heroStore.pointerX,
  pointerY: heroStore.pointerY,
  scroll: heroStore.scroll,
  boost: motionStore.velocity,
});
const getBurst = () => heroStore.burst;

const whenIdle = (callback) =>
  'requestIdleCallback' in window ? window.requestIdleCallback(callback, { timeout: 1500 }) : window.setTimeout(callback, 300);
const cancelIdle = (id) => ('cancelIdleCallback' in window ? window.cancelIdleCallback(id) : window.clearTimeout(id));

/**
 * The hero's visual on wide screens: a flat drawing first, replaced by the 3D scene once it is loaded
 * and ready. Purely decorative, so it is hidden from assistive technology and takes no pointer events.
 * Narrow screens get the flat drawing inline in the Hero instead, and never load three.js.
 */
export default function HeroVisual({ labels, active }) {
  const { theme } = useTheme();
  const [env, setEnv] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = whenIdle(() => setEnv(readEnvironment()));
    return () => cancelIdle(id);
  }, []);

  const use3D = env ? can3D(env) : false;

  // the words that orbit the stack: the technologies used by the most projects
  const techs = useMemo(() => {
    const stack = deriveStack();
    const seen = new Set();
    return LAYERS.flatMap((layer) => stack[layer])
      .sort((a, b) => b.slugs.length - a.slugs.length)
      .filter(({ tech }) => !seen.has(tech) && seen.add(tech))
      .slice(0, 12)
      .map(({ tech }) => tech);
  }, []);

  return (
    <div
      className="pointer-events-none absolute inset-y-0 right-0 bottom-36 hidden w-[58%] [mask-image:linear-gradient(90deg,transparent,#000_22%)] lg:block"
      aria-hidden="true"
    >
      <div
        className={clsx(
          'absolute inset-0 grid place-items-center px-8 pt-[var(--spacing-header)] transition-opacity duration-700',
          ready ? 'opacity-0' : 'opacity-100'
        )}
      >
        <StackIllustration labels={labels} />
      </div>
      {use3D && (
        <Suspense fallback={null}>
          <div className={clsx('absolute inset-0 transition-opacity duration-700', ready ? 'opacity-100' : 'opacity-0')}>
            <StackScene
              mode="hero"
              labels={labels}
              techs={techs}
              active={active}
              quality={qualityTier(env)}
              theme={theme}
              getInput={getInput}
              getBurst={getBurst}
              onReady={() => setReady(true)}
            />
          </div>
        </Suspense>
      )}
    </div>
  );
}
