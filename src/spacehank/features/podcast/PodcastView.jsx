import { useEffect } from 'react';
import { PageHead, Segmented } from '../../ui/Page';
import { podcast, skip, toggle } from './player';
import { listens, shows } from './store';
import { podcastUi } from './ui';
import { useStore } from '../../core/store';
import { tr } from '../../core/i18n/lang';
import { NowPlaying } from './parts';
import { ShowPage } from './ShowPage';
import { Find } from './Find';
import { Library } from './Library';

/** Space plays or pauses, the arrows go back 15 and forward 30 seconds, while nothing is being typed. */
function useKeys() {
  useEffect(() => {
    const onKey = (event) => {
      if (!podcast.get().episode || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.target.closest?.('input, textarea, select, button, [contenteditable="true"], [role="dialog"]')) return;
      if (event.key === ' ') toggle();
      else if (event.key === 'ArrowLeft') skip(-15);
      else if (event.key === 'ArrowRight') skip(30);
      else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

export default function PodcastView() {
  const tab = useStore(podcastUi, (s) => s.tab);
  const open = useStore(podcastUi, (s) => s.open); // the show being looked at
  useKeys();

  useEffect(() => {
    void shows.load();
    void listens.load();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <PageHead eyebrow={tr('Listen')} title={tr('Pod')} accent="casts." description={tr('Follow the shows you like, listen at your own speed, and carry on exactly where you stopped, on any device.')} />
      <NowPlaying />
      {open ? (
        <ShowPage key={open.feedUrl} entry={open} />
      ) : (
        <>
          <Segmented label={tr('Podcasts')} value={tab} onChange={(value) => podcastUi.set({ tab: value })} options={[{ id: 'library', label: tr('My podcasts') }, { id: 'find', label: tr('Find') }]} round />
          {tab === 'library' ? <Library onFind={() => podcastUi.set({ tab: 'find' })} /> : <Find />}
        </>
      )}
    </div>
  );
}
