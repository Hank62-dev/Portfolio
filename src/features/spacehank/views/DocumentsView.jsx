import { useRef, useState } from 'react';
import { ArrowUpRight, FileText, FolderOpen, Upload } from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, PageHeader } from '../../../design-system';
import { uploadDocument } from '../api/rag';
import { spacehankConfig } from '../config';

const sizeLabel = (bytes) => `${Math.max(1, Math.round(bytes / 1024))} KB`;
const STATUS_TONE = { uploading: 'warn', indexed: 'ok', failed: 'danger' };

export default function DocumentsView({ onTab }) {
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const conversationId = useRef(`${spacehankConfig.sessionPrefix}-docs-${crypto.randomUUID()}`);

  const update = (record, patch) => setFiles((old) => old.map((item) => (item === record ? { ...item, ...patch } : item)));

  const onUpload = async (event) => {
    const selected = Array.from(event.target.files || []);
    event.target.value = '';
    if (!selected.length) return;
    setBusy(true);
    setError('');
    for (const file of selected) {
      const record = { name: file.name, size: sizeLabel(file.size), status: 'uploading' };
      setFiles((old) => [...old, record]);
      try {
        const chunks = await uploadDocument({ file, conversationId: conversationId.current });
        update(record, { status: 'indexed', chunks });
      } catch (uploadError) {
        update(record, { status: 'failed' });
        setError(uploadError.message);
      }
    }
    setBusy(false);
  };

  const choose = () => inputRef.current?.click();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="KNOWLEDGE VAULT"
        title="Document Vault"
        description="Upload documents directly into Hank RAG."
        actions={
          <Button size="sm" onClick={choose} loading={busy}>
            <Upload size={15} aria-hidden="true" /> {busy ? 'Indexing…' : 'Add documents'}
          </Button>
        }
      />
      <input ref={inputRef} hidden type="file" multiple accept={spacehankConfig.uploadAccept} onChange={onUpload} />
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <button
          type="button"
          onClick={choose}
          className="flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-line-strong bg-ink-1 px-6 py-14 text-center transition-colors hover:border-signal"
        >
          <Upload size={22} className="text-bone-faint" aria-hidden="true" />
          <h3 className="font-display text-h3 leading-tight">Upload to Hank's vault</h3>
          <p className="text-bone-dim">PDF, DOCX, TXT, MD, CSV or JSON</p>
          <span className="mt-2 font-mono text-fine text-signal">Choose files</span>
        </button>
        <Card>
          <CardHeader
            eyebrow="RAG INDEX"
            title={
              <>
                Uploaded documents <span className="font-mono text-fine text-bone-faint">{files.length}</span>
              </>
            }
          />
          {files.length ? (
            <ul className="flex flex-col">
              {files.map((file, index) => (
                <li className="flex items-center gap-3 border-t border-line py-3 first:border-t-0 first:pt-0" key={`${file.name}-${index}`}>
                  <FileText size={17} className="shrink-0 text-bone-faint" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <b className="block truncate text-fine font-medium">{file.name}</b>
                    <small className="font-mono text-[0.72rem] text-bone-faint">
                      {file.size}
                      {file.status === 'indexed' && ` - ${file.chunks} chunks indexed`}
                    </small>
                  </div>
                  <Badge tone={STATUS_TONE[file.status]}>{file.status.toUpperCase()}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={FolderOpen}
              title="No documents indexed in this session"
              action={
                <Button variant="link" onClick={() => onTab('rag')}>
                  Open Hank RAG <ArrowUpRight size={14} aria-hidden="true" />
                </Button>
              }
            />
          )}
          {error && <ErrorState className="mt-4" title="Upload failed" message={error} />}
        </Card>
      </div>
    </div>
  );
}
