import { CalendarCheck, NotebookPen, Sparkles } from 'lucide-react';
import { Button, Card, CardHeader } from '../../../design-system';
import { writeReview } from '../api/owner';
import { startJob, useDraft, useJob } from '../jobs';
import { getLang, tr } from '../lang';
import { createNote } from '../notes/library';
import { textToHtml } from '../notes/notes';
import { reviewDraft } from '../review/draft';
import { hasWeek, weekLabel, weekLines, weekStats } from '../review/model';

/**
 * The last seven days in a few lines counted on the device, and, when asked, a short review that Hank writes from those
 * numbers (only the numbers are sent). It can be kept as a note. The writing carries on if you go to another tab.
 */
export default function ReviewCard({ data, onNotify }) {
  const stats = weekStats(data);
  const [text] = useDraft(reviewDraft, 'text');
  const [week] = useDraft(reviewDraft, 'week');
  const job = useJob('week-review');
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

  return (
    <Card data-review>
      <CardHeader eyebrow={tr('WEEKLY REVIEW')} title={tr('The last 7 days')} aside={<CalendarCheck size={17} aria-hidden="true" />} />
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
        <Button variant={mine ? 'ghost' : 'primary'} size="sm" onClick={write} loading={job.busy} data-review-write>
          <Sparkles size={14} aria-hidden="true" /> {mine ? tr('Write it again') : tr('Ask Hank to write it')}
        </Button>
        {mine && (
          <Button variant="ghost" size="sm" onClick={save}>
            <NotebookPen size={14} aria-hidden="true" /> {tr('Save as a note')}
          </Button>
        )}
      </div>
    </Card>
  );
}
