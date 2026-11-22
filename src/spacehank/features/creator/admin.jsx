import { useEffect, useMemo, useRef, useState } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, RotateCcw, Search, Trash2, X } from 'lucide-react';
import { Button, pushToast } from '../../../shared/ui';
import { clsx } from '../../../shared/lib/format';
import { uploadStoreImage } from '../../core/api/owner';
import { tr } from '../../core/i18n/lang';

// The Creator Lab's management parts, shared by the Shop, Links and Media kit: a drawer to edit one thing in, a table that pages,
// a search box, a switch, a picture that is dropped in rather than linked, and a form section with its own save bar.

/** A panel that slides in from the right (a sheet from the bottom on a phone) to edit one thing, with its actions at the foot. */
export function Drawer({ open, onClose, title, subtitle, children, footer, wide = false }) {
  return (
    <RadixDialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 animate-fade-in bg-black/55 backdrop-blur-[2px]" />
        <RadixDialog.Content className={clsx('adm-drawer', wide && 'is-wide')}>
          <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
            <div className="min-w-0">
              <RadixDialog.Title className="truncate font-display text-[1.5rem] leading-tight text-bone">{title}</RadixDialog.Title>
              <RadixDialog.Description className={clsx('mt-1 text-fine text-bone-dim', !subtitle && 'sr-only')}>{subtitle || title}</RadixDialog.Description>
            </div>
            <RadixDialog.Close aria-label={tr('Close')} className="grid size-9 shrink-0 place-items-center rounded-full text-bone-dim hover:bg-wash/[0.06] hover:text-bone">
              <X size={18} aria-hidden="true" />
            </RadixDialog.Close>
          </header>
          <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-5">{children}</div>
          {footer && <footer className="flex items-center gap-2 border-t border-line px-6 py-4">{footer}</footer>}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

/**
 * Asking before something is thrown away. `const [confirm, dialog] = useConfirm()`, render `dialog`, then
 * `if (await confirm({ title, body, action })) …`. Escape, the backdrop or Cancel answer no.
 */
export function useConfirm() {
  const [ask, setAsk] = useState(null); // { title, body, action, resolve }
  const answer = (yes) => {
    ask?.resolve(yes);
    setAsk(null);
  };
  const confirm = (options) => new Promise((resolve) => setAsk({ ...options, resolve }));
  const dialog = (
    <RadixDialog.Root open={Boolean(ask)} onOpenChange={(open) => !open && answer(false)}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-[60] animate-fade-in bg-black/60 backdrop-blur-[2px]" />
        <RadixDialog.Content className="adm-confirm" role="alertdialog">
          <span className="adm-confirm-icon" aria-hidden="true">
            <Trash2 size={20} />
          </span>
          <RadixDialog.Title className="font-display text-[1.35rem] leading-tight text-bone">{ask?.title}</RadixDialog.Title>
          <RadixDialog.Description className="text-fine leading-relaxed text-bone-dim">{ask?.body || tr('This cannot be undone.')}</RadixDialog.Description>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => answer(false)} autoFocus>
              {tr('Cancel')}
            </Button>
            <Button variant="danger" size="sm" onClick={() => answer(true)} data-confirm-yes>
              <Trash2 size={13} aria-hidden="true" /> {ask?.action || tr('Delete')}
            </Button>
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
  return [confirm, dialog];
}

/**
 * A button for something that takes a moment (saving, deleting, sending): while `onClick` runs it shows it is working and cannot
 * be pressed twice. `ask` (optional, async → true/false) is the question asked first, before it starts working.
 */
export function AsyncButton({ onClick, ask, children, ...rest }) {
  const [busy, setBusy] = useState(false);
  const live = useRef(true);
  useEffect(
    () => () => {
      live.current = false;
    },
    []
  );
  return (
    <Button
      {...rest}
      loading={busy}
      onClick={async (e) => {
        if (busy) return;
        if (ask && !(await ask())) return;
        setBusy(true);
        try {
          await onClick?.(e);
        } catch (error) {
          pushToast(error.message, { tone: 'error' });
        } finally {
          if (live.current) setBusy(false);
        }
      }}
    >
      {children}
    </Button>
  );
}

/** A labelled field: the label above, the control, then a hint or what is wrong with it. */
export function Field({ label, hint, error, children, className }) {
  return (
    <label className={clsx('flex min-w-0 flex-col gap-1.5', className)}>
      <span className="text-[0.8rem] font-medium text-bone">{label}</span>
      {children}
      {error ? <span className="text-[0.76rem] text-danger">{error}</span> : hint ? <span className="text-[0.76rem] leading-snug text-bone-faint">{hint}</span> : null}
    </label>
  );
}

/** An on/off switch with its label. */
export function Switch({ on, onChange, label, hint }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="adm-switch-row">
      <span className="min-w-0 text-left">
        <b className="block text-fine font-medium text-bone">{label}</b>
        {hint && <small className="block text-[0.76rem] text-bone-faint">{hint}</small>}
      </span>
      <i className={clsx('adm-switch', on && 'is-on')} aria-hidden="true" />
    </button>
  );
}

/** A block of a settings form: a title and a line about it on the left, the fields on the right; a save bar when something changed. */
export function FormSection({ title, description, children, dirty, saving, onSave, onReset, error }) {
  return (
    <section className="adm-section">
      <div className="adm-section-head">
        <h3 className="font-display text-[1.25rem] leading-tight text-bone">{title}</h3>
        {description && <p className="mt-1.5 text-[0.82rem] leading-relaxed text-bone-dim">{description}</p>}
      </div>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
      {onSave && (
        <div className={clsx('adm-savebar', dirty && 'is-dirty')}>
          <span className="text-[0.8rem] text-bone-dim">{error ? <span className="text-danger">{error}</span> : dirty ? tr('Unsaved changes') : tr('All changes saved')}</span>
          <span className="flex gap-2">
            {dirty && onReset && (
              <Button variant="ghost" size="sm" onClick={onReset} disabled={saving}>
                <RotateCcw size={13} aria-hidden="true" /> {tr('Undo')}
              </Button>
            )}
            <Button size="sm" onClick={onSave} loading={saving} disabled={!dirty || Boolean(error)}>
              {tr('Save')}
            </Button>
          </span>
        </div>
      )}
    </section>
  );
}

/** A search box. */
export function SearchBox({ value, onChange, placeholder }) {
  return (
    <label className="adm-search">
      <Search size={15} aria-hidden="true" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
      {value && (
        <button type="button" onClick={() => onChange('')} aria-label={tr('Clear')}>
          <X size={13} aria-hidden="true" />
        </button>
      )}
    </label>
  );
}

/** Page through a list: the rows of the page shown, and the controls. */
export const usePaged = (items, size = 10) => {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(items.length / size));
  useEffect(() => {
    if (page > pages - 1) setPage(pages - 1);
  }, [page, pages]);
  const shown = useMemo(() => items.slice(page * size, page * size + size), [items, page, size]);
  return { shown, page, pages, setPage, total: items.length, from: items.length ? page * size + 1 : 0, to: Math.min(items.length, page * size + size) };
};

