import { useEffect, useRef } from 'react';
import { useTheme } from '../../../shared/lib/theme';
import { canMove } from '../../../shared/fx/gate';
import { useStore } from '../../core/store';
import { createWallpaper } from './engine';
import { sceneOf } from './scenes';
import { wallpaperState } from './store';

/** A scene drawn on a canvas that fills its box: live, or one still frame (`still`, or when less motion is wanted). */
export function WallpaperCanvas({ id, theme, still = false, cell, className = '' }) {
  const canvas = useRef(null);
  useEffect(() => {
    const scene = sceneOf(id);
    if (!canvas.current || !scene) return undefined;
    const paper = createWallpaper(canvas.current, scene, theme, { still: still || !canMove(), cell });
    return () => paper.dispose();
  }, [id, theme, still, cell]);
  return <canvas ref={canvas} aria-hidden="true" className={`block size-full ${className}`} />;
}

/** The chosen live wallpaper, behind the whole workspace (nothing when none is chosen). */
export default function Wallpaper() {
  const id = useStore(wallpaperState, (s) => s.id);
  const { theme } = useTheme();
  if (!sceneOf(id)) return null;
  return (
    <div className="wallpaper pointer-events-none fixed inset-0 z-0" aria-hidden="true">
      <WallpaperCanvas id={id} theme={theme} />
    </div>
  );
}
