import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { Placeholder } from '@tiptap/extensions';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import {
  ArrowLeft,
  Bold,
  CalendarDays,
  Check,
  Code2,
  Grid3x3,
  Heading1,
  Heading2,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Maximize2,
  Minimize2,
  Minus,
  Pin,
  PinOff,
  Quote,
  Redo2,
  Strikethrough,
  Table as TableIcon,
  Trash2,
  Undo2,
} from 'lucide-react';
import { Badge, Button } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { MOODS, tagsOf, textToHtml, titleOf } from './notes';
import { togglePin, updateNote } from './library';
import ScrollTopButton from './ScrollTopButton';
import { locale, tr } from '../lang';

const plain = (editor) => editor.getText({ blockSeparator: '\n' });

/** A web address the person typed, made safe: only http(s) and mailto, and a scheme added when it is missing. */
const normalizeLink = (value) => {
  const raw = value.trim();
  if (!raw) return '';
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  return /^(https?:|mailto:)/i.test(withScheme) ? withScheme : '';
};

function Tool({ label, active, disabled, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} // keep the selection in the editor
      onClick={onClick}
      className={clsx('grid size-8 place-items-center rounded-lg transition-colors disabled:opacity-35', active ? 'bg-signal text-ink-0' : 'text-bone-dim hover:bg-wash/10 hover:text-bone')}
    >
      {children}
    </button>
  );
}

function TableTool({ danger, onClick, children }) {
  return (
    <button type="button" onClick={onClick} className={clsx('h-8 rounded-lg px-2.5 font-mono text-[0.72rem] transition-colors', danger ? 'text-danger hover:bg-danger/10' : 'text-bone-dim hover:bg-wash/10 hover:text-bone')}>
      {children}
    </button>
  );
}

const Divider = () => <i className="mx-1 h-5 w-px bg-wash/10" aria-hidden="true" />;

