import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { Placeholder } from '@tiptap/extensions';
import { ArrowUpRight, ChevronDown, ChevronUp, Palette, PictureInPicture2, Undo2, X } from 'lucide-react';
import { clsx } from '../../../lib/format';
import { useStore } from '../store';
import { tr } from '../lang';
import { useReadableNotes } from '../diary/useLock';
import { deleteNote, loadNotes, notesStore, updateNote } from './library';
import { textToHtml, titleOf } from './notes';
import { bringToFront, dropMissing, nextColor, patchSticky, refitStickies, stickies, unfloat } from './stickies';
import { canPopOut, pip, popIn, popOut } from './stickyPip';

// The sticky notes that float over every tab: each is a note on a square of coloured paper that can be moved by its
// top edge, resized by its corner, folded down to its title, recoloured, opened in Second Brain or put away.

const PAPER = {
  yellow: '#fbe7a1',
  pink: '#f9c9d4',
  green: '#c9ebc4',
  blue: '#c4dcf5',
  violet: '#dccdf5',
  paper: '#efe8da',
};

// inside a sticky the text is dark ink on light paper: the colour tokens are set again for its subtree only, so the
// editor's own styles (headings, lists, checkboxes) follow without a second set of rules
const ink = (color) => ({
  background: PAPER[color] ?? PAPER.yellow,
  colorScheme: 'light', // the checkboxes and scrollbars of light paper
  '--color-bone': '#2a2419',
  '--color-bone-dim': '#4b4233',
  '--color-bone-faint': '#7d705b',
  '--color-signal': '#b0441c',
  '--color-line': 'rgb(42 36 25 / 0.14)',
  '--color-wash': '#2a2419',
});

const plain = (editor) => editor.getText({ blockSeparator: '\n' });

/** Follows a pointer from `pointerdown` until it is let go, calling `onMove(dx, dy)` and then `onEnd(dx, dy)`. */
const follow = (event, onMove, onEnd) => {
  const start = { x: event.clientX, y: event.clientY };
  const target = event.currentTarget;
  target.setPointerCapture?.(event.pointerId);
  const move = (e) => onMove(e.clientX - start.x, e.clientY - start.y);
  const up = (e) => {
    target.removeEventListener('pointermove', move);
    target.removeEventListener('pointerup', up);
    target.removeEventListener('pointercancel', up);
    onEnd(e.clientX - start.x, e.clientY - start.y);
  };
  target.addEventListener('pointermove', move);
  target.addEventListener('pointerup', up);
  target.addEventListener('pointercancel', up);
};

