import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { BookmarkPlus, Download, Heart, ImagePlus, LockKeyhole, Palette, RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, PageHeader, Spinner, Textarea } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { aiUsage, base64ToBlob, generateImage } from '../api/owner';
import { brandPrompt } from '../studio/brand';
import { STYLES, SHAPES, composePrompt, listImages, listPrompts, removeImage, removePrompt, saveImage, savePrompt, setImageFavorite } from '../studio/gallery';

const BrandKit = lazy(() => import('../studio/BrandKit'));

const TABS = [
  { id: 'images', label: 'Image Studio', icon: ImagePlus },
  { id: 'brand', label: 'Brand Kit', icon: Palette },
];

function Chip({ active, children, ...rest }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={clsx('rounded-full border px-3 py-1 font-mono text-fine transition-colors', active ? 'border-signal text-signal' : 'border-line text-bone-dim hover:border-line-strong hover:text-bone')}
      {...rest}
    >
      {children}
    </button>
  );
}

/** One picture, shown from the Blob that is stored on this device. */
function Picture({ record, onFavorite, onReuse, onRemove }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const next = URL.createObjectURL(record.blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [record.blob]);

  const extension = record.mime === 'image/jpeg' ? 'jpg' : record.mime === 'image/webp' ? 'webp' : 'png';
  return (
    <li className="group relative overflow-hidden rounded-card border border-line bg-ink-2" data-picture>
      {url && <img src={url} alt={record.prompt} className="aspect-square w-full object-cover" loading="lazy" />}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-ink-0/95 to-transparent p-2 pt-8 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100">
        <Button variant="secondary" size="icon" aria-label="Favorite" aria-pressed={record.favorite} className={record.favorite ? 'text-signal' : ''} onClick={() => onFavorite(record)}>
          <Heart size={14} fill={record.favorite ? 'currentColor' : 'none'} aria-hidden="true" />
        </Button>
        <a
          href={url}
          download={`hank62-${record.id.slice(0, 8)}.${extension}`}
          aria-label="Download"
          className="inline-flex size-9 items-center justify-center rounded-sm border border-line bg-ink-3 text-bone hover:border-line-strong"
        >
          <Download size={14} aria-hidden="true" />
        </a>
        <Button variant="secondary" size="icon" aria-label="Use this prompt again" onClick={() => onReuse(record.prompt)}>
          <RotateCcw size={14} aria-hidden="true" />
        </Button>
        <Button variant="danger" size="icon" aria-label="Delete picture" className="ml-auto" onClick={() => onRemove(record)}>
          <Trash2 size={14} aria-hidden="true" />
        </Button>
      </div>
    </li>
  );
}