/** The formatting bar: a floating pill that stays with you as you scroll the page. */
function Toolbar({ editor, full }) {
  const [link, setLink] = useState(null); // null: closed, otherwise the address being typed
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      strike: e.isActive('strike'),
      h1: e.isActive('heading', { level: 1 }),
      h2: e.isActive('heading', { level: 2 }),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      tasks: e.isActive('taskList'),
      quote: e.isActive('blockquote'),
      code: e.isActive('codeBlock'),
      inTable: e.isActive('table'),
      link: e.isActive('link'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const run = (chain) => () => chain(editor.chain().focus()).run();

  const applyLink = (event) => {
    event.preventDefault();
    const href = normalizeLink(link);
    const chain = editor.chain().focus().extendMarkRange('link');
    (href ? chain.setLink({ href }) : chain.unsetLink()).run();
    setLink(null);
  };

  return (
    <div className={clsx('sticky z-10 mx-auto flex w-fit max-w-full flex-col items-stretch', full ? 'top-0' : 'top-[4.5rem]')} role="toolbar" aria-label={tr('Formatting')}>
      <div className="flex flex-wrap items-center justify-center gap-0.5 rounded-xl border border-wash/10 bg-ink-1/80 p-1 shadow-[0_10px_40px_-10px_rgb(var(--shadow-rgb)/0.8)] backdrop-blur-xl">
        <Tool label={tr('Heading 1')} active={s.h1} onClick={run((c) => c.toggleHeading({ level: 1 }))}>
          <Heading1 size={16} aria-hidden="true" />
        </Tool>
        <Tool label={tr('Heading 2')} active={s.h2} onClick={run((c) => c.toggleHeading({ level: 2 }))}>
          <Heading2 size={16} aria-hidden="true" />
        </Tool>
        <Divider />
        <Tool label={tr('Bold')} active={s.bold} onClick={run((c) => c.toggleBold())}>
          <Bold size={15} aria-hidden="true" />
        </Tool>
        <Tool label={tr('Italic')} active={s.italic} onClick={run((c) => c.toggleItalic())}>
          <Italic size={15} aria-hidden="true" />
        </Tool>
        <Tool label={tr('Strikethrough')} active={s.strike} onClick={run((c) => c.toggleStrike())}>
          <Strikethrough size={15} aria-hidden="true" />
        </Tool>
        <Tool label={tr('Link')} active={s.link} onClick={() => setLink(editor.getAttributes('link').href ?? '')}>
          <Link2 size={15} aria-hidden="true" />
        </Tool>
        <Divider />
        <Tool label={tr('Bulleted list')} active={s.bullet} onClick={run((c) => c.toggleBulletList())}>
          <List size={16} aria-hidden="true" />
        </Tool>
        <Tool label={tr('Numbered list')} active={s.ordered} onClick={run((c) => c.toggleOrderedList())}>
          <ListOrdered size={16} aria-hidden="true" />
        </Tool>
        <Tool label={tr('Checklist')} active={s.tasks} onClick={run((c) => c.toggleTaskList())}>
          <ListChecks size={16} aria-hidden="true" />
        </Tool>
        <Tool label={tr('Quote')} active={s.quote} onClick={run((c) => c.toggleBlockquote())}>
          <Quote size={15} aria-hidden="true" />
        </Tool>
        <Tool label={tr('Code block')} active={s.code} onClick={run((c) => c.toggleCodeBlock())}>
          <Code2 size={16} aria-hidden="true" />
        </Tool>
        <Tool label={tr('Divider line')} onClick={run((c) => c.setHorizontalRule())}>
          <Minus size={16} aria-hidden="true" />
        </Tool>
        <Tool label={tr('Table (with a header row)')} active={s.inTable} onClick={run((c) => c.insertTable({ rows: 3, cols: 3, withHeaderRow: true }))}>
          <TableIcon size={16} aria-hidden="true" />
        </Tool>
        <Tool label={tr('Grid (plain cells)')} onClick={run((c) => c.insertTable({ rows: 3, cols: 3, withHeaderRow: false }))}>
          <Grid3x3 size={16} aria-hidden="true" />
        </Tool>
        <Divider />
        <Tool label={tr('Undo')} disabled={!s.canUndo} onClick={run((c) => c.undo())}>
          <Undo2 size={15} aria-hidden="true" />
        </Tool>
        <Tool label={tr('Redo')} disabled={!s.canRedo} onClick={run((c) => c.redo())}>
          <Redo2 size={15} aria-hidden="true" />
        </Tool>
      </div>

      {s.inTable && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-0.5 rounded-xl border border-wash/10 bg-ink-1/80 p-1 shadow-xl backdrop-blur-xl" aria-label={tr('Table')}>
          <TableTool onClick={run((c) => c.addRowAfter())}>{tr('+ Row')}</TableTool>
          <TableTool onClick={run((c) => c.addColumnAfter())}>{tr('+ Column')}</TableTool>
          <TableTool onClick={run((c) => c.deleteRow())}>{tr('− Row')}</TableTool>
          <TableTool onClick={run((c) => c.deleteColumn())}>{tr('− Column')}</TableTool>
          <TableTool onClick={run((c) => c.toggleHeaderRow())}>{tr('Header row')}</TableTool>
          <TableTool danger onClick={run((c) => c.deleteTable())}>{tr('Delete table')}</TableTool>
        </div>
      )}

      {link !== null && (
        <form onSubmit={applyLink} className="mt-2 flex items-center gap-2 rounded-xl border border-wash/10 bg-ink-1/90 p-1.5 pl-4 shadow-xl backdrop-blur-xl">
          <input
            autoFocus
            aria-label={tr('Link address')}
            placeholder={tr('https://… (empty removes the link)')}
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setLink(null)}
            className="h-8 min-w-0 flex-1 bg-transparent font-mono text-fine text-bone placeholder:text-bone-faint focus-visible:outline-none"
          />
          <Button type="submit" size="sm">
            {tr('Apply')}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setLink(null)}>
            {tr('Cancel')}
          </Button>
        </form>
      )}
    </div>
  );
}

