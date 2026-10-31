import { useRef, useState } from 'react';
import { ArrowUpRight, FileText, FolderOpen, Plus, Search, Upload } from 'lucide-react';
import { uploadDocument } from '../api/rag';
import { spacehankConfig } from '../config';
import { EmptyState, SectionIntro } from '../components/ui';

const sizeLabel = (bytes) => `${Math.max(1, Math.round(bytes / 1024))} KB`;

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
    <div className="modern-page">
      <SectionIntro
        eyebrow="KNOWLEDGE VAULT"
        title="Document Vault"
        description="Upload documents directly into Hank RAG."
        action={
          <button className="primary-action" onClick={choose} disabled={busy}>
            <Upload size={16} /> {busy ? 'Indexing...' : 'Add documents'}
          </button>
        }
      />
      <input ref={inputRef} hidden type="file" multiple accept={spacehankConfig.uploadAccept} onChange={onUpload} />
      <section className="document-layout">
        <div className="surface-card dropzone" onClick={choose}>
          <div className="dropzone-icon">
            <Upload size={22} />
          </div>
          <h3>Upload to Hank's vault</h3>
          <p>PDF, DOCX, TXT, MD, CSV or JSON</p>
          <button className="secondary-action">
            <Plus size={15} /> Choose files
          </button>
        </div>
        <div className="surface-card document-list">
          <div className="card-heading">
            <div>
              <span className="eyebrow">RAG INDEX</span>
              <h3>
                Uploaded documents <em>{files.length}</em>
              </h3>
            </div>
            <Search size={17} />
          </div>
          {files.length ? (
            files.map((file, index) => (
              <div className="document-row" key={`${file.name}-${index}`}>
                <span className="file-icon">
                  <FileText size={17} />
                </span>
                <div>
                  <b>{file.name}</b>
                  <small>
                    {file.size} - {file.status === 'indexed' ? `${file.chunks} chunks indexed` : file.status}
                  </small>
                </div>
                <span className="indexing-pill">{file.status.toUpperCase()}</span>
              </div>
            ))
          ) : (
            <EmptyState icon={FolderOpen} size={25}>
              <p>No documents indexed in this session.</p>
              <button className="text-action" onClick={() => onTab('rag')}>
                Open Hank RAG <ArrowUpRight size={14} />
              </button>
            </EmptyState>
          )}
          {error && <p className="rag-inline-error">{error}</p>}
        </div>
      </section>
    </div>
  );
}
