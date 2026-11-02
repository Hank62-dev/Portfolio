import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowUpRight, Check, FileJson, FileSpreadsheet, FileText, FolderOpen, Loader2, Trash2, Upload } from 'lucide-react';
import { Button } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { deleteDocument, listDocuments, uploadDocument } from '../api/rag';
import { spacehankConfig } from '../config';

const sizeLabel = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

// what kind of file it is: an icon, a short name and a colour, so a long list can be scanned at a glance
const KINDS = {
  pdf: { icon: FileText, label: 'PDF', hue: 8 },
  docx: { icon: FileText, label: 'DOCX', hue: 215 },
  txt: { icon: FileText, label: 'TXT', hue: 40 },
  md: { icon: FileText, label: 'MD', hue: 160 },
  csv: { icon: FileSpreadsheet, label: 'CSV', hue: 140 },
  json: { icon: FileJson, label: 'JSON', hue: 280 },
};
const kindOf = (name) => KINDS[name.split('.').pop().toLowerCase()] ?? { icon: FileText, label: 'FILE', hue: 220 };

const STATUS = {
  uploading: { icon: Loader2, text: 'Indexing…', tone: 'text-warn', spin: true },
  indexed: { icon: Check, text: 'Ready', tone: 'text-ok' },
  failed: { icon: AlertTriangle, text: 'Failed', tone: 'text-danger' },
};

function Stat({ value, label }) {
  return (
    <div className="rounded-2xl border border-line bg-ink-1 px-5 py-4">
      <b className="block font-display text-h3 leading-none text-bone tabular-nums">{value}</b>
      <small className="mt-1.5 block font-mono text-[0.68rem] tracking-[0.12em] text-bone-faint uppercase">{label}</small>
    </div>
  );
}

