import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookmarkPlus, Download, Heart, ImagePlus, LockKeyhole, Palette, RotateCcw, Shapes, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { Badge, Button, Loading, Skeleton } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { aiUsage, base64ToBlob, generateImage } from '../api/owner';
import { intents } from '../notes/library';
import { useStore } from '../store';
import { COLORS, brandPrompt } from '../studio/brand';
import { SHAPES, STYLES, composePrompt, listImages, listPrompts, removeImage, removePrompt, saveImage, savePrompt, setImageFavorite } from '../studio/gallery';

const BrandKit = lazy(() => import('../studio/BrandKit'));

const TABS = [
  { id: 'images', label: 'Create', icon: Wand2 },
  { id: 'brand', label: 'Brand Kit', icon: Palette },
];

// What each look is like, as a little gradient, so choosing one is visual rather than a word on a chip
const LOOK = {
  editorial: 'linear-gradient(135deg,#1a1c21,#ece6da 140%)',
  render: 'linear-gradient(135deg,#ff8a5c,#5b2bff)',
  photo: 'linear-gradient(135deg,#2b3a55,#e8b07a)',
  icon: 'linear-gradient(135deg,#ff5b2e,#ffb38a)',
  abstract: 'linear-gradient(135deg,#00c2a8,#5b2bff 60%,#ff5b2e)',
};

const FRAME = { square: 'aspect-square', wide: 'aspect-video', tall: 'aspect-[9/16]' };

const IDEAS = [
  'A lighthouse at dusk above a calm grid of lights',
  'Four glass layers floating over a warm black desk',
  'A tiny orange sun rising behind a stack of books',
  'Hands building a wooden robot, soft studio light',
  'A city map drawn as hairlines with one glowing route',
];

function useObjectUrl(blob) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!blob) {
      setUrl('');
      return undefined;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}

const extensionOf = (mime) => (mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'png');

/** An on/off control with a label, as a real switch for keyboards and screen readers. */
function Switch({ checked, onChange, disabled, children }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 rounded-xl border border-line bg-ink-2 p-3 text-left transition-colors hover:border-line-strong disabled:opacity-50"
    >
      <span className={clsx('relative h-6 w-10 shrink-0 rounded-full transition-colors', checked ? 'bg-signal' : 'bg-white/15')}>
        <i className={clsx('absolute top-0.5 size-5 rounded-full bg-bone shadow transition-all', checked ? 'left-[1.15rem]' : 'left-0.5')} />
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  );
}

/** A square thumbnail in the history grid. */
function Thumb({ record, selected, onSelect }) {
  const url = useObjectUrl(record.blob);
  return (
    <li className="relative" data-picture>
      <button
        type="button"
        onClick={() => onSelect(record.id)}
        aria-label={`Open picture: ${record.prompt}`}
        aria-current={selected}
        className={clsx('group relative block aspect-square w-full overflow-hidden rounded-xl bg-ink-2 ring-2 transition-all hover:scale-[1.02]', selected ? 'ring-signal' : 'ring-transparent hover:ring-line-strong')}
      >
        {url && <img src={url} alt={record.prompt} className="size-full object-cover" loading="lazy" />}
        {record.favorite && (
          <span className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-black/55 text-signal backdrop-blur">
            <Heart size={12} fill="currentColor" aria-hidden="true" />
          </span>
        )}
      </button>
    </li>
  );
}

