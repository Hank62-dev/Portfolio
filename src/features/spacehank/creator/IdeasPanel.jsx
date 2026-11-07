import { tr } from '../lang';
import { useMemo, useState } from 'react';
import { Clapperboard, ListPlus, Lightbulb, Send, Sparkles, Trophy, Wand2 } from 'lucide-react';
import { Button, DatePicker, Input, Select, Textarea, pushToast } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { generateContent } from '../api/owner';
import { createDraft, startJob, useDraft, useJob } from '../jobs';
import { Segmented } from '../components/Page';
import { useStore } from '../store';
import { PLATFORMS, hashtagLine, hookFormulas, newPiece, rankHooks, scoreHook, scriptSheet, speakSeconds } from './model';
import { content, creatorSettings, setSetting } from './store';
import Teleprompter from './Teleprompter';
import { Chip, CopyButton, Label, Panel, Row } from './ui';

const TONE = { strong: 'text-ok', fair: 'text-warn', weak: 'text-danger' };
const BAR = { strong: 'bg-ok', fair: 'bg-warn', weak: 'bg-danger' };

/** A hook line with its score and the reasons for it. */
function ScoreMeter({ score, label }) {
  return (
    <span className="flex items-center gap-2" aria-label={tr('Score {0} of 100, {1}', score, label)}>
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-wash/10">
        <i className={clsx('block h-full rounded-full', BAR[label] ?? 'bg-bone-faint')} style={{ width: `${score}%` }} />
      </span>
      <b className={clsx('w-6 text-right font-mono text-[0.72rem] tabular-nums', TONE[label])}>{score}</b>
    </span>
  );
}

