import { useEffect, useRef, useState } from 'react';
import { ChevronRight, CornerDownLeft } from 'lucide-react';
import { Dots } from '../../../shared/ui';
import { clsx } from '../../../shared/lib/format';
import { complete, parseLine, runLine } from './commands';
import { tr } from '../../core/i18n/lang';

const TONE = { ok: 'text-ok', err: 'text-danger', dim: 'text-bone-faint' };
const QUICK = ['help', 'agents', 'tabs', 'habits', 'weather'];
const BANNER = [
  { id: 'b1', kind: 'out', text: 'Git Bash. Everything the workspace does, from the keyboard.', tone: 'ok' },
  { id: 'b2', kind: 'out', text: 'Type help for the commands. Up and down arrows bring back earlier lines, Tab completes, Ctrl+L clears.', tone: 'dim' },
];

/** A command line for the workspace: type a command, see what happened. The commands live in shell/commands.js. */
export default function ShellView({ ctx }) {
  const [lines, setLines] = useState(BANNER);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const history = useRef([]);
  const cursor = useRef(-1);
  const field = useRef(null);
  const end = useRef(null);
  const counter = useRef(0);

  useEffect(() => {
    field.current?.focus();
  }, []);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [lines, busy]);

  const push = (items) => setLines((old) => [...old, ...items.map((item) => ({ id: `l${(counter.current += 1)}`, ...item }))].slice(-400));

  const run = async (line) => {
    const text = line.trim();
    if (!text || busy) return;
    history.current = [text, ...history.current.filter((h) => h !== text)].slice(0, 60);
    cursor.current = -1;
    setInput('');
    push([{ kind: 'in', text }]);
    setBusy(true);
    const result = await runLine(text, ctx);
    setBusy(false);
    if (result.clear) setLines([]);
    else push(result.lines.map((l) => ({ kind: 'out', ...l })));
    field.current?.focus();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      cursor.current = Math.min(history.current.length - 1, cursor.current + 1);
      setInput(history.current[cursor.current] ?? input);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      cursor.current = Math.max(-1, cursor.current - 1);
      setInput(cursor.current < 0 ? '' : history.current[cursor.current]);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const { name, rest } = parseLine(input);
      if (!rest && name) {
        const options = complete(name);
        if (options.length === 1) setInput(`${options[0]} `);
        else if (options.length > 1) push([{ kind: 'out', text: options.join('   '), tone: 'dim' }]);
      }
    } else if (e.key.toLowerCase() === 'l' && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <section
        className="dark-island flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-wash/10 bg-[#08080b] bg-[radial-gradient(80%_60%_at_0%_0%,rgb(255_91_46/0.1),transparent_60%),radial-gradient(60%_60%_at_100%_100%,rgb(91_43_255/0.12),transparent_60%)] shadow-[0_30px_80px_-40px_rgb(var(--shadow-rgb)/0.9)]"
        onClick={() => window.getSelection()?.isCollapsed && field.current?.focus()}
        aria-label={tr('Shell')}
      >
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2 border-b border-wash/8 px-4 py-2.5">
          <span className="flex items-center gap-1.5" aria-hidden="true">
            <i className="size-2.5 rounded-full bg-[#ff5f57]" />
            <i className="size-2.5 rounded-full bg-[#febc2e]" />
            <i className="size-2.5 rounded-full bg-[#28c840]" />
            <span className="ml-3 font-mono text-[0.72rem] text-bone-faint">{tr('hank@62: ~')}</span>
          </span>
          <div className="ml-auto flex flex-wrap gap-1.5" aria-label={tr('Try one')}>
            {QUICK.map((q) => (
              <button key={q} type="button" onClick={() => run(q)} className="rounded-full border border-wash/10 px-2.5 py-0.5 font-mono text-[0.72rem] text-bone-dim transition-colors hover:border-signal/60 hover:text-bone">
                {q}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 font-mono text-[0.84rem] leading-relaxed" role="log" aria-live="polite" data-shell-output>
          {lines.map((l) =>
            l.kind === 'in' ? (
              <p key={l.id} className="mt-2 text-bone">
                <ChevronRight size={13} className="mr-1 inline -translate-y-px text-signal" aria-hidden="true" />
                {l.text}
              </p>
            ) : (
              <p key={l.id} className={clsx('break-words whitespace-pre-wrap', TONE[l.tone] ?? 'text-bone-dim')}>
                {l.text || ' '}
              </p>
            )
          )}
          {busy && (
            <p className="mt-1 flex items-center gap-2 text-bone-faint">
              <Dots size={5} /> {tr('working…')}
            </p>
          )}
          <div ref={end} />
        </div>

        <form
          className="flex items-center gap-2 border-t border-wash/8 px-4 py-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            void run(input);
          }}
        >
          <ChevronRight size={16} className="shrink-0 text-signal" aria-hidden="true" />
          <input
            ref={field}
            aria-label={tr('Command')}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              cursor.current = -1;
            }}
            onKeyDown={onKeyDown}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder={tr('type a command…')}
            className="h-9 min-w-0 flex-1 bg-transparent font-mono text-[0.88rem] text-bone placeholder:text-bone-faint focus-visible:outline-none"
          />
          <button type="submit" aria-label={tr('Run')} disabled={!input.trim() || busy} className="grid size-8 place-items-center rounded-full text-bone-dim hover:text-bone disabled:opacity-35">
            <CornerDownLeft size={15} aria-hidden="true" />
          </button>
        </form>
      </section>
    </div>
  );
}
