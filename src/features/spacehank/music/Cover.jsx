import { useEffect, useState } from 'react';
import { Music2 } from 'lucide-react';
import { clsx } from '../../../lib/format';
import { coverUrl } from './library';

/**
 * A track's cover art, or a quiet placeholder when the file has none. The frame (square, or round with `rounded-full`) comes from the
 * className and the picture always fills it, cropped from the middle, however wide or tall the original is.
 */
export default function Cover({ track, className, rounded = 'rounded-sm' }) {
  const [src, setSrc] = useState('');
  const id = track?.id;
  const has = track?.hasCover;

  useEffect(() => {
    let live = true;
    setSrc('');
    if (id && has) coverUrl(id).then((url) => live && setSrc(url));
    return () => {
      live = false;
    };
  }, [id, has]);

  // the frame is positioned (the picture sits inside it), unless the caller places it itself, e.g. `absolute inset-[9%]`:
  // two position classes on one element fight, and whichever the stylesheet lists last wins, so only one is ever given
  const placed = /(^|\s)(absolute|fixed|sticky|relative)(\s|$)/.test(className ?? '');
  return (
    <span className={clsx('grid shrink-0 place-items-center overflow-hidden bg-ink-3 text-bone-faint', !placed && 'relative', rounded, className)}>
      {src ? <img src={src} alt="" draggable={false} className="absolute inset-0 size-full object-cover" /> : <Music2 size={18} aria-hidden="true" />}
    </span>
  );
}

const colours = new Map(); // cover url -> [r, g, b]

/** The average colour of a cover, ignoring near-black and near-white pixels, so headers can take its tint. */
const sample = (url) =>
  new Promise((resolve) => {
    if (colours.has(url)) return resolve(colours.get(url));
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 24;
        canvas.height = 24;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, 24, 24);
        const { data } = ctx.getImageData(0, 0, 24, 24);
        let r = 0;
        let g = 0;
        let b = 0;
        let n = 0;
        for (let i = 0; i < data.length; i += 4) {
          const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
          if (lum < 28 || lum > 235) continue;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          n += 1;
        }
        const out = n ? [Math.round(r / n), Math.round(g / n), Math.round(b / n)] : null;
        colours.set(url, out);
        resolve(out);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });

/** The tint of a track's cover as 'r g b' (for rgb(... / alpha) in styles), or the accent when there is none. */
export function useCoverTint(track) {
  const [tint, setTint] = useState('255 91 46');
  const id = track?.id;
  const has = track?.hasCover;
  useEffect(() => {
    let live = true;
    setTint('255 91 46');
    if (id && has) {
      coverUrl(id)
        .then((url) => url && sample(url))
        .then((rgb) => live && rgb && setTint(rgb.join(' ')));
    }
    return () => {
      live = false;
    };
  }, [id, has]);
  return tint;
}
