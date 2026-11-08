import { useState } from 'react';
import { CalendarCheck, NotebookPen, Play, Sparkles } from 'lucide-react';
import { Button, Card, CardHeader } from '../../../design-system';
import { writeReview } from '../api/owner';
import { startJob, useDraft, useJob } from '../jobs';
import { getLang, locale, tr } from '../lang';
import { createNote } from '../notes/library';
import { textToHtml } from '../notes/notes';
import { reviewDraft } from '../review/draft';
import { hasWeek, weekDays, weekLabel, weekLines, weekStats, weekWindow } from '../review/model';
import { wrappedSlides } from '../review/wrapped';
import WrappedStory from './WrappedStory';

/**
 * The last seven days in a few lines counted on the device, and, when asked, a short review that Hank writes from those
 * numbers (only the numbers are sent). It can be kept as a note. The writing carries on if you go to another tab.
 */
export default function ReviewCard({ data, onNotify }) {
  const stats = weekStats(data);
  const [text] = useDraft(reviewDraft, 'text');
  const [week] = useDraft(reviewDraft, 'week');
  const job = useJob('week-review');
  const [story, setStory] = useState(false);
  const label = weekLabel();
  if (!hasWeek(stats)) return null;
  const mine = week === label ? text : '';

  const write = () =>
    startJob('week-review', async () => {
      const { text: written } = await writeReview({ stats, language: getLang() });
      reviewDraft.set({ text: written, week: label });
    });

  const save = async () => {
    const body = `# ${tr('Weekly review')} ${label}\n\n${mine}`;
    await createNote(body, { html: textToHtml(body) });
    onNotify?.(tr('Saved to Second Brain'));
  };

  const { from, to } = weekWindow();
  const day = (t) => new Date(t).toLocaleDateString(locale(), { day: 'numeric', month: 'short' });
  const days = weekDays(data);
  const range = `${day(from)} – ${day(to - 1)}`;
  const slides = wrappedSlides(stats, { range, written: mine, days });
  // how busy each day was, for the little bars on the cover (the busiest one is lit)
  const busy = days.map((d) => d.tasks + d.habitsDone + (d.diary ? 1 : 0) + (d.spent > 0 ? 1 : 0));
  const top = Math.max(...busy);

  return (
    <Card data-review>
      <CardHeader eyebrow={tr('WEEKLY REVIEW')} title={tr('The last 7 days')} aside={<CalendarCheck size={17} aria-hidden="true" />} />
      <button type="button" className="week-cover mb-4" onClick={() => setStory(true)} data-review-story>
        <span className="flex min-w-0 items-center gap-3.5">
          <span className="week-cover-play">
            <Play size={18} fill="currentColor" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <b className="block truncate font-display text-lead leading-tight">{tr('Watch your week')}</b>
            <small className="mt-0.5 block font-mono text-[0.7rem] text-white/75">{range}</small>
          </span>
        </span>
        <span className="week-cover-bars" aria-hidden="true">
          {busy.map((n, i) => (
            <i key={days[i].key} data-peak={top > 0 && n === top ? '' : undefined} style={{ '--v': top > 0 ? n / top : 0.12, '--i': i }} />
          ))}
        </span>
      </button>
      <ul className="flex flex-col gap-1.5 text-fine text-bone-dim">
        {weekLines(stats).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {mine && (
        <p className="mt-4 rounded-sm border border-line bg-ink-2 p-3 text-fine leading-relaxed whitespace-pre-line text-bone" data-review-text>
          {mine}
        </p>
      )}
      {job.error && (
        <p role="alert" className="mt-3 text-fine text-danger">
          {job.error}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={write} loading={job.busy} data-review-write>
          <Sparkles size={14} aria-hidden="true" /> {mine ? tr('Write it again') : tr('Ask Hank to write it')}
        </Button>
        {mine && (
          <Button variant="ghost" size="sm" onClick={save}>
            <NotebookPen size={14} aria-hidden="true" /> {tr('Save as a note')}
          </Button>
        )}
      </div>
      <WrappedStory open={story} onClose={() => setStory(false)} slides={slides} onWrite={write} writing={job.busy} error={job.error} onSave={save} />
    </Card>
  );
}
