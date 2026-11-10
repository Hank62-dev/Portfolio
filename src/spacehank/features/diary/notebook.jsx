import { X } from 'lucide-react';
import { usePhoto } from './photos';
import { tr } from '../../core/i18n/lang';

// The notebook the diary is read and written in: the coil along the top and photos taped onto the page (styles: .nb-*).

const RINGS = Array.from({ length: 11 });

/** The spiral binding across the top of the page. */
export const Spiral = () => (
  <div className="nb-spiral" aria-hidden="true">
    {RINGS.map((_, i) => (
      <span key={i} />
    ))}
  </div>
);

// each picture leans its own way, the same way every time the page is opened
const TILTS = [-3, 2.5, -1.5, 3.5, -2.5, 1.5];

/**
 * A photo stuck on the page with a strip of tape. With `onOpen` tapping it opens it big; with `onRemove` it has a small cross
 * to take it off. `size`: "single" (one big picture), "half" (two to a row) or "small" (a row of them, while writing).
 */
export function Polaroid({ id, index = 0, size = 'half', onOpen, onRemove }) {
  const url = usePhoto(id);
  const picture = url && <img src={url} alt={tr('Ảnh kỷ niệm')} />;
  return (
    <span className="nb-photo" style={{ '--tilt': `${TILTS[index % TILTS.length]}deg` }} data-size={size}>
      <span className="nb-tape" aria-hidden="true" />
      {onOpen ? (
        <button type="button" onClick={onOpen} aria-label={tr('Xem ảnh lớn')} className="nb-photo-frame cursor-zoom-in">
          {picture}
        </button>
      ) : (
        <span className="nb-photo-frame">{picture}</span>
      )}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={tr('Bỏ ảnh này')} className="nb-photo-remove">
          <X size={13} aria-hidden="true" />
        </button>
      )}
    </span>
  );
}
