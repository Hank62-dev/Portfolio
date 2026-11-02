import { useMemo, useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import { Badge, Button, Card, CardHeader, Select } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { COLORS, FONTS, contrast, rate, toCss, toJson, toTailwind } from './brand';

const TONE = { AAA: 'ok', AA: 'ok', 'AA large': 'warn', Fail: 'danger' };

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

const download = (name, text, type) => {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};

function Swatch({ color, onCopy, copied }) {
  return (
    <button
      type="button"
      onClick={() => onCopy(color.hex)}
      className="group flex flex-col overflow-hidden rounded-card border border-line text-left transition-colors hover:border-line-strong"
      aria-label={`Copy ${color.name} ${color.hex}`}
    >
      <span className="h-16 w-full" style={{ background: color.hex }} />
      <span className="flex items-center justify-between gap-2 bg-ink-1 p-2.5">
        <span className="leading-tight">
          <b className="block font-mono text-fine font-medium text-bone">{color.name}</b>
          <small className="block font-mono text-[0.72rem] text-bone-faint">{color.role}</small>
        </span>
        <span className="font-mono text-[0.72rem] text-bone-dim">{copied === color.hex ? <Check size={13} className="text-ok" aria-hidden="true" /> : color.hex}</span>
      </span>
    </button>
  );
}

/** The workspace's own design tokens, with a contrast checker and exports for other tools. */
export default function BrandKit() {
  const [copied, setCopied] = useState('');
  const [fg, setFg] = useState('bone');
  const [bg, setBg] = useState('ink-0');
  const hex = (name) => COLORS.find((c) => c.name === name).hex;
  const ratio = contrast(hex(fg), hex(bg));
  const groups = useMemo(() => [...new Set(COLORS.map((c) => c.group))], []);

  const copy = async (text, label = text) => {
    if (await copyText(text)) {
      setCopied(label);
      window.setTimeout(() => setCopied(''), 1600);
    }
  };

  const pairs = [
    ['bone', 'ink-0'],
    ['bone-dim', 'ink-0'],
    ['bone-faint', 'ink-0'],
    ['bone', 'ink-2'],
    ['signal', 'ink-0'],
    ['ink-0', 'signal'],
    ['ok', 'ink-1'],
    ['warn', 'ink-1'],
    ['danger', 'ink-1'],
  ];

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <Card key={group}>
          <CardHeader eyebrow="COLOUR" title={group} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {COLORS.filter((c) => c.group === group).map((c) => (
              <Swatch key={c.name} color={c} onCopy={(value) => copy(value, value)} copied={copied} />
            ))}
          </div>
        </Card>
      ))}

      <Card>
        <CardHeader eyebrow="ACCESSIBILITY" title="Contrast checker" />
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 font-mono text-fine text-bone-dim">
            Text
            <Select value={fg} onChange={(e) => setFg(e.target.value)} aria-label="Text colour">
              {COLORS.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 font-mono text-fine text-bone-dim">
            Background
            <Select value={bg} onChange={(e) => setBg(e.target.value)} aria-label="Background colour">
              {COLORS.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </Select>
          </label>
          <div className="flex items-center gap-2" data-contrast>
            <b className="font-mono text-h3 leading-none tabular-nums text-bone">{ratio.toFixed(2)}:1</b>
            <Badge tone={TONE[rate(ratio)]} dot>{rate(ratio)}</Badge>
          </div>
        </div>
        <div className="mb-4 rounded-card p-5" style={{ background: hex(bg), color: hex(fg) }}>
          <p className="font-display text-h3 leading-tight">The quick brown fox</p>
          <p className="mt-1 text-body">Jumps over the lazy dog, 0123456789.</p>
        </div>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {pairs.map(([a, b]) => {
            const r = contrast(hex(a), hex(b));
            return (
              <li key={`${a}-${b}`} className="flex items-center gap-3 rounded-sm border border-line p-2 font-mono text-fine">
                <span className="grid size-8 place-items-center rounded-sm text-[0.8rem] font-semibold" style={{ background: hex(b), color: hex(a) }}>Aa</span>
                <span className="flex-1 text-bone-dim">{a} on {b}</span>
                <Badge tone={TONE[rate(r)]}>{r.toFixed(1)} · {rate(r)}</Badge>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <CardHeader eyebrow="TYPE" title="Typefaces" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {FONTS.map((f) => (
            <div key={f.name} className="rounded-sm border border-line p-3">
              <p className={clsx('text-h3 leading-tight text-bone')} style={{ fontFamily: `'${f.family}', ${f.fallback}` }}>Aa Bb Cc</p>
              <p className="mt-2 font-mono text-fine text-bone">{f.family}</p>
              <p className="font-mono text-[0.72rem] text-bone-faint">{f.use}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader eyebrow="EXPORT" title="Take the tokens with you" />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => copy(toCss(), 'css')}>
            <Copy size={14} aria-hidden="true" /> {copied === 'css' ? 'Copied' : 'Copy CSS variables'}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => copy(toTailwind(), 'tw')}>
            <Copy size={14} aria-hidden="true" /> {copied === 'tw' ? 'Copied' : 'Copy Tailwind @theme'}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => copy(toJson(), 'json')}>
            <Copy size={14} aria-hidden="true" /> {copied === 'json' ? 'Copied' : 'Copy JSON'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => download('hank62-tokens.css', toCss(), 'text/css')}>
            <Download size={14} aria-hidden="true" /> Download .css
          </Button>
          <Button variant="ghost" size="sm" onClick={() => download('hank62-tokens.json', toJson(), 'application/json')}>
            <Download size={14} aria-hidden="true" /> Download .json
          </Button>
        </div>
        <pre className="mt-4 max-h-48 overflow-auto rounded-sm bg-ink-2 p-3 font-mono text-[0.72rem] text-bone-dim">{toCss()}</pre>
      </Card>
    </div>
  );
}
