import { useEffect, useState } from 'react';
import { Music2 } from 'lucide-react';
import { clsx } from '../../../lib/format';
import { coverUrl } from './library';

/** A track's cover art, or a quiet placeholder when the file has none. Square; size comes from the className. */
export default function Cover({ track, className }) {
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

  return (
    <span className={clsx('relative grid shrink-0 place-items-center overflow-hidden rounded-sm bg-ink-3 text-bone-faint', className)}>
      {src ? <img src={src} alt="" className="size-full object-cover" /> : <Music2 size={18} aria-hidden="true" />}
    </span>
  );
}