const when = (time) => new Date(time).toLocaleString(locale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/**
 * One note as a page: rich text (headings, bold, lists, checklists, quotes, code, links) on a calm, centred sheet
 * with a floating toolbar, and a side rail with its details and related notes. It saves a moment after typing
 * stops. The note keeps the formatted `html` for the editor and a plain `text` copy that search, tags, titles and
 * "ask your notes" read, so the formatting never gets in their way.
 */
export default function NoteEditor({ note, related, onOpen, onBack, onDelete }) {
  const latest = useRef({ html: note.html ?? textToHtml(note.text), text: note.text });
  const timer = useRef(0);
  const [words, setWords] = useState(() => (note.text.trim() ? note.text.trim().split(/\s+/).length : 0));
  const [tags, setTags] = useState(() => tagsOf(note.text));
  const [state, setState] = useState('saved'); // saved | saving

  const saved = useRef(latest.current); // what is stored, so opening a note and closing it again writes nothing
  const save = () => {
    window.clearTimeout(timer.current);
    if (latest.current.html === saved.current.html && latest.current.text === saved.current.text) return;
    saved.current = latest.current;
    void updateNote(note.id, latest.current).then(() => setState('saved'));
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: { openOnClick: false, autolink: true } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder: tr('Start with a title, then write. Type # for a heading, - for a list, [ ] for a checklist, #tag to label it.') }),
    ],
    content: latest.current.html,
    editorProps: { attributes: { 'aria-label': tr('Note text'), class: 'rich-body' } },
    onUpdate: ({ editor: e }) => {
      const text = plain(e);
      latest.current = { html: e.getHTML(), text };
      setWords(text.trim() ? text.trim().split(/\s+/).length : 0);
      setTags(tagsOf(text));
      setState('saving');
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(save, 450);
    },
  });

  // leaving the note (or the tab) saves what is there
  useEffect(() => () => save(), []); // eslint-disable-line react-hooks/exhaustive-deps -- runs when this editor closes

  // Full screen: the note fills the whole screen, in the browser's own full screen where it has one (computers, tablets,
  // Android) and as a layer over the app where it does not (iPhone). Esc leaves it either way.
  const root = useRef(null);
  const native = useRef(false); // is it the browser's full screen, which also ends on its own (Esc, swipe)?
  const [full, setFull] = useState(false);
  const enterFull = () => {
    setFull(true);
    const ask = root.current?.requestFullscreen?.();
    if (ask) ask.then(() => (native.current = true)).catch(() => {});
  };
  const leaveFull = () => {
    setFull(false);
    if (native.current && document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    native.current = false;
  };
  useEffect(() => {
    if (!full) return undefined;
    const onChange = () => {
      if (native.current && !document.fullscreenElement) {
        native.current = false;
        setFull(false);
      }
    };
    const onKey = (event) => event.key === 'Escape' && !native.current && setFull(false);
    document.addEventListener('fullscreenchange', onChange);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      window.removeEventListener('keydown', onKey);
    };
  }, [full]);
  useEffect(
    () => () => {
      if (native.current && document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    },
    []
  );

  return (
    <div ref={root} className={clsx('flex flex-col gap-5', full && 'fixed inset-0 z-[88] overflow-y-auto bg-ink-0 px-4 py-4 sm:px-10 sm:py-8')} data-note-editor>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft size={14} aria-hidden="true" /> {tr('All notes')}
        </Button>
        <span className={clsx('flex items-center gap-1.5 font-mono text-[0.72rem]', state === 'saved' ? 'text-bone-faint' : 'text-warn')} role="status">
          {state === 'saved' ? <Check size={12} aria-hidden="true" /> : null}
          {state === 'saved' ? tr('Saved on this device') : tr('Saving…')}
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <Button variant="secondary" size="icon" aria-label={full ? tr('Exit full screen') : tr('Full screen')} title={full ? tr('Exit full screen') : tr('Full screen')} onClick={full ? leaveFull : enterFull}>
            {full ? <Minimize2 size={14} aria-hidden="true" /> : <Maximize2 size={14} aria-hidden="true" />}
          </Button>
          <Button variant="secondary" size="icon" aria-label={note.pinned ? tr('Unpin') : tr('Pin')} onClick={() => togglePin(note.id)}>
            {note.pinned ? <PinOff size={14} aria-hidden="true" /> : <Pin size={14} aria-hidden="true" />}
          </Button>
          <Button variant="danger" size="icon" aria-label={tr('Delete note')} onClick={onDelete}>
            <Trash2 size={14} aria-hidden="true" />
          </Button>
        </span>
      </div>

      <div className={clsx('grid grid-cols-1 items-start gap-6', !full && 'xl:grid-cols-[minmax(0,1fr)_260px]')}>
        <article className="flex min-w-0 flex-col gap-4">
          {editor && <Toolbar editor={editor} full={full} />}

          {note.day && (
            <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-2" role="group" aria-label={tr('Mood')}>
              <span className="font-mono text-fine text-bone-dim">{tr('How was today?')}</span>
              {MOODS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={note.mood === value}
                  onClick={() => updateNote(note.id, { mood: note.mood === value ? undefined : value })}
                  className={clsx('rounded-full border px-3 py-1 font-mono text-[0.72rem] transition-colors', note.mood === value ? 'border-signal bg-signal text-ink-0' : 'border-line text-bone-dim hover:border-line-strong')}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <div className={clsx('rich mx-auto w-full rounded-2xl border border-line bg-ink-1 px-6 py-8 shadow-[0_30px_80px_-40px_rgb(var(--shadow-rgb)/0.9)] focus-within:border-line-strong sm:px-12', full ? 'min-h-[calc(100dvh-9rem)] max-w-5xl' : 'min-h-[60vh] max-w-3xl')}>
            <EditorContent editor={editor} />
          </div>
        </article>

        <aside className="flex flex-col gap-4 xl:sticky xl:top-24" aria-label={tr('About this note')}>
          <section className="rounded-2xl border border-line bg-ink-1 p-4">
            <h2 className="mb-3 font-mono text-[0.68rem] tracking-[0.12em] text-bone-faint uppercase">{tr('Details')}</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 font-mono text-[0.78rem]">
              <dt className="text-bone-faint">{tr('Words')}</dt>
              <dd className="text-right text-bone tabular-nums">{words}</dd>
              <dt className="text-bone-faint">{tr('Created')}</dt>
              <dd className="text-right text-bone-dim">{when(note.createdAt)}</dd>
              <dt className="text-bone-faint">{tr('Edited')}</dt>
              <dd className="text-right text-bone-dim">{when(note.updatedAt)}</dd>
            </dl>
            {note.day && (
              <p className="mt-3 flex items-center gap-1.5 font-mono text-[0.72rem] text-signal">
                <CalendarDays size={12} aria-hidden="true" /> {tr('Journal ·')} {note.day}
              </p>
            )}
            {tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <Badge key={tag}>#{tag}</Badge>
                ))}
              </div>
            )}
          </section>

          {related.length > 0 && (
            <section className="rounded-2xl border border-line bg-ink-1 p-4">
              <h2 className="mb-2 font-mono text-[0.68rem] tracking-[0.12em] text-bone-faint uppercase">{tr('Related')}</h2>
              <ul className="flex flex-col gap-1">
                {related.map((r) => (
                  <li key={r.id}>
                    <button type="button" onClick={() => onOpen(r.id)} className="w-full rounded-lg px-2 py-1.5 text-left text-fine text-bone-dim transition-colors hover:bg-wash/5 hover:text-bone">
                      {titleOf(r.text)}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
      <ScrollTopButton container={full ? root.current : null} low={full} />
    </div>
  );
}
