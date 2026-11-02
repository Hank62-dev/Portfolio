import { hueOf, tagsOf, titleOf } from './notes';

// The knowledge graph behind Constellation: notes are stars, and a shared tag or a [[link]] draws a line between two.

/** The titles written as [[Title]] inside a note. */
export const linksIn = (text) => [...String(text ?? '').matchAll(/\[\[([^\]\n]{1,80})\]\]/g)].map((m) => m[1].trim().toLowerCase());

/**
 * Notes become nodes and relations become edges: each tag two notes share adds 1 to the weight between them, and
 * a [[link]] from one to another adds 2. Nodes carry what is needed to draw them (size, colour) and a place to start.
 */
export const buildGraph = (notes) => {
  const titles = new Map(notes.map((n) => [titleOf(n.text).toLowerCase(), n.id]));
  const nodes = notes.map((n, i) => {
    const tags = tagsOf(n.text);
    const angle = i * 2.399963; // the golden angle, so the start is spread evenly
    const radius = 40 * Math.sqrt(i + 1);
    return {
      id: n.id,
      title: titleOf(n.text),
      tags,
      words: n.text.trim() ? n.text.trim().split(/\s+/).length : 0,
      day: Boolean(n.day),
      pinned: Boolean(n.pinned),
      hue: hueOf(tags[0] ?? (n.day ? 'journal' : 'note')),
      degree: 0,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
    };
  });

  const weight = new Map();
  const add = (a, b, w) => {
    if (a === b) return;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    weight.set(key, (weight.get(key) ?? 0) + w);
  };
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const shared = nodes[i].tags.filter((t) => nodes[j].tags.includes(t)).length;
      if (shared) add(nodes[i].id, nodes[j].id, shared);
    }
  }
  for (const n of notes) for (const title of linksIn(n.text)) if (titles.has(title)) add(n.id, titles.get(title), 2);

  const edges = [...weight.entries()].map(([key, w]) => {
    const [a, b] = key.split('|');
    return { a, b, weight: w };
  });
  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (const e of edges) {
    byId.get(e.a).degree += 1;
    byId.get(e.b).degree += 1;
  }
  return { nodes, edges };
};

/** The radius a star is drawn at: bigger for longer and better-connected notes. */
export const radiusOf = (node) => 5 + Math.min(9, Math.sqrt(node.words) * 0.55) + Math.min(5, node.degree * 0.8);

/**
 * One step of a force layout, changing the nodes' positions in place: every star pushes the others away, each line
 * pulls its two ends together, and a faint pull to the middle keeps the cloud from drifting off. A star with `fixed`
 * set stays exactly where it was put (the others still feel it). Returns the movement left, which falls towards zero as the picture settles.
 */
export const stepLayout = (nodes, edges, { repulsion = 2600, spring = 0.02, rest = 90, gravity = 0.012, damping = 0.82, maxSpeed = 30 } = {}) => {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const a = nodes[i];
      const b = nodes[j];
      let dx = a.x - b.x;
      let dy = a.y - b.y;
      let d2 = dx * dx + dy * dy;
      if (d2 < 1) {
        dx = (i - j) * 0.5;
        dy = 0.5;
        d2 = 1;
      }
      const d = Math.sqrt(d2);
      const force = repulsion / d2;
      a.vx += (dx / d) * force;
      a.vy += (dy / d) * force;
      b.vx -= (dx / d) * force;
      b.vy -= (dy / d) * force;
    }
  }
  for (const e of edges) {
    const a = byId.get(e.a);
    const b = byId.get(e.b);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1;
    const pull = (d - rest / Math.sqrt(e.weight)) * spring * Math.min(2, e.weight);
    a.vx += (dx / d) * pull;
    a.vy += (dy / d) * pull;
    b.vx -= (dx / d) * pull;
    b.vy -= (dy / d) * pull;
  }
  let energy = 0;
  for (const n of nodes) {
    if (n.fixed) {
      n.vx = 0;
      n.vy = 0;
      continue;
    }
    n.vx = (n.vx - n.x * gravity) * damping;
    n.vy = (n.vy - n.y * gravity) * damping;
    // two stars that start on the same spot push each other with a huge force; a speed limit keeps that from flinging them off
    const speed = Math.hypot(n.vx, n.vy);
    if (speed > maxSpeed) {
      n.vx *= maxSpeed / speed;
      n.vy *= maxSpeed / speed;
    }
    n.x += n.vx;
    n.y += n.vy;
    energy += n.vx * n.vx + n.vy * n.vy;
  }
  return energy;
};

/** A few linked notes to try the view with. */
export const sampleNotes = (now = Date.now()) => {
  const note = (i, text, extra = {}) => ({ id: `sample-${i}`, text, html: undefined, createdAt: now - i * 3600000, updatedAt: now - i * 3600000, pinned: false, sample: true, ...extra });
  return [
    note(1, 'Portfolio redesign\n#portfolio #design Start from the dark editorial look and add depth. See [[Design tokens]] and [[Launch checklist]].'),
    note(2, 'Design tokens\n#design #portfolio Colours, type and spacing live in one stylesheet so every part reads from the same variables.'),
    note(3, 'Launch checklist\n#portfolio #todo Check the canonical URL, the sitemap, the social preview and mobile layouts.'),
    note(4, 'Study plan for the database exam\n#study #databases Normal forms, indexes and transactions. Practise with [[Query practice]].'),
    note(5, 'Query practice\n#study #databases Write joins by hand, then check them against the engine.'),
    note(6, 'Reading list\n#books #ideas Designing Data-Intensive Applications, The Pragmatic Programmer, and a book on typography.'),
    note(7, 'App ideas\n#ideas A habit garden that grows plants, a wallet that understands "ăn trưa 45k", and a shell for the workspace.'),
    note(8, 'Trip to Da Nang\n#trip #ideas Flight on 12 December, hotel near the beach, and a list of cafes to try.'),
  ];
};
