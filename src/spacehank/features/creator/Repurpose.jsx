import { useState } from 'react';
import { Mail, Newspaper, Repeat2, Sparkles } from 'lucide-react';
import { Button, Dialog } from '../../../shared/ui';
import { useStore } from '../../core/store';
import { repurposeContent } from '../../core/api/owner';
import { tr } from '../../core/i18n/lang';
import { hashtagLine, spokenText } from './model';
import { content, creatorSettings } from './store';
import { CopyButton, Label, PlatformTag } from './ui';

/** One piece of the output: a title, the text as it will be posted, and a copy button. */
function Out({ label, platform, text }) {
  if (!text) return null;
  return (
    <div className="cl-card rounded-2xl border border-line p-3.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        {platform ? <PlatformTag id={platform} label={label} /> : <Label>{label}</Label>}
        <CopyButton text={text} label={tr('Copy')} what={tr('{0} copied', label)} />
      </div>
      <p className="max-h-60 overflow-y-auto text-[0.85rem] leading-relaxed whitespace-pre-line text-bone">{text}</p>
    </div>
  );
}

/**
 * One video made into everything around it: captions for TikTok, Reels and Shorts, a Facebook post, a thread, a blog post and
 * a newsletter. Kept with the piece, so it is there next time.
 */
export default function Repurpose({ piece, onClose }) {
  const settings = useStore(creatorSettings);
  const [out, setOut] = useState(piece.repurposed ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const make = async () => {
    setBusy(true);
    setError('');
    try {
      const script = piece.pack?.script ? spokenText(piece.pack.script) : [piece.hook, piece.notes].filter(Boolean).join('\n\n');
      const result = await repurposeContent({ title: piece.title, script, language: settings.language, niche: settings.niche, audience: settings.audience });
      setOut(result);
      await content.update(piece.id, { repurposed: result });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const tags = out?.hashtags?.length ? `\n\n${hashtagLine(out.hashtags)}` : '';

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()} eyebrow={tr('ONE VIDEO, EVERYWHERE')} title={piece.title} description={tr('Captions for each platform, a thread, a blog post and a newsletter, from what the video says. Read each one before it goes out.')}>
      <div className="flex flex-col gap-3" data-repurpose>
        <Button onClick={make} disabled={busy} className="w-full justify-center" data-make-repurpose>
          {out ? <Repeat2 size={15} aria-hidden="true" /> : <Sparkles size={15} aria-hidden="true" />} {busy ? tr('Writing…') : out ? tr('Write them again') : tr('Write them')}
        </Button>
        {error && (
          <p className="text-fine text-danger" role="alert">
            {error}
          </p>
        )}
        {out && (
          <>
            <Out label={tr('TikTok')} platform="tiktok" text={out.tiktok + tags} />
            <Out label={tr('Reels')} platform="reels" text={out.reels + tags} />
            <Out label={tr('YouTube Shorts')} platform="shorts" text={[out.shorts?.title, out.shorts?.description].filter(Boolean).join('\n\n')} />
            <Out label={tr('Facebook')} text={out.facebook} />
            <Out label={tr('X / Threads')} platform="x" text={out.thread?.map((t, i) => `${i + 1}/ ${t}`).join('\n\n')} />
            {out.blog?.body && (
              <div className="cl-card rounded-2xl border border-line p-3.5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Label className="flex items-center gap-1.5">
                    <Newspaper size={12} aria-hidden="true" /> {tr('Blog post')}
                  </Label>
                  <CopyButton text={`# ${out.blog.title}\n\n${out.blog.body}`} label={tr('Copy')} what={tr('Blog post copied')} />
                </div>
                <b className="font-display text-[1.2rem] font-normal text-bone">{out.blog.title}</b>
                <p className="mt-2 max-h-60 overflow-y-auto text-[0.85rem] leading-relaxed whitespace-pre-line text-bone-dim">{out.blog.body}</p>
              </div>
            )}
            {out.newsletter?.body && (
              <div className="cl-card rounded-2xl border border-line p-3.5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Label className="flex items-center gap-1.5">
                    <Mail size={12} aria-hidden="true" /> {tr('Newsletter')}
                  </Label>
                  <CopyButton text={`${out.newsletter.subject}\n\n${out.newsletter.body}`} label={tr('Copy')} what={tr('Newsletter copied')} />
                </div>
                <b className="text-fine text-bone">{out.newsletter.subject}</b>
                <p className="mt-2 text-[0.85rem] leading-relaxed whitespace-pre-line text-bone-dim">{out.newsletter.body}</p>
              </div>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}