export default function DocumentsView({ onTab }) {
  const [library, setLibrary] = useState([]);
  const [files, setFiles] = useState([]); // uploads in flight or failed; finished ones move into the library
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [over, setOver] = useState(false);
  const inputRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      setLibrary(await listDocuments());
    } catch (listError) {
      setError(listError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const update = (record, patch) => setFiles((old) => old.map((item) => (item === record ? { ...item, ...patch } : item)));

  const ingest = async (selected) => {
    if (!selected.length) return;
    setBusy(true);
    setError('');
    for (const file of selected) {
      const record = { name: file.name, size: sizeLabel(file.size), bytes: file.size, status: 'uploading' };
      setFiles((old) => [record, ...old]);
      try {
        await uploadDocument({ file, conversationId: spacehankConfig.libraryScope });
        setFiles((old) => old.filter((item) => item !== record));
        await refresh();
      } catch (uploadError) {
        update(record, { status: 'failed' });
        setError(uploadError.message);
      }
    }
    setBusy(false);
  };

  const onUpload = (event) => {
    const selected = Array.from(event.target.files || []);
    event.target.value = '';
    void ingest(selected);
  };

  const remove = async (doc) => {
    setError('');
    try {
      await deleteDocument(doc.id);
      setLibrary((old) => old.filter((item) => item.id !== doc.id));
    } catch (removeError) {
      setError(removeError.message);
    }
  };

  const choose = () => inputRef.current?.click();
  const chunks = library.reduce((sum, doc) => sum + doc.chunks, 0);
  const pending = files.filter((f) => f.status === 'uploading');

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="font-mono text-[0.72rem] tracking-[0.14em] text-bone-faint uppercase">Knowledge vault</span>
          <h1 className="mt-2 font-display text-h2 leading-[1.05] text-bone">
            Document <em className="serif-accent">Vault.</em>
          </h1>
          <p className="mt-2 max-w-[60ch] text-bone-dim">Drop documents in and Hank answers from them in every chat, with sources. It still answers everything else too.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => onTab('rag')}>
          Ask Hank RAG <ArrowUpRight size={14} aria-hidden="true" />
        </Button>
      </header>

      <input ref={inputRef} hidden type="file" multiple accept={spacehankConfig.uploadAccept} onChange={onUpload} />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={(e) => e.currentTarget.contains(e.relatedTarget) || setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void ingest([...e.dataTransfer.files]);
        }}
      >
        <button
          type="button"
          onClick={choose}
          disabled={busy}
          className={clsx(
            'group relative flex w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl border-2 border-dashed px-6 py-14 text-center transition-all duration-500',
            over ? 'scale-[1.01] border-signal bg-signal-soft' : 'border-line-strong bg-[radial-gradient(60%_90%_at_50%_0%,rgb(255_91_46/0.1),transparent),var(--color-ink-1)] hover:border-signal/60'
          )}
        >
          <span className="relative grid size-16 place-items-center rounded-full bg-ink-3 text-signal">
            <i className="absolute inset-0 animate-ping rounded-full bg-signal/20 [animation-duration:2.6s]" aria-hidden="true" />
            {busy ? <Loader2 size={26} className="animate-spin" aria-hidden="true" /> : <Upload size={26} aria-hidden="true" />}
          </span>
          <h2 className="font-display text-h3 leading-tight text-bone">{busy ? 'Reading your documents…' : over ? 'Let go to add them' : "Drop documents into Hank's vault"}</h2>
          <p className="text-bone-dim">PDF, DOCX, TXT, MD, CSV or JSON, up to {spacehankConfig.maxUploadBytes / 1024 / 1024} MB each</p>
          <span className="rounded-full border border-line-strong px-4 py-1.5 font-mono text-fine text-bone transition-colors group-hover:border-signal group-hover:text-signal">Choose files</span>
        </button>
      </div>

      {error && (
        <p className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 font-mono text-fine text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Stat value={library.length} label="Documents" />
        <Stat value={chunks} label="Chunks indexed" />
        <Stat value={pending.length} label="Indexing now" />
      </div>

      {files.length + library.length ? (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Documents">
          {files.map((file, index) => {
            const kind = kindOf(file.name);
            const state = STATUS[file.status];
            const Icon = kind.icon;
            const StateIcon = state.icon;
            return (
              <li key={`${file.name}-${index}`} className="flex items-center gap-3.5 rounded-2xl border border-line bg-ink-1 p-3.5" data-doc>
                <span className="grid size-12 shrink-0 place-items-center rounded-xl" style={{ background: `hsl(${kind.hue} 60% 50% / 0.16)`, color: `hsl(${kind.hue} 85% 74%)` }}>
                  <Icon size={21} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <b className="block truncate text-fine font-medium text-bone">{file.name}</b>
                  <small className="font-mono text-[0.72rem] text-bone-faint">
                    {kind.label} · {file.size}
                  </small>
                </div>
                <span className={clsx('flex items-center gap-1 font-mono text-[0.72rem]', state.tone)}>
                  <StateIcon size={13} className={state.spin ? 'animate-spin' : ''} aria-hidden="true" /> {state.text}
                </span>
              </li>
            );
          })}
          {library.map((doc) => {
            const kind = kindOf(doc.name);
            const Icon = kind.icon;
            return (
              <li key={doc.id} className="group flex items-center gap-3.5 rounded-2xl border border-line bg-ink-1 p-3.5 transition-all hover:-translate-y-0.5 hover:border-line-strong" data-doc>
                <span className="grid size-12 shrink-0 place-items-center rounded-xl" style={{ background: `hsl(${kind.hue} 60% 50% / 0.16)`, color: `hsl(${kind.hue} 85% 74%)` }}>
                  <Icon size={21} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <b className="block truncate text-fine font-medium text-bone">{doc.name}</b>
                  <small className="font-mono text-[0.72rem] text-bone-faint">
                    {kind.label} · {doc.chunks} chunks
                  </small>
                </div>
                <span className="flex items-center gap-1 font-mono text-[0.72rem] text-ok group-hover:hidden">
                  <Check size={13} aria-hidden="true" /> Ready
                </span>
                <button type="button" onClick={() => remove(doc)} aria-label={`Remove ${doc.name}`} className="hidden size-8 place-items-center rounded-full text-bone-faint transition-colors hover:bg-danger/15 hover:text-danger focus-visible:grid group-hover:grid">
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-3xl border border-line bg-ink-1 px-6 py-10 text-center">
          {loading ? <Loader2 size={22} className="animate-spin text-bone-faint" aria-hidden="true" /> : <FolderOpen size={22} className="text-bone-faint" aria-hidden="true" />}
          <h2 className="font-display text-lead text-bone">{loading ? 'Opening the vault…' : 'The vault is empty'}</h2>
          <p className="max-w-sm text-fine text-bone-dim">What you add here is read, split into chunks and kept for good. Hank looks through it in every chat.</p>
        </div>
      )}
    </div>
  );
}
