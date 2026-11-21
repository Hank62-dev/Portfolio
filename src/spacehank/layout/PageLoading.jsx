import { Loading, Skeleton } from '../../shared/ui';
import { tr } from '../core/i18n/lang';

// While a tab's code arrives: a skeleton in the shape of the page that is coming, so the screen does not jump when it lands.

const Head = () => (
  <>
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-4 w-72 max-w-full" />
  </>
);

const SHAPES = {
  // a record and its title, the lyrics beside
  music: () => (
    <div className="grid items-center gap-8 md:grid-cols-[1fr_1fr]">
      <div className="flex flex-col items-center gap-5">
        <Skeleton className="aspect-square w-[min(22rem,70vw)] rounded-full" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-12 w-64 rounded-full" />
      </div>
      <div className="flex flex-col gap-3 max-md:hidden">
        {['w-[90%]', 'w-[70%]', 'w-[80%]', 'w-[60%]', 'w-[75%]'].map((w) => (
          <Skeleton key={w} className={`h-6 ${w}`} />
        ))}
      </div>
    </div>
  ),
  // a canvas with its tools along the side
  paint: () => (
    <div className="flex gap-3">
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="size-10 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[60vh] flex-1 rounded-3xl" />
    </div>
  ),
  // a list of notes and the open one
  notes: () => (
    <div className="grid gap-4 md:grid-cols-[18rem_1fr]">
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-[60vh] rounded-3xl max-md:hidden" />
    </div>
  ),
  // columns of cards
  missions: () => (
    <div className="grid gap-3 md:grid-cols-4">
      {[3, 2, 2, 1].map((n, c) => (
        <div key={c} className="flex flex-col gap-2">
          <Skeleton className="h-5 w-24" />
          {Array.from({ length: n }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ))}
    </div>
  ),
  // a month of days
  calendar: () => (
    <div className="grid grid-cols-7 gap-2">
      {Array.from({ length: 35 }, (_, i) => (
        <Skeleton key={i} className="aspect-square rounded-xl" />
      ))}
    </div>
  ),
  // a notebook page
  diary: () => (
    <div className="mx-auto flex w-full max-w-[34rem] flex-col gap-4">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-28 rounded-3xl" />
      <Skeleton className="h-40 rounded-3xl" />
      <Skeleton className="h-40 rounded-3xl" />
    </div>
  ),
  // a chat: messages from both sides and a box at the bottom
  rag: () => (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-14 w-2/3 rounded-2xl" />
      <Skeleton className="ml-auto h-10 w-1/2 rounded-2xl" />
      <Skeleton className="h-24 w-3/4 rounded-2xl" />
      <Skeleton className="mt-6 h-14 rounded-full" />
    </div>
  ),
};
SHAPES.podcast = SHAPES.music;
SHAPES.constellation = () => <Skeleton className="h-[65vh] rounded-3xl" />;
SHAPES.space = SHAPES.constellation;
SHAPES.studio = SHAPES.paint;

const Cards = () => (
  <div className="grid gap-3 md:grid-cols-3">
    <Skeleton className="h-40 rounded-3xl" />
    <Skeleton className="h-40 rounded-3xl" />
    <Skeleton className="h-40 rounded-3xl" />
  </div>
);

/** The skeleton of `tab` (a row of cards for a place without a shape of its own). */
export default function PageLoading({ tab }) {
  const Shape = SHAPES[tab] ?? Cards;
  return (
    <Loading label={tr('Loading')} className="flex flex-col gap-4 py-4">
      <Head />
      <Shape />
    </Loading>
  );
}
