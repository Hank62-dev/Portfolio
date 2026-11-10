import { X } from 'lucide-react';
import { clsx } from '../../../shared/lib/format';
import { useStore } from '../../core/store';
import { tr } from '../../core/i18n/lang';
import { Cover, PlayButton, RateButton, Seek, SkipButton, SleepButton } from './Controls';
import { close, podcast } from './player';

// The episode that is playing, at the bottom of every tab: the podcast's counterpart of the music bar, and shown in its
// place while the episode is what was played last. On a phone it is a capsule above the tab bar, on a wider screen a
// bar along the bottom.

function Title({ onOpen, className }) {
  const title = useStore(podcast, (s) => s.episode?.title ?? '');
  const showTitle = useStore(podcast, (s) => s.show?.title ?? '');
  const image = useStore(podcast, (s) => s.episode?.image || s.show?.image || '');
  const error = useStore(podcast, (s) => s.error);
  return (
    <button type="button" onClick={onOpen} aria-label={tr('Open the podcast')} className={clsx('flex min-w-0 items-center gap-3 text-left', className)}>
      <Cover src={image} size={44} className="rounded-lg shadow-lg" />
      <span className="min-w-0 leading-tight">
        <b className="block truncate text-fine font-medium text-bone">{title}</b>
        <small className={clsx('block truncate font-mono text-[0.68rem]', error ? 'text-danger' : 'text-bone-faint')}>{error ? tr('Could not play this episode') : showTitle}</small>
      </span>
    </button>
  );
}

const Close = ({ className }) => (
  <button type="button" onClick={close} aria-label={tr('Stop and close the episode')} title={tr('Stop and close the episode')} className={clsx('grid size-8 shrink-0 place-items-center rounded-full text-bone-faint transition-colors hover:bg-wash/10 hover:text-bone', className)}>
    <X size={16} aria-hidden="true" />
  </button>
);

export default function PodcastBar({ onOpen, lifted = false, rail = false }) {
  const ratio = useStore(podcast, (s) => {
    const length = s.duration || s.episode?.duration || 0;
    return length > 0 ? Math.min(1, s.time / length) : 0;
  });

  if (lifted) {
    return (
      <div role="region" aria-label={tr('Now playing')} data-now-playing className="fixed inset-x-3 bottom-[calc(6.4rem+env(safe-area-inset-bottom))] z-30">
        <div className="relative flex items-center gap-1.5 overflow-hidden rounded-2xl border border-wash/12 bg-ink-1/85 p-1.5 pr-2 shadow-[0_20px_44px_-16px_rgb(var(--shadow-rgb)/0.95)] backdrop-blur-2xl">
          <Title onOpen={onOpen} className="flex-1 pl-0.5" />
          <SkipButton seconds={-15} small />
          <PlayButton size="sm" />
          <SkipButton seconds={30} small />
          <i className="absolute inset-x-3 bottom-0 h-0.5 overflow-hidden rounded-full bg-wash/10" aria-hidden="true">
            <b className="block h-full bg-signal transition-[width] duration-300" style={{ width: `${ratio * 100}%` }} />
          </i>
        </div>
      </div>
    );
  }

  return (
    <div role="region" aria-label={tr('Now playing')} data-now-playing className={clsx('fixed right-0 bottom-0 z-30 border-t border-line bg-ink-0/90 backdrop-blur-xl transition-[left] duration-300 ease-out-expo', rail ? 'left-[68px]' : 'left-64')}>
      <div className="mx-auto grid max-w-[1400px] grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)] items-center gap-6 px-5 py-2.5">
        <Title onOpen={onOpen} />
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <SkipButton seconds={-15} small />
            <PlayButton size="sm" />
            <SkipButton seconds={30} small />
          </div>
          <Seek compact className="w-full max-md:hidden" />
        </div>
        <div className="flex items-center justify-end gap-1.5">
          <SleepButton className="max-lg:hidden" />
          <RateButton />
          <Close />
        </div>
      </div>
    </div>
  );
}