/** The big preview of the chosen picture, with its actions and the prompt that made it. */
function Stage({ record, busy, shape, onFavorite, onReuse, onRemove }) {
  const url = useObjectUrl(record?.blob);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!busy) return undefined;
    setSeconds(0);
    const timer = window.setInterval(() => setSeconds((n) => n + 1), 1000);
    return () => window.clearInterval(timer);
  }, [busy]);

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative grid min-h-[320px] w-full place-items-center overflow-hidden rounded-2xl border border-line bg-[radial-gradient(120%_90%_at_50%_0%,rgb(255_91_46/0.12),transparent_60%),var(--color-ink-1)]"
        data-stage
      >
        {record && url && !busy ? (
          <>
            <img src={url} alt={record.prompt} className="max-h-[62vh] w-auto max-w-full object-contain" />
            <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/70 to-transparent p-3 pt-10">
              <Button variant="secondary" size="icon" aria-label="Favorite" aria-pressed={record.favorite} className={record.favorite ? 'text-signal' : ''} onClick={() => onFavorite(record)}>
                <Heart size={15} fill={record.favorite ? 'currentColor' : 'none'} aria-hidden="true" />
              </Button>
              <a
                href={url}
                download={`hank62-${record.id.slice(0, 8)}.${extensionOf(record.mime)}`}
                aria-label="Download"
                className="inline-flex size-9 items-center justify-center rounded-sm border border-line bg-ink-3 text-bone hover:border-line-strong"
              >
                <Download size={15} aria-hidden="true" />
              </a>
              <Button variant="secondary" size="icon" aria-label="Use this prompt again" onClick={() => onReuse(record.prompt)}>
                <RotateCcw size={15} aria-hidden="true" />
              </Button>
              <Button variant="danger" size="icon" aria-label="Delete picture" className="ml-auto" onClick={() => onRemove(record)}>
                <Trash2 size={15} aria-hidden="true" />
              </Button>
            </div>
          </>
        ) : busy ? (
          <Loading label={`Painting the picture, ${seconds} seconds so far`} className={clsx('relative w-[min(420px,86%)] overflow-hidden rounded-xl bg-ink-2', FRAME[shape])}>
            <Skeleton className="absolute inset-0 rounded-xl opacity-70" />
            <i className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </Loading>
        ) : (
          <div className="flex max-w-xs flex-col items-center gap-3 p-8 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-signal-soft text-signal">
              <ImagePlus size={28} aria-hidden="true" />
            </span>
            <h2 className="font-display text-h3 leading-tight text-bone">Your picture appears here</h2>
            <p className="text-fine text-bone-dim">Describe it on the left, choose a look and press Generate.</p>
          </div>
        )}
      </div>
      {record && !busy && <p className="px-1 text-fine text-bone-dim">{record.prompt}</p>}
    </div>
  );
}