/** Type your own opening line and see how it scores, with the reason for every point. */
function HookLab({ value, onChange }) {
  const result = useMemo(() => scoreHook(value), [value]);
  return (
    <div className="flex flex-col gap-2.5" data-hook-lab>
      <Textarea aria-label={tr('Your opening line')} rows={2} placeholder={tr('Type the first line you will say…')} value={value} onChange={(e) => onChange(e.target.value)} />
      <div className="flex items-center justify-between gap-3">
        <ScoreMeter score={result.score} label={result.label} />
        <span className="font-mono text-[0.68rem] text-bone-faint">{tr('a rule of thumb, not a prediction')}</span>
      </div>
      <ul className="flex flex-col gap-1">
        {result.reasons.map((r, i) => (
          <li key={i} className={clsx('flex gap-2 text-[0.82rem] leading-snug', r.ok ? 'text-bone-dim' : 'text-warn')}>
            <span aria-hidden="true">{r.ok ? '+' : '–'}</span> {r.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

// What is typed and what came back live outside the tab, and the writing runs as a job: leaving for another tab neither loses
// the idea nor the pack the AI is still writing for it (see ../jobs.js).
const ideas = createDraft({ topic: '', seconds: '30', tone: '', pack: null, hook: '', platforms: ['tiktok'], date: '' });

/** From one idea to a content pack: hooks that are scored, a script in beats, a caption, a Discord post and a thread. */
export default function IdeasPanel({ onSaved }) {
  const settings = useStore(creatorSettings);
  const [topic, setTopic] = useDraft(ideas, 'topic');
  const [seconds, setSeconds] = useDraft(ideas, 'seconds');
  const [tone, setTone] = useDraft(ideas, 'tone');
  const job = useJob('creator-ideas');
  const busy = job.busy;
  const [notice, setNotice] = useState('');
  const error = notice || job.error;
  const [pack, setPack] = useDraft(ideas, 'pack'); // { hooks, script, caption, hashtags, discord, thread, source: 'ai' | 'formulas' }
  const [hook, setHook] = useDraft(ideas, 'hook');
  const [platforms, setPlatforms] = useDraft(ideas, 'platforms');
  const [date, setDate] = useDraft(ideas, 'date');
  const [prompter, setPrompter] = useState(false);

  const write = () => {
    setNotice('');
    const input = { topic, niche: settings.niche, audience: settings.audience, language: settings.language, tone, seconds: Number(seconds) };
    void startJob('creator-ideas', async () => {
      const result = await generateContent(input);
      const hooks = rankHooks(result.hooks);
      ideas.set({ pack: { ...result, hooks, source: 'ai' }, hook: hooks[0]?.text ?? '' }); // saved here, so it lands even if this tab is not on screen
    });
  };

  const quick = () => {
    const hooks = rankHooks(hookFormulas(topic, settings.language));
    if (!hooks.length) {
      setNotice(tr('Say what the video is about first.'));
      return;
    }
    setNotice('');
    setPack({ hooks, script: null, caption: '', hashtags: [], discord: '', thread: [], source: 'formulas' });
    setHook(hooks[0].text);
  };

  const prompterText = useMemo(() => {
    if (!pack) return hook;
    const beats = pack.script?.beats ?? [];
    return [hook, ...beats.slice(1).map((b) => b.say), pack.script?.cta].filter(Boolean).join('\n\n');
  }, [pack, hook]);

  const save = async () => {
    const at = date ? new Date(`${date}T09:00:00`).getTime() : null;
    await content.create(newPiece({ title: pack?.script?.title || topic, hook, platforms: platforms.length ? platforms : ['tiktok'], pack: pack?.source === 'ai' ? { script: pack.script, caption: pack.caption, hashtags: pack.hashtags, discord: pack.discord, thread: pack.thread } : null, scheduledAt: at }));
    pushToast(tr('Saved to the pipeline'), { tone: 'success' });
    onSaved?.();
  };

  const togglePlatform = (id) => setPlatforms((list) => (list.includes(id) ? list.filter((p) => p !== id) : [...list, id]));
  const everything = pack ? [hook, '', scriptSheet(pack.script), '', pack.caption, hashtagLine(pack.hashtags), '', pack.discord, '', ...(pack.thread ?? []).map((t, i) => `${i + 1}/ ${t}`)].filter((x) => x !== undefined).join('\n').trim() : '';

  return (
    <div className="flex flex-col gap-4" data-ideas>
      <Panel title={tr('What is the video about?')} icon={Lightbulb} hue={46} aside={<Segmented label={tr('Language')} value={settings.language} onChange={(language) => setSetting({ language })} options={[{ id: 'vi', label: tr('Tiếng Việt') }, { id: 'en', label: tr('English') }]} />}>
        <div className="flex flex-col gap-3">
          <Textarea aria-label={tr('Idea')} rows={3} placeholder={tr('e.g. Why my Discord bot kept crashing at 3am, and the one line that fixed it')} value={topic} onChange={(e) => setTopic(e.target.value)} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Row label={tr('Your niche')}>
              <Input aria-label={tr('Niche')} placeholder={tr('e.g. coding, student life')} value={settings.niche} onChange={(e) => setSetting({ niche: e.target.value })} compact />
            </Row>
            <Row label={tr('Who watches')}>
              <Input aria-label={tr('Audience')} placeholder={tr('e.g. beginner developers')} value={settings.audience} onChange={(e) => setSetting({ audience: e.target.value })} compact />
            </Row>
            <Row label={tr('Length')}>
              <Select aria-label={tr('Length')} value={seconds} onChange={(e) => setSeconds(e.target.value)} compact>
                {[15, 30, 45, 60, 90].map((s) => (
                  <option key={s} value={s}>
                    {s} {tr('seconds')}
                  </option>
                ))}
              </Select>
            </Row>
            <Row label={tr('Tone (optional)')}>
              <Input aria-label={tr('Tone')} placeholder={tr('funny, calm, direct…')} value={tone} onChange={(e) => setTone(e.target.value)} compact />
            </Row>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={write} loading={busy} disabled={topic.trim().length < 3} data-write-pack>
              <Sparkles size={15} aria-hidden="true" /> {tr('Write the pack with AI')}
            </Button>
            <Button variant="ghost" onClick={quick} disabled={!topic.trim()} data-quick-hooks>
              <Wand2 size={15} aria-hidden="true" /> {tr('Quick hooks, no AI')}
            </Button>
          </div>
          {error && (
            <p className="text-fine text-danger" role="alert">
              {error}
            </p>
          )}
          <p className="text-[0.76rem] leading-relaxed text-bone-faint">{tr('The AI is told never to promise income or invent stories or numbers. Where it needs a fact only you know it writes [brackets]: fill them in with what is true before you film.')}</p>
        </div>
      </Panel>

      {pack && (
        <>
          <Panel title={tr('Choose your opening line')} icon={Trophy} hue={22} aside={<span className="font-mono text-[0.68rem] text-bone-faint">{pack.source === 'ai' ? tr('written by AI') : tr('from hook formulas')}</span>}>
            <ul className="flex flex-col gap-2" role="radiogroup" aria-label={tr('Hooks')}>
              {pack.hooks.map((h, i) => (
                <li key={i}>
                  <button type="button" role="radio" aria-checked={hook === h.text} onClick={() => setHook(h.text)} className={clsx('flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-colors', hook === h.text ? 'border-bone bg-wash/[0.05]' : 'border-line hover:border-line-strong')}>
                    <span className="min-w-0 flex-1 text-fine leading-snug text-bone">{h.text}</span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <ScoreMeter score={h.score} label={h.label} />
                      {h.formula && <small className="font-mono text-[0.62rem] text-bone-faint">{h.formula}</small>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t border-line pt-4">
              <Label className="mb-2">{tr('Hook lab: edit it and watch the score')}</Label>
              <HookLab value={hook} onChange={setHook} />
            </div>
          </Panel>

          {pack.script && (
            <Panel title={pack.script.title || tr('The script')} icon={Clapperboard} hue={208} aside={<span className="font-mono text-[0.68rem] text-bone-faint">{tr('about')} {speakSeconds(prompterText)} {tr('s')}</span>}>
              <ol className="flex flex-col gap-2.5">
                <li className="rounded-2xl border border-bone/40 bg-wash/[0.04] p-3">
                  <Label>{tr('Hook · 0-3 s')}</Label>
                  <p className="mt-1 text-fine leading-snug text-bone">{hook}</p>
                </li>
                {pack.script.beats.slice(1).map((b, i) => (
                  <li key={i} className="rounded-2xl border border-line p-3">
                    <Label>{b.at}</Label>
                    <p className="mt-1 text-fine leading-snug text-bone">{b.say}</p>
                    {b.show && <p className="mt-1 text-[0.78rem] text-bone-faint">{tr('On screen:')} {b.show}</p>}
                  </li>
                ))}
                {pack.script.cta && (
                  <li className="rounded-2xl border border-signal/40 bg-signal/10 p-3">
                    <Label>{tr('Call to action')}</Label>
                    <p className="mt-1 text-fine leading-snug text-bone">{pack.script.cta}</p>
                  </li>
                )}
              </ol>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button onClick={() => setPrompter(true)} data-open-prompter>
                  <Clapperboard size={15} aria-hidden="true" /> {tr('Teleprompter')}
                </Button>
                <CopyButton text={scriptSheet({ ...pack.script, beats: [{ at: '0-3s', say: hook, show: '' }, ...pack.script.beats.slice(1)] })} label={tr('Copy script')} />
              </div>
            </Panel>
          )}

          {pack.source === 'formulas' && (
            <Button variant="ghost" onClick={() => setPrompter(true)} className="self-start">
              <Clapperboard size={15} aria-hidden="true" /> {tr('Open this line in the teleprompter')}
            </Button>
          )}

          {(pack.caption || pack.discord || pack.thread?.length > 0) && (
            <Panel title={tr('Ready to post')} icon={Send} hue={150}>
              <div className="flex flex-col gap-4">
                {pack.caption && (
                  <div>
                    <Label className="mb-1.5">{tr('Caption')}</Label>
                    <p className="text-fine leading-snug text-bone-dim">{pack.caption}</p>
                    {pack.hashtags.length > 0 && <p className="mt-1.5 text-[0.82rem] text-signal">{hashtagLine(pack.hashtags)}</p>}
                    <CopyButton className="mt-2" text={[pack.caption, hashtagLine(pack.hashtags)].filter(Boolean).join('\n')} label={tr('Copy caption')} />
                  </div>
                )}
                {pack.discord && (
                  <div>
                    <Label className="mb-1.5">{tr('Discord announcement')}</Label>
                    <p className="text-fine leading-snug whitespace-pre-line text-bone-dim">{pack.discord}</p>
                    <CopyButton className="mt-2" text={pack.discord} label={tr('Copy for Discord')} />
                  </div>
                )}
                {pack.thread?.length > 0 && (
                  <div>
                    <Label className="mb-1.5">{tr('Thread (X / Threads)')}</Label>
                    <ol className="flex flex-col gap-1.5">
                      {pack.thread.map((t, i) => (
                        <li key={i} className="text-fine leading-snug text-bone-dim">
                          <b className="mr-1.5 font-mono text-[0.7rem] text-bone-faint">{i + 1}/</b>
                          {t}
                        </li>
                      ))}
                    </ol>
                    <CopyButton className="mt-2" text={pack.thread.map((t, i) => `${i + 1}/ ${t}`).join('\n\n')} label={tr('Copy thread')} />
                  </div>
                )}
                <CopyButton text={everything} label={tr('Copy everything')} what={tr('Whole pack copied')} />
              </div>
            </Panel>
          )}

          <Panel title={tr('Keep it')} icon={ListPlus} hue={270}>
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-1.5" role="group" aria-label={tr('Platforms')}>
                {PLATFORMS.map((p) => (
                  <Chip key={p.id} on={platforms.includes(p.id)} onClick={() => togglePlatform(p.id)}>
                    {p.label}
                  </Chip>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <DatePicker aria-label={tr('Post on')} value={date} onChange={setDate} placeholder={tr('Post on… (optional)')} compact className="w-52" />
                <Button onClick={save} data-save-piece>
                  <ListPlus size={15} aria-hidden="true" /> {tr('Save to the pipeline')}
                </Button>
              </div>
            </div>
          </Panel>
        </>
      )}

      {prompter && <Teleprompter text={prompterText} onClose={() => setPrompter(false)} />}
    </div>
  );
}
