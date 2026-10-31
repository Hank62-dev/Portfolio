import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { LAYERS, deriveStack } from '../../data/projects';
import { can3D, qualityTier, readEnvironment } from '../../lib/capabilities';
import { clsx } from '../../lib/format';
import { useTheme } from '../../lib/theme';
import { motionStore } from '../../motion/store';
import LayerDiagram from './LayerDiagram';
import { stackStore, useActiveLayer } from './stackStore';

const StackScene = lazy(() => import('../../scene/stack/StackScene'));

const getInput = () => ({ pointerX: motionStore.pointerX * 2 - 1, pointerY: motionStore.pointerY * 2 - 1, scroll: 0 });
const getActive = () => stackStore.active;

/**
 * The Stack section's sticky picture. The flat diagram is drawn first (and stays for people who cannot or
 * would rather not run WebGL); when the 3D scene is ready it takes over. The layer being scrolled to rises,
 * and the technologies of that layer orbit it.
 */
export default function StackVisual({ labels }) {
  const { theme } = useTheme();
  const activeLayer = useActiveLayer();
  const [env, setEnv] = useState(null);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    const read = () => setEnv(readEnvironment());
    const id = 'requestIdleCallback' in window ? window.requestIdleCallback(read, { timeout: 2000 }) : window.setTimeout(read, 400);
    return () => ('cancelIdleCallback' in window ? window.cancelIdleCallback(id) : window.clearTimeout(id));
  }, []);

  // draw frames only while the picture is on screen
  useEffect(() => {
    const el = box.current;
    if (!el || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '120px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const stack = useMemo(deriveStack, []);
  const techs = useMemo(() => stack[LAYERS[activeLayer]].slice(0, 8).map(({ tech }) => tech), [stack, activeLayer]);
  const use3D = env ? can3D(env) : false;

  return (
    <div ref={box} className="relative size-full">
      <div className={clsx('absolute inset-0 grid place-items-center transition-opacity duration-700', ready ? 'opacity-0' : 'opacity-100')}>
        <LayerDiagram labels={labels} />
      </div>
      {use3D && (
        <Suspense fallback={null}>
          <div className={clsx('absolute inset-0 transition-opacity duration-700', ready ? 'opacity-100' : 'opacity-0')}>
            <StackScene
              mode="stack"
              labels={labels}
              techs={techs}
              active={visible}
              quality={qualityTier(env)}
              theme={theme}
              getInput={getInput}
              getActive={getActive}
              onReady={() => setReady(true)}
            />
          </div>
        </Suspense>
      )}
    </div>
  );
}