function Sticky({ sticky, note, top, onOpenNote, popped = false }) {
  const [live, setLive] = useState(null); // the place and size while a drag is under way, so the store is written once at the end
  const saved = useRef({ html: note.html ?? textToHtml(note.text), text: note.text });
  const timer = useRef(0);

  const save = (next) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (next.html === saved.current.html && next.text === saved.current.text) return;
      saved.current = next;
      void updateNote(note.id, next);
    }, 450);
  };

  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: { openOnClick: false, autolink: true } }), TaskList, TaskItem.configure({ nested: true }), Placeholder.configure({ placeholder: tr('Write here…') })],
    content: saved.current.html,
    editorProps: { attributes: { 'aria-label': tr('Sticky note text'), class: 'rich-body' } },
    onUpdate: ({ editor: e }) => save({ html: e.getHTML(), text: plain(e) }),
  });

  // the same note changed somewhere else (in Second Brain, or on another device): show it here, unless it is being typed in
  useEffect(() => {
    if (!editor || editor.isFocused) return;
    const html = note.html ?? textToHtml(note.text);
    if (html === saved.current.html) return;
    saved.current = { html, text: note.text };
    editor.commands.setContent(html, { emitUpdate: false });
  }, [editor, note.html, note.text]);

  // moved into the floating window, the editor has to look up which document it now lives in
  useEffect(() => {
    if (popped && editor && !editor.isDestroyed) editor.view.updateRoot?.();
  }, [popped, editor]);

  // whatever was typed is written when the sticky goes away
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      if (!editor || editor.isDestroyed) return;
      const next = { html: editor.getHTML(), text: plain(editor) };
      if (next.html !== saved.current.html) void updateNote(note.id, next);
    },
    [editor, note.id]
  );

  const box = live ?? sticky;
  const drag = (event) => {
    if (event.button !== 0 || event.target.closest('button')) return;
    event.preventDefault();
    follow(
      event,
      (dx, dy) => setLive({ ...sticky, x: sticky.x + dx, y: sticky.y + dy }),
      (dx, dy) => {
        setLive(null);
        if (dx || dy) patchSticky(sticky.id, { x: sticky.x + dx, y: sticky.y + dy });
      }
    );
  };
  const resize = (event) => {
    event.preventDefault();
    event.stopPropagation();
    follow(
      event,
      (dx, dy) => setLive({ ...sticky, w: Math.max(200, sticky.w + dx), h: Math.max(140, sticky.h + dy) }),
      (dx, dy) => {
        setLive(null);
        patchSticky(sticky.id, { w: sticky.w + dx, h: sticky.h + dy });
      }
    );
  };

  // a sticky put away before anything was written in it leaves no empty note behind
  const putAway = () => {
    const empty = !note.text.trim() && !(editor && plain(editor).trim());
    if (popped) popIn();
    unfloat(sticky.id);
    if (empty) void deleteNote(note.id);
  };

  const title = titleOf(note.text);
  const icon = 'grid size-7 shrink-0 place-items-center rounded-full text-bone-dim transition-colors hover:bg-wash/10 hover:text-bone';
  return (
    <section
      role="dialog"
      aria-label={tr('Sticky note: {0}', title)}
      onPointerDown={() => !top && !popped && bringToFront(sticky.id)}
      className={clsx(
        'rich pointer-events-auto fixed flex flex-col overflow-hidden text-bone',
        popped ? 'inset-0' : clsx('rounded-md shadow-[0_18px_40px_-14px_rgb(0_0_0/0.6),0_2px_6px_rgb(0_0_0/0.18)] transition-shadow', live && 'shadow-[0_28px_60px_-14px_rgb(0_0_0/0.7)]', top ? 'ring-1 ring-black/10' : 'opacity-[0.97]')
      )}
      style={popped ? ink(sticky.color) : { ...ink(sticky.color), left: box.x, top: box.y, width: sticky.min ? Math.min(box.w, 240) : box.w, height: sticky.min ? 'auto' : box.h }}
      data-sticky={sticky.id}
    >
      <header onPointerDown={popped ? undefined : drag} className={clsx('flex h-10 shrink-0 touch-none items-center gap-0.5 border-b border-line bg-black/[0.04] pr-1.5 pl-3 select-none', !popped && 'cursor-grab active:cursor-grabbing')}>
        <span className="min-w-0 flex-1 truncate font-mono text-[0.7rem] font-medium tracking-wide text-bone-dim">{note.text.trim() ? title : tr('New sticky note')}</span>
        <button type="button" className={icon} onClick={() => patchSticky(sticky.id, { color: nextColor(sticky.color) })} aria-label={tr('Change colour')} title={tr('Change colour')}>
          <Palette size={14} aria-hidden="true" />
        </button>
        {popped ? (
          <button type="button" className={icon} onClick={popIn} aria-label={tr('Back into the app')} title={tr('Back into the app')}>
            <Undo2 size={14} aria-hidden="true" />
          </button>
        ) : (
          <>
            {canPopOut() && (
              <button type="button" className={icon} onClick={() => void popOut(sticky.id, { w: sticky.w, h: sticky.min ? 220 : sticky.h })} aria-label={tr('Float over other apps')} title={tr('Float over other apps (while this tab stays open)')}>
                <PictureInPicture2 size={14} aria-hidden="true" />
              </button>
            )}
            <button type="button" className={icon} onClick={() => patchSticky(sticky.id, { min: !sticky.min })} aria-label={sticky.min ? tr('Unfold') : tr('Fold')} title={sticky.min ? tr('Unfold') : tr('Fold')} aria-expanded={!sticky.min}>
              {sticky.min ? <ChevronDown size={15} aria-hidden="true" /> : <ChevronUp size={15} aria-hidden="true" />}
            </button>
          </>
        )}
        <button
          type="button"
          className={icon}
          onClick={() => {
            if (popped) window.focus();
            onOpenNote(note.id);
          }}
          aria-label={tr('Open in Second Brain')}
          title={tr('Open in Second Brain')}
        >
          <ArrowUpRight size={14} aria-hidden="true" />
        </button>
        <button type="button" className={icon} onClick={putAway} aria-label={tr('Take off the screen')} title={tr('Take off the screen (the note is kept)')}>
          <X size={15} aria-hidden="true" />
        </button>
      </header>
      {(popped || !sticky.min) && (
        <>
          <div className="sticky-body min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 py-3 text-[0.9rem] leading-relaxed" onKeyDown={(e) => e.key === 'Escape' && editor?.commands.blur()}>
            <EditorContent editor={editor} />
          </div>
          {!popped && (
            <span onPointerDown={resize} className="absolute right-0 bottom-0 size-5 cursor-nwse-resize touch-none max-sm:hidden" aria-hidden="true">
              <svg viewBox="0 0 20 20" className="size-full text-bone-faint">
                <path d="M17 9 9 17M17 13l-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </span>
          )}
        </>
      )}
    </section>
  );
}

/** Every sticky on the screen, above the tabs. Rendered once, by the workspace. */
export default function StickyLayer({ onOpenNote }) {
  const { list } = useStore(stickies);
  const loaded = useStore(notesStore, (s) => s.loaded);
  const all = useStore(notesStore, (s) => s.notes);
  const notes = useReadableNotes();
  const floating = useStore(pip);

  useEffect(() => {
    if (list.length && !loaded) void loadNotes();
  }, [list.length, loaded]);

  // a note deleted here or on another device takes its sticky with it
  useEffect(() => {
    if (loaded) dropMissing(new Set(all.map((n) => n.id)));
  }, [loaded, all]);

  useEffect(() => {
    const onResize = () => refitStickies();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // a sticky taken off the screen (or whose note is gone) closes the floating window it was in
  useEffect(() => {
    if (floating.win && !list.some((s) => s.id === floating.id)) popIn();
  }, [floating, list]);

  if (!list.length) return null;
  const byId = new Map(notes.map((n) => [n.id, n]));
  // the sticky in the floating window leaves the page while it is out there
  const out = floating.win && !floating.win.closed ? list.find((s) => s.id === floating.id) : null;
  const outNote = out ? byId.get(out.id) : null;
  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-[45]" aria-label={tr('Sticky notes')} role="region">
        {list.map((sticky, i) => {
          const note = byId.get(sticky.id);
          return note && sticky.id !== out?.id ? <Sticky key={sticky.id} sticky={sticky} note={note} top={i === list.length - 1} onOpenNote={onOpenNote} /> : null;
        })}
      </div>
      {outNote && createPortal(<Sticky key={`out-${out.id}`} sticky={out} note={outNote} top popped onOpenNote={onOpenNote} />, floating.win.document.body)}
    </>
  );
}
