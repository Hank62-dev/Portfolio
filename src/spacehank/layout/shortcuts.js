import { tr } from '../core/i18n/lang';

// The keyboard of the workspace: single keys and "g then a letter" to go somewhere, like a mail app. Pure lookups here; the
// workspace listens and runs them (layout/useShortcuts).

/** g + letter → tab. */
export const GO = {
  h: 'hank',
  t: 'missions',
  c: 'calendar',
  n: 'notes',
  m: 'music',
  p: 'podcast',
  w: 'wallet',
  b: 'habits',
  d: 'diary',
  s: 'study',
  r: 'rag',
};

/** What the sheet lists, in groups: [keys, what they do]. */
export const shortcutGroups = (label) => [
  {
    title: tr('Anywhere'),
    rows: [
      [['Ctrl', 'K'], tr('Command palette')],
      [['Ctrl', 'J'], tr('Quick capture')],
      [['F'], tr('Focus mode')],
      [['N'], tr('New sticky note')],
      [['.'], tr('Fold or unfold the player')],
      [['?'], tr('This list')],
    ],
  },
  {
    title: tr('Go to'),
    rows: Object.entries(GO).map(([key, tab]) => [['G', key.toUpperCase()], label(tab)]),
  },
];

/** Whether a key press happened while typing (then shortcuts stay quiet). */
export const typing = (target) => {
  if (!target || typeof target.closest !== 'function') return false;
  return Boolean(target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="textbox"]'));
};

/**
 * What a key does, given the key before it (`prev`, for "g then a letter"). Returns { go: tab } | { run: name } | { wait: 'g' } | null.
 */
export const resolveKey = (key, prev) => {
  const k = key.length === 1 ? key.toLowerCase() : key;
  if (prev === 'g') return GO[k] ? { go: GO[k] } : null;
  if (k === 'g') return { wait: 'g' };
  if (key === '?') return { run: 'help' };
  if (k === 'f') return { run: 'focus' };
  if (k === 'n') return { run: 'sticky' };
  if (k === '.') return { run: 'mini' };
  return null;
};