function Create({ locked }) {
  const [text, setText] = useState('');
  const [style, setStyle] = useState('editorial');
  const [shape, setShape] = useState('square');
  const [brand, setBrand] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [images, setImages] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [usage, setUsage] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [only, setOnly] = useState('all');
  const [sampling, setSampling] = useState(false);
  const field = useRef(null);

  // "Draft a picture of…" from the command palette lands here with the description filled in
  const intent = useStore(intents, (s) => s.studio);
  useEffect(() => {
    if (!intent) return;
    setText(intent.prompt);
    intents.set({ studio: null });
    field.current?.focus();
  }, [intent]);

  const refreshUsage = useCallback(() => {
    if (!locked) aiUsage().then(setUsage).catch(() => setUsage(null));
  }, [locked]);

  useEffect(() => {
    listImages()
      .then((list) => {
        setImages(list);
        setSelectedId((id) => id ?? list[0]?.id ?? null);
      })
      .catch(() => {});
    listPrompts().then(setPrompts).catch(() => {});
    refreshUsage();
  }, [refreshUsage]);

  const selected = images.find((r) => r.id === selectedId) ?? images[0] ?? null;
  const shown = useMemo(() => (only === 'favorites' ? images.filter((r) => r.favorite) : images), [images, only]);
  const hasSamples = images.some((r) => r.sample);

  const generate = async (event) => {
    event.preventDefault();
    if (busy || !text.trim() || locked) return;
    setBusy(true);
    setError('');
    const prompt = composePrompt({ text, style, shape, brand, brandText: brandPrompt() });
    try {
      const { data, mime } = await generateImage(prompt);
      const record = await saveImage({ prompt: text.trim(), blob: base64ToBlob(data, mime) });
      setImages((list) => [record, ...list]);
      setSelectedId(record.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      refreshUsage();
    }
  };

  const reuse = (prompt) => {
    setText(prompt);
    field.current?.focus();
  };

  const keepPrompt = async () => {
    const record = await savePrompt(text);
    setPrompts((list) => [record, ...list]);
  };

  const addSamplePictures = async () => {
    setSampling(true);
    try {
      const { drawSamplePictures } = await import('../studio/sample');
      const saved = [];
      for (const { prompt, blob } of await drawSamplePictures()) saved.push(await saveImage({ prompt, blob, sample: true }));
      setImages((list) => [...saved.reverse(), ...list]);
      setSelectedId((id) => id ?? saved[0]?.id ?? null);
    } finally {
      setSampling(false);
    }
  };

  const removeSamplePictures = async () => {
    await Promise.all(images.filter((r) => r.sample).map((r) => removeImage(r.id)));
    setImages((list) => list.filter((r) => !r.sample));
  };

  const toggleFavorite = async (record) => {
    const next = await setImageFavorite(record, !record.favorite);
    setImages((list) => list.map((x) => (x.id === record.id ? next : x)));
  };

  const remove = async (record) => {
    await removeImage(record.id);
    setImages((list) => list.filter((x) => x.id !== record.id));
    setSelectedId(null);
  };

  const budget = usage?.limit ? Math.min(100, (usage.used / usage.limit) * 100) : 0;

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[400px_minmax(0,1fr)]">
      {/* ───────── composer ───────── */}
      <form onSubmit={generate} className="flex flex-col gap-5 rounded-2xl border border-line bg-ink-1/80 p-5 backdrop-blur lg:sticky lg:top-24">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="studio-prompt" className="font-mono text-[0.72rem] tracking-[0.12em] text-bone-faint uppercase">
              Describe the picture
            </label>
            <span className="font-mono text-[0.68rem] text-bone-faint tabular-nums">{text.length}/600</span>
          </div>
          <textarea
            id="studio-prompt"
            ref={field}
            aria-label="Describe the picture"
            rows={3}
            maxLength={600}
            disabled={locked}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="A lighthouse at dusk above a calm grid of lights…"
            className="w-full resize-none rounded-xl border border-line bg-ink-2 p-3.5 text-body leading-relaxed text-bone placeholder:text-bone-faint focus-visible:border-signal focus-visible:outline-none disabled:opacity-50"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {IDEAS.slice(0, 3).map((idea) => (
              <button key={idea} type="button" disabled={locked} onClick={() => setText(idea)} className="max-w-full truncate rounded-full border border-line px-2.5 py-1 font-mono text-[0.68rem] text-bone-dim transition-colors hover:border-line-strong hover:text-bone disabled:opacity-50">
                {idea}
              </button>
            ))}
          </div>
        </div>

        <fieldset disabled={locked} className="flex flex-col gap-2">
          <legend className="mb-1 font-mono text-[0.72rem] tracking-[0.12em] text-bone-faint uppercase">Look</legend>
          <div className="grid grid-cols-5 gap-2">
            {STYLES.map((s) => (
              <button key={s.id} type="button" aria-pressed={style === s.id} onClick={() => setStyle(s.id)} className="group flex flex-col items-center gap-1.5">
                <span className={clsx('block aspect-square w-full rounded-xl ring-2 ring-offset-2 ring-offset-ink-1 transition-all group-hover:scale-105', style === s.id ? 'ring-signal' : 'ring-transparent')} style={{ background: LOOK[s.id] }} />
                <span className={clsx('font-mono text-[0.68rem]', style === s.id ? 'text-signal' : 'text-bone-dim')}>{s.label}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset disabled={locked} className="flex flex-col gap-2">
          <legend className="mb-1 font-mono text-[0.72rem] tracking-[0.12em] text-bone-faint uppercase">Shape</legend>
          <div className="grid grid-cols-3 gap-2">
            {SHAPES.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={shape === s.id}
                onClick={() => setShape(s.id)}
                className={clsx('flex flex-col items-center gap-2 rounded-xl border p-3 transition-colors', shape === s.id ? 'border-signal bg-signal-soft text-signal' : 'border-line text-bone-dim hover:border-line-strong')}
              >
                <i className={clsx('block rounded-sm border-2 border-current', s.id === 'square' ? 'h-6 w-6' : s.id === 'wide' ? 'h-5 w-9' : 'h-9 w-5')} />
                <span className="font-mono text-[0.68rem]">{s.label}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <Switch checked={brand} onChange={setBrand} disabled={locked}>
          <b className="block text-fine font-medium text-bone">On brand</b>
          <span className="flex items-center gap-1 pt-1">
            {['ink-1', 'bone', 'signal', 'bone-dim'].map((name) => (
              <i key={name} className="size-3.5 rounded-full ring-1 ring-white/15" style={{ background: COLORS.find((c) => c.name === name).hex }} />
            ))}
            <small className="pl-1 font-mono text-[0.68rem] text-bone-faint">workspace palette and mood</small>
          </span>
        </Switch>

        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={locked || busy || !text.trim()}
              className="relative flex h-12 flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-signal to-[#ff8a5c] font-mono text-fine font-semibold text-ink-0 shadow-[0_8px_30px_-8px_rgb(255_91_46/0.7)] transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
            >
              {busy ? <Skeleton className="h-3 w-24 rounded-full bg-ink-0/30" /> : <Sparkles size={16} aria-hidden="true" />}
              {busy ? <span className="sr-only">Generating</span> : 'Generate'}
            </button>
            <Button type="button" variant="ghost" aria-label="Save this prompt" className="h-12 w-12" disabled={locked || !text.trim()} onClick={keepPrompt}>
              <BookmarkPlus size={17} aria-hidden="true" />
            </Button>
          </div>
          {locked ? (
            <p className="flex items-center gap-2 font-mono text-fine text-bone-faint">
              <LockKeyhole size={13} aria-hidden="true" /> Generating is for the owner. The Brand Kit works for everyone.
            </p>
          ) : usage ? (
            <div className="flex items-center gap-3" title="Pictures and AI answers share one daily budget">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-line">
                <i className="block h-full rounded-full bg-signal transition-all" style={{ width: `${budget}%` }} />
              </div>
              <Badge tone={usage.image ? 'ok' : 'warn'} dot>
                {usage.image ? `${usage.used}/${usage.limit} today` : 'NO PROVIDER'}
              </Badge>
            </div>
          ) : null}
          {error && (
            <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 font-mono text-fine text-danger" role="alert">
              {error}
            </p>
          )}
        </div>

        {prompts.length > 0 && (
          <details className="group rounded-xl border border-line bg-ink-2 p-3" open>
            <summary className="flex cursor-pointer list-none items-center justify-between font-mono text-[0.72rem] tracking-[0.12em] text-bone-faint uppercase">
              Saved prompts <span className="text-bone-dim normal-case">{prompts.length}</span>
            </summary>
            <ul className="mt-2 flex flex-col gap-1.5">
              {prompts.map((p) => (
                <li key={p.id} className="flex items-start gap-2 rounded-lg bg-ink-1 p-2">
                  <button type="button" onClick={() => reuse(p.text)} className="min-w-0 flex-1 text-left text-fine text-bone-dim hover:text-bone">
                    {p.text}
                  </button>
                  <button
                    type="button"
                    aria-label="Delete saved prompt"
                    className="text-bone-faint hover:text-danger"
                    onClick={async () => {
                      await removePrompt(p.id);
                      setPrompts((list) => list.filter((x) => x.id !== p.id));
                    }}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </form>

      {/* ───────── stage and history ───────── */}
      <div className="flex min-w-0 flex-col gap-6">
        <Stage record={selected} busy={busy} shape={shape} onFavorite={toggleFavorite} onReuse={reuse} onRemove={remove} />

        <section aria-label="History">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="font-display text-h3 leading-none text-bone">History</h2>
            <span className="font-mono text-[0.72rem] text-bone-faint">{images.length} on this device</span>
            <span className="ml-auto flex items-center gap-1.5">
              {['all', 'favorites'].map((id) => (
                <button key={id} type="button" aria-pressed={only === id} onClick={() => setOnly(id)} className={clsx('rounded-full px-3 py-1 font-mono text-[0.72rem] capitalize transition-colors', only === id ? 'bg-bone text-ink-0' : 'bg-white/8 text-bone-dim hover:text-bone')}>
                  {id}
                </button>
              ))}
              {hasSamples && (
                <Button variant="ghost" size="sm" onClick={removeSamplePictures}>
                  <Trash2 size={13} aria-hidden="true" /> Remove samples
                </Button>
              )}
            </span>
          </div>
          {images.length ? (
            shown.length ? (
              <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-5">
                {shown.map((record) => (
                  <Thumb key={record.id} record={record} selected={selected?.id === record.id} onSelect={setSelectedId} />
                ))}
              </ul>
            ) : (
              <p className="font-mono text-fine text-bone-faint">No favorites yet. Open a picture and tap the heart.</p>
            )
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line p-8 text-center">
              <Shapes size={22} className="text-bone-faint" aria-hidden="true" />
              <p className="max-w-xs text-fine text-bone-dim">Pictures you make are kept in this browser only, and are never shown to guests.</p>
              <Button variant="ghost" size="sm" loading={sampling} onClick={addSamplePictures}>
                <Sparkles size={14} aria-hidden="true" /> Try with sample pictures
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function StudioView({ locked = false }) {
  const [tab, setTab] = useState('images');
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4 max-md:justify-start">
        <div className="max-md:hidden">
          <span className="font-mono text-[0.72rem] tracking-[0.14em] text-bone-faint uppercase">Design / Studio</span>
          <h1 className="mt-2 font-display text-h2 leading-[1.05] text-bone">
            Image <em className="serif-accent">Studio.</em>
          </h1>
          <p className="mt-2 max-w-[60ch] text-bone-dim">Make pictures that look like they belong, and keep the brand's tokens within reach.</p>
        </div>
        <div className="flex gap-1 rounded-full border border-line bg-ink-1/80 p-1 backdrop-blur" role="tablist" aria-label="Studio">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={clsx('inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 font-mono text-fine transition-colors', tab === id ? 'bg-bone text-ink-0' : 'text-bone-dim hover:text-bone')}
            >
              <Icon size={14} aria-hidden="true" /> {label}
            </button>
          ))}
        </div>
      </header>
      {tab === 'images' ? (
        <Create locked={locked} />
      ) : (
        <Suspense
          fallback={
            <Loading label="Loading the brand kit" className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-40 rounded-3xl" />
              <Skeleton className="h-40 rounded-3xl" />
            </Loading>
          }
        >
          <BrandKit />
        </Suspense>
      )}
    </div>
  );
}
