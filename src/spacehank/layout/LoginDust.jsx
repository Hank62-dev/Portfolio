import { useEffect, useRef } from 'react';
import { createParticleText } from '../../shared/fx/particleText';
import { useTheme } from '../../shared/lib/theme';
import { sound } from '../core/sound';

/**
 * The name of the workspace over the sign-in card, as dust (shared/fx/particleText): it gathers out of a slow swirl, shies
 * from the pointer or a finger and bursts on a tap. Nothing is drawn where less motion is wanted (the logo and the heading
 * of the card are still there).
 */
export default function LoginDust({ text = 'SPACEHANK' }) {
  const host = useRef(null);
  const { theme } = useTheme();

  useEffect(() => {
    const el = host.current;
    if (!el) return undefined;
    const canvas = document.createElement('canvas');
    el.appendChild(canvas);
    const css = getComputedStyle(document.documentElement);
    const bone = css.getPropertyValue('--color-bone').trim() || '#ece6da';
    const signal = css.getPropertyValue('--color-signal').trim() || '#ff5b2e';
    const font = `${css.getPropertyValue('--font-display').trim() || 'serif'}`;
    const dust = createParticleText(canvas, { text, font: `500 {size}px ${font}`, colors: [bone, signal], maxSize: 180, onTap: () => sound.tap() });
    if (!dust) canvas.remove();
    return () => {
      dust?.dispose();
      canvas.remove();
    };
  }, [text, theme]);

  return <div ref={host} className="login-dust" aria-hidden="true" />;
}
