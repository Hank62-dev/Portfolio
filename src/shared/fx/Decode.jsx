import { useEffect, useRef } from 'react';
import { scrambleInto } from './scramble';

/**
 * Text that decodes into place out of random glyphs when it first shows and whenever it changes. Screen readers get the
 * real text at once (the flickering copy is hidden from them).
 */
export default function Decode({ text, as: Tag = 'span', className, delay = 0, duration }) {
  const ref = useRef(null);
  useEffect(() => scrambleInto(ref.current, String(text ?? ''), { delay, ...(duration ? { duration } : {}) }), [text, delay, duration]);
  return (
    <Tag className={className}>
      <span className="sr-only">{text}</span>
      <span ref={ref} aria-hidden="true" className="scramble">
        {text}
      </span>
    </Tag>
  );
}