export function Pager({ paged }) {
  if (paged.total <= 0) return null;
  return (
    <div className="flex items-center justify-between gap-3 px-1 pt-3 text-[0.78rem] text-bone-dim">
      <span className="font-mono tabular-nums">{tr('{0}–{1} of {2}', paged.from, paged.to, paged.total)}</span>
      {paged.pages > 1 && (
        <span className="flex items-center gap-1">
          <button type="button" className="adm-page" onClick={() => paged.setPage(paged.page - 1)} disabled={paged.page === 0} aria-label={tr('Previous page')}>
            <ChevronLeft size={15} aria-hidden="true" />
          </button>
          {Array.from({ length: paged.pages }, (_, i) => i)
            .filter((i) => paged.pages <= 7 || Math.abs(i - paged.page) <= 1 || i === 0 || i === paged.pages - 1)
            .map((i, k, list) => (
              <span key={i} className="flex items-center gap-1">
                {k > 0 && i - list[k - 1] > 1 && <span className="px-1 text-bone-faint">…</span>}
                <button type="button" className={clsx('adm-page', i === paged.page && 'is-on')} onClick={() => paged.setPage(i)} aria-current={i === paged.page ? 'page' : undefined}>
                  {i + 1}
                </button>
              </span>
            ))}
          <button type="button" className="adm-page" onClick={() => paged.setPage(paged.page + 1)} disabled={paged.page >= paged.pages - 1} aria-label={tr('Next page')}>
            <ChevronRight size={15} aria-hidden="true" />
          </button>
        </span>
      )}
    </div>
  );
}

/**
 * A table of rows that pages: `columns` [{ key, label, className, render(row) }], a row opens with `onOpen(row)`. On a phone the
 * rows become cards, each column a line.
 */
