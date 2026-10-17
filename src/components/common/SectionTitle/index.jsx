import { Fragment } from 'react';
import { clsx } from '../../../lib/format';

/**
 * Section header: numbered label on a hairline, then a serif title whose lines rise
 * from behind a mask. `title` is an array of lines; the last line is emphasised.
 */
const SectionTitle = ({ index, label, title, lede, id }) => (
  <header className="mb-[clamp(40px,6vw,80px)] grid gap-7 min-[900px]:grid-cols-[5fr_4fr] min-[900px]:items-end min-[900px]:gap-x-16">
    <div
      className="flex items-center gap-4 border-b border-line pb-3.5 font-mono text-fine tracking-[0.08em] text-bone-dim uppercase min-[900px]:col-span-full"
      data-reveal
    >
      <span className="text-signal">{index}</span>
      <span>{label}</span>
    </div>

    <h2
      id={id}
      className="max-w-[18ch] font-display text-h2 min-[900px]:max-w-none"
      data-reveal="mask"
    >
      {title.map((line, i) => (
        <Fragment key={line}>
          {i > 0 && ' '}
          <span className="line-mask">
            <span className={clsx('line-inner', i === title.length - 1 && 'serif-accent')} style={{ '--i': i }}>
              {line}
            </span>
          </span>
        </Fragment>
      ))}
    </h2>

    {lede && (
      <p
        className="max-w-[58ch] text-lead leading-[1.55] text-bone-dim"
        data-reveal
        style={{ '--reveal-delay': '0.2s' }}
      >
        {lede}
      </p>
    )}
  </header>
);

export default SectionTitle;
