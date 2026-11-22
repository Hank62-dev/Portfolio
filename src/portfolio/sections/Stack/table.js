// The Stack section's picture as data: a periodic table of the stack, every technology an element with a symbol of its
// own, its number how many projects used it, its family the layer it belongs to. Pure, so it can be tested without the DOM.

const letters = (name) => name.replace(/[^A-Za-z0-9]/g, '');

/**
 * A symbol for each name, unique across the table: a capital and a small letter, the way elements are written — the first
 * letter with the next one that is not taken (React → Re, TypeScript → Ty or Ts…). Returns Map(name → symbol).
 */
export const symbolsFor = (names) => {
  const taken = new Set();
  const out = new Map();
  for (const name of names) {
    const raw = letters(name) || 'X';
    const head = raw[0].toUpperCase();
    // capitals inside the name first (TypeScript → Ts), then the letters in order, then any letter at all
    const inner = [...raw.slice(1)].filter((ch) => /[A-Z0-9]/.test(ch));
    const rest = [...raw.slice(1)];
    const candidates = [...inner, ...rest, ...'abcdefghijklmnopqrstuvwxyz'].map((ch) => head + ch.toLowerCase());
    const symbol = candidates.find((s) => !taken.has(s)) ?? `${head}${taken.size}`;
    taken.add(symbol);
    out.set(name, symbol);
  }
  return out;
};

/**
 * The elements in table order: [{ layer, family, tech, symbol, number, slugs }], family by family (the layers in order),
 * the most used first within a family. A tool listed under two layers is two elements, one in each family.
 */
export const elements = (stack, layers) => {
  const list = layers.flatMap((layer, family) =>
    [...(stack[layer] ?? [])].sort((a, b) => b.slugs.length - a.slugs.length || a.tech.localeCompare(b.tech)).map((e) => ({ layer, family, tech: e.tech, number: e.slugs.length, slugs: e.slugs }))
  );
  const symbols = symbolsFor([...new Set(list.map((e) => e.tech))]);
  return list.map((e) => ({ ...e, symbol: symbols.get(e.tech) }));
};

/**
 * How many columns to lay the families out in so the square tiles come out biggest inside `width` × `height`: each family
 * starts a row of its own, like the blocks of a periodic table, `gap` between tiles and `familyGap` more between families.
 * `counts` is how many tiles each family has. Returns { cols, rows, size }.
 */
export const fitGrid = (counts, width, height, gap = 4, familyGap = 10) => {
  const most = Math.max(1, ...counts);
  const families = counts.filter(Boolean).length;
  let best = { cols: 1, rows: counts.reduce((n, c) => n + c, 0), size: 0 };
  for (let cols = 1; cols <= most; cols += 1) {
    const rows = counts.reduce((n, c) => n + Math.ceil(c / cols), 0);
    const spare = height - gap * (rows - 1) - familyGap * Math.max(0, families - 1);
    const size = Math.floor(Math.min((width - gap * (cols - 1)) / cols, spare / rows));
    if (size > best.size) best = { cols, rows, size };
  }
  return best;
};
