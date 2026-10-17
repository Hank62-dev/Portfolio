import { clsx } from '../../../lib/format';

const Tag = ({ children, tone = 'default' }) => (
  <span
    className={clsx(
      'inline-block rounded-full border px-[9px] py-[3px] font-mono text-[0.72rem] leading-normal whitespace-nowrap',
      tone === 'signal' ? 'border-signal text-signal' : 'border-line-strong text-bone-dim'
    )}
  >
    {children}
  </span>
);

export default Tag;