export function DataTable({ columns, rows, onOpen, empty, size = 10, rowKey = (r) => r.id }) {
  const paged = usePaged(rows, size);
  if (!rows.length) return empty ?? null;
  return (
    <div>
      <div className="adm-table" role="table">
        <div className="adm-tr adm-th" role="row" style={{ '--cols': columns.map((c) => c.width ?? '1fr').join(' ') }}>
          {columns.map((c) => (
            <span key={c.key} role="columnheader" className={c.className}>
              {c.label}
            </span>
          ))}
        </div>
        {paged.shown.map((row) => (
          <div
            key={rowKey(row)}
            role="row"
            tabIndex={onOpen ? 0 : undefined}
            onClick={onOpen ? () => onOpen(row) : undefined}
            onKeyDown={onOpen ? (e) => e.key === 'Enter' && onOpen(row) : undefined}
            className={clsx('adm-tr', onOpen && 'is-link')}
            style={{ '--cols': columns.map((c) => c.width ?? '1fr').join(' ') }}
          >
            {columns.map((c) => (
              <span key={c.key} role="cell" data-label={c.label} className={c.className}>
                {c.render ? c.render(row) : row[c.key]}
              </span>
            ))}
          </div>
        ))}
      </div>
      <Pager paged={paged} />
    </div>
  );
}

/** A picture made smaller before it is sent: at most `max` pixels on its longer side, as WebP (or JPEG where WebP cannot be made). */
const shrink = async (file, max = 1600) => {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = Object.assign(document.createElement('canvas'), { width: Math.round(bitmap.width * scale), height: Math.round(bitmap.height * scale) });
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const as = (type) => new Promise((resolve) => canvas.toBlob(resolve, type, 0.86));
  const webp = await as('image/webp');
  return webp?.type === 'image/webp' ? webp : as('image/jpeg');
};

/** A picture dropped in or chosen from the computer: shrunk, uploaded to the shop, and shown. `value` is its address. */
export function ImageDrop({ value, onChange, label, hint, aspect = '16 / 10', round = false }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const take = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      pushToast(tr('Choose a picture (JPEG, PNG or WebP).'), { tone: 'error' });
      return;
    }
    setBusy(true);
    try {
      onChange(await uploadStoreImage(await shrink(file, round ? 600 : 1600)));
    } catch (e) {
      pushToast(e.message, { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-[0.8rem] font-medium text-bone">{label}</span>}
      <div
        className={clsx('adm-drop', round && 'is-round', over && 'is-over', value && 'has-image')}
        style={{ aspectRatio: round ? '1' : aspect }}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void take(e.dataTransfer.files?.[0]);
        }}
      >
        {value ? <img src={value} alt="" /> : null}
        <button type="button" className="adm-drop-pick" onClick={() => input.current?.click()} disabled={busy}>
          {busy ? <Loader2 size={20} className="animate-spin" aria-hidden="true" /> : <ImagePlus size={20} aria-hidden="true" />}
          <span>{busy ? tr('Uploading…') : value ? tr('Change the picture') : tr('Drop a picture here, or choose one')}</span>
        </button>
        {value && !busy && (
          <button type="button" className="adm-drop-remove" onClick={() => onChange('')} aria-label={tr('Remove the picture')}>
            <Trash2 size={14} aria-hidden="true" />
          </button>
        )}
        <input ref={input} type="file" accept="image/*" hidden onChange={(e) => void take(e.target.files?.[0])} />
      </div>
      {hint && <span className="text-[0.76rem] text-bone-faint">{hint}</span>}
    </div>
  );
}

/** A small coloured status pill. */
export const Pill = ({ tone = 'default', children }) => <span className={clsx('adm-pill', `is-${tone}`)}>{children}</span>;

/** The money input: digits only, shown with dots, the dong sign after. */
export function MoneyInput({ value, onChange, placeholder = '0', ...rest }) {
  return (
    <span className="adm-money">
      <input inputMode="numeric" value={value ? Number(value).toLocaleString('vi-VN') : ''} onChange={(e) => onChange(Math.round(Number(e.target.value.replace(/\D/g, '')) || 0))} placeholder={placeholder} {...rest} />
      <i>₫</i>
    </span>
  );
}

/** A heading row for a list: a title, how many, a search, and the main action. */
export function ListHead({ title, count, children }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <h3 className="font-display text-[1.35rem] text-bone">
        {title} {count !== undefined && <span className="ml-1 font-mono text-[0.8rem] text-bone-faint">{count}</span>}
      </h3>
      <span className="flex-1" />
      {children}
    </div>
  );
}
