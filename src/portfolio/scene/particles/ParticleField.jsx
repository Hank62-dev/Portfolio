import { useEffect, useRef, useState } from 'react';
import { can3D, qualityTier, readEnvironment } from '../../lib/capabilities';
import { useActiveSection } from '../../hooks/useActiveSection';
import { useLang } from '../../i18n';
import { useTheme } from '../../../shared/lib/theme';
import { gsap } from '../../motion/gsap';
import { motionStore } from '../../motion/store';

const IDS = ['top', 'work', 'stack', 'lab', 'immersive', 'about', 'activity', 'whispers', 'contact'];
const WORD = { en: 'HELLO', vi: 'XIN CHÀO' };

const readColors = (theme) => {
  const css = getComputedStyle(document.documentElement);
  const get = (n, f) => css.getPropertyValue(n).trim() || f;
  return { cold: get('--color-bone', '#ece6da'), hot: get('--color-signal', '#ff5b2e'), additive: theme !== 'light' };
};

/**
 * The home page's dust (see createParticles): mounted only where the 3D hero would also run, and only
 * drawing while the page is visible. three.js is already in its own chunk for the hero; this reuses it.
 */
export default function ParticleField() {
  const host = useRef(null);
  const scene = useRef(null);
  const { theme } = useTheme();
  const { lang } = useLang();
  const [env, setEnv] = useState(null);
  const enabled = env ? can3D(env) : false;
  const active = useActiveSection(IDS, enabled);
  const activeNow = useRef(active);
  activeNow.current = active;

  useEffect(() => setEnv(readEnvironment()), []);

  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    let tick = null;
    let canvasEl = null;
    const onResize = () => scene.current?.resize();
    import('./createParticles').then(({ createParticles }) => {
      if (!alive || !host.current) return;
      // a canvas of its own each time: a context that was let go cannot be had again from the same element
      canvasEl = document.createElement('canvas');
      canvasEl.className = 'size-full';
      host.current.appendChild(canvasEl);
      const font = getComputedStyle(document.documentElement).getPropertyValue('--font-display').trim() || 'serif';
      scene.current = createParticles({
        canvas: canvasEl,
        count: qualityTier(env) === 'high' ? 9000 : 5000,
        word: WORD[document.documentElement.lang] ?? WORD.en,
        font,
        colors: readColors(document.documentElement.dataset.theme),
      });
      if (activeNow.current) scene.current.setSection(activeNow.current);
      const input = { pointerX: 0.5, pointerY: 0.5, velocity: 0, visibility: 1 };
      tick = (_, ms) => {
        if (document.hidden) return;
        input.pointerX += (motionStore.pointerX - input.pointerX) * 0.08;
        input.pointerY += (motionStore.pointerY - input.pointerY) * 0.08;
        input.velocity = motionStore.velocity;
        scene.current.frame(Math.min(0.05, ms / 1000), input);
      };
      gsap.ticker.add(tick);
      window.addEventListener('resize', onResize);
    });
    return () => {
      alive = false;
      if (tick) gsap.ticker.remove(tick);
      window.removeEventListener('resize', onResize);
      scene.current?.dispose();
      scene.current = null;
      canvasEl?.remove();
    };
  }, [enabled, env]);

  useEffect(() => {
    if (active) scene.current?.setSection(active);
  }, [active]);
  useEffect(() => scene.current?.setWord(WORD[lang] ?? WORD.en), [lang]);
  useEffect(() => {
    // the tokens change with the theme a frame later
    const id = requestAnimationFrame(() => scene.current?.setColors(readColors(theme)));
    return () => cancelAnimationFrame(id);
  }, [theme]);

  if (!enabled) return null;
  return <div ref={host} className="pointer-events-none fixed inset-0 -z-[8]" aria-hidden="true" />;
}