function ImageStudio({ locked }) {
  const [text, setText] = useState('');
  const [style, setStyle] = useState('editorial');
  const [shape, setShape] = useState('square');
  const [brand, setBrand] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [images, setImages] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [usage, setUsage] = useState(null);
  const field = useRef(null);

  const refreshUsage = useCallback(() => {
    if (!locked) aiUsage().then(setUsage).catch(() => setUsage(null));
  }, [locked]);

  useEffect(() => {
    listImages().then(setImages).catch(() => {});
    listPrompts().then(setPrompts).catch(() => {});
    refreshUsage();
  }, [refreshUsage]);

  const generate = async (event) => {
    event.preventDefault();
    if (busy || !text.trim()) return;
    setBusy(true);
    setError('');
    const prompt = composePrompt({ text, style, shape, brand, brandText: brandPrompt() });
    try {
      const { data, mime } = await generateImage(prompt);
      const record = await saveImage({ prompt: text.trim(), blob: base64ToBlob(data, mime) });
      setImages((list) => [record, ...list]);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      refreshUsage();
    }
  };

  const [sampling, setSampling] = useState(false);
  const hasSamples = images.some((r) => r.sample);

  const addSamplePictures = async () => {
    setSampling(true);
    try {
      const { drawSamplePictures } = await import('../studio/sample');
      const made = await drawSamplePictures();
      const saved = [];
      for (const { prompt, blob } of made) saved.push(await saveImage({ prompt, blob, sample: true }));
      setImages((list) => [...saved.reverse(), ...list]);
    } finally {
      setSampling(false);
    }
  };

  const removeSamplePictures = async () => {
    const samples = images.filter((r) => r.sample);
    await Promise.all(samples.map((r) => removeImage(r.id)));
    setImages((list) => list.filter((r) => !r.sample));
  };

  const keepPrompt = async () => {
    const record = await savePrompt(text);
    setPrompts((list) => [record, ...list]);
  };

  const reuse = (prompt) => {
    setText(prompt);
    field.current?.focus();
  };

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[380px_1fr]">
      <div className="flex flex-col gap-4">
        <Card as="form" onSubmit={generate} className="flex flex-col gap-4">
          <CardHeader
            eyebrow="MAKE A PICTURE"
            title="Describe it"
            aside={locked ? <LockKeyhole size={17} aria-hidden="true" /> : usage ? <Badge tone={usage.image ? 'ok' : 'warn'} dot>{usage.image ? `${usage.used}/${usage.limit} today` : 'NO PROVIDER'}</Badge> : null}
          />
          <Textarea
            ref={field}
            aria-label="Describe the picture"
            rows={4}
            placeholder="A lighthouse at dusk above a calm grid of lights…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={locked}
            maxLength={600}
          />
          <fieldset className="flex flex-col gap-2" disabled={locked}>
            <legend className="mb-1 font-mono text-fine text-bone-dim">Look</legend>
            <div className="flex flex-wrap gap-1.5">
              {STYLES.map((s) => (
                <Chip key={s.id} active={style === s.id} onClick={() => setStyle(s.id)}>{s.label}</Chip>
              ))}
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-2" disabled={locked}>
            <legend className="mb-1 font-mono text-fine text-bone-dim">Shape</legend>
            <div className="flex flex-wrap gap-1.5">
              {SHAPES.map((s) => (
                <Chip key={s.id} active={shape === s.id} onClick={() => setShape(s.id)}>{s.label}</Chip>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center gap-2 font-mono text-fine text-bone-dim">
            <input type="checkbox" checked={brand} onChange={(e) => setBrand(e.target.checked)} disabled={locked} className="accent-[var(--color-signal)]" />
            On brand (use the workspace palette and mood)
          </label>
          <div className="flex gap-2">
            <Button type="submit" loading={busy} disabled={locked || !text.trim()} className="flex-1">
              <Sparkles size={15} aria-hidden="true" /> {busy ? 'Generating…' : 'Generate'}
            </Button>
            <Button type="button" variant="ghost" aria-label="Save this prompt" disabled={locked || !text.trim()} onClick={keepPrompt}>
              <BookmarkPlus size={15} aria-hidden="true" />
            </Button>
          </div>
          {locked && <p className="font-mono text-fine text-bone-faint">Image generation is for the owner. Sign in to use it. The Brand Kit tab works for everyone.</p>}
          {error && <ErrorState title="No picture this time" message={error} />}
        </Card>

        <Card>
          <CardHeader eyebrow="PROMPT LIBRARY" title="Saved prompts" />
          {prompts.length ? (
            <ul className="flex flex-col gap-1.5">
              {prompts.map((p) => (
                <li key={p.id} className="flex items-start gap-2 rounded-sm border border-line p-2">
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
          ) : (
            <p className="font-mono text-fine text-bone-faint">Prompts you save with the bookmark button appear here.</p>
          )}
        </Card>
      </div>

      <Card className="min-h-[360px]">
        <CardHeader
          eyebrow="GALLERY"
          title={`${images.length} on this device`}
          aside={
            busy ? (
              <Spinner label="Generating" />
            ) : hasSamples ? (
              <Button variant="ghost" size="sm" onClick={removeSamplePictures}>
                <Trash2 size={13} aria-hidden="true" /> Remove samples
              </Button>
            ) : null
          }
        />
        {images.length ? (
          <ul className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            {images.map((record) => (
              <Picture
                key={record.id}
                record={record}
                onReuse={reuse}
                onFavorite={async (r) => {
                  const next = await setImageFavorite(r, !r.favorite);
                  setImages((list) => list.map((x) => (x.id === r.id ? next : x)));
                }}
                onRemove={async (r) => {
                  await removeImage(r.id);
                  setImages((list) => list.filter((x) => x.id !== r.id));
                }}
              />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={ImagePlus}
            title="Nothing here yet"
            description="Pictures you make are kept in this browser only, and are never shown to guests."
            action={
              <Button variant="ghost" size="sm" loading={sampling} onClick={addSamplePictures}>
                <Sparkles size={14} aria-hidden="true" /> Try with sample pictures
              </Button>
            }
          />
        )}
      </Card>
    </div>
  );
}

export default function StudioView({ locked = false }) {
  const [tab, setTab] = useState('images');
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="DESIGN / STUDIO"
        title={
          <>
            Image <em>Studio.</em>
          </>
        }
        description="Make pictures that look like they belong, and keep the brand's tokens within reach."
        actions={
          <div className="flex gap-1" role="tablist" aria-label="Studio">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={clsx('inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 font-mono text-fine transition-colors', tab === id ? 'bg-ink-3 text-bone' : 'text-bone-dim hover:text-bone')}
              >
                <Icon size={14} aria-hidden="true" /> {label}
              </button>
            ))}
          </div>
        }
      />
      {tab === 'images' ? (
        <ImageStudio locked={locked} />
      ) : (
        <Suspense fallback={<Spinner label="Loading brand kit" />}>
          <BrandKit />
        </Suspense>
      )}
    </div>
  );
}
