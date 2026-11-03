// The Creator Lab as plain functions: hooks and how they score, the content pipeline, income and goals, deals, pricing, and
// a Discord server blueprint. Nothing here talks to a network or a platform.

const DAY = 86400000;

// ---------------------------------------------------------------- platforms and the pipeline

export const PLATFORMS = [
  { id: 'tiktok', label: 'TikTok' },
  { id: 'shorts', label: 'YouTube Shorts' },
  { id: 'reels', label: 'Reels' },
  { id: 'discord', label: 'Discord' },
  { id: 'x', label: 'X / Threads' },
  { id: 'blog', label: 'Blog' },
];

export const STAGES = [
  { id: 'idea', label: 'Idea' },
  { id: 'script', label: 'Scripted' },
  { id: 'filmed', label: 'Filmed' },
  { id: 'edited', label: 'Edited' },
  { id: 'posted', label: 'Posted' },
];

/** A new piece of content. `pack` is what the content engine wrote (hooks, script, caption…), or null. */
export const newPiece = ({ title, platforms = ['tiktok'], pack = null, scheduledAt = null, hook = '' }) => ({
  title: String(title).trim().slice(0, 120),
  hook: String(hook).trim().slice(0, 200),
  platforms,
  stage: pack ? 'script' : 'idea',
  pack,
  scheduledAt,
  postedAt: null,
  results: { views: 0, likes: 0, revenue: 0 },
  notes: '',
});

/** The piece moved one stage forward (or back). Posting stamps the moment. Pure. */
export const moveStage = (piece, by = 1, now = Date.now()) => {
  const index = Math.max(0, Math.min(STAGES.length - 1, STAGES.findIndex((s) => s.id === piece.stage) + by));
  const stage = STAGES[index].id;
  return { ...piece, stage, postedAt: stage === 'posted' ? piece.postedAt ?? now : null };
};

/** Pieces grouped by stage, each group soonest-scheduled first (unscheduled last). */
export const byStage = (pieces) =>
  Object.fromEntries(
    STAGES.map((s) => [
      s.id,
      pieces
        .filter((p) => p.stage === s.id)
        .sort((a, b) => (a.scheduledAt ?? Infinity) - (b.scheduledAt ?? Infinity) || b.createdAt - a.createdAt),
    ])
  );

/** Scheduled, not yet posted, and the day has come or gone: what should be published today. */
export const dueToPost = (pieces, now = Date.now()) => {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return pieces.filter((p) => p.stage !== 'posted' && p.scheduledAt && p.scheduledAt <= end.getTime()).sort((a, b) => a.scheduledAt - b.scheduledAt);
};

// ---------------------------------------------------------------- hooks

const wordsOf = (text) => String(text).trim().split(/\s+/).filter(Boolean);

/**
 * A rule of thumb for how well a spoken opening line grabs a viewer in the first three seconds. It is NOT a prediction of
 * views: it only checks habits that hold up across short-form advice (short enough to say in 3 s, concrete, speaks to the viewer,
 * raises a question, does not open with a greeting). Returns { score 0-100, label, reasons: [{ ok, text }] }.
 */
export const scoreHook = (text) => {
  const line = String(text ?? '').trim();
  const words = wordsOf(line);
  const reasons = [];
  let score = 50;
  const add = (points, ok, why) => {
    score += points;
    reasons.push({ ok, text: why });
  };

  if (!words.length) return { score: 0, label: 'empty', reasons: [{ ok: false, text: 'Nothing to say yet.' }] };

  if (words.length < 4) add(-15, false, 'Very short: it may not give the viewer a reason to stay.');
  else if (words.length <= 14) add(15, true, 'Short enough to say in the first three seconds.');
  else if (words.length <= 18) add(0, true, 'A little long: try to cut a few words.');
  else add(-15, false, 'Too long to say in three seconds. Cut it down.');

  if (/\d/.test(line)) add(10, true, 'A number makes it concrete.');
  if (/\?\s*$/.test(line)) add(6, true, 'A question pulls the viewer into answering it.');
  if (/\b(why|how|what if|secret|mistake|stop|never|nobody|truth|wrong)\b/i.test(line) || /(tại sao|vì sao|bí mật|sai lầm|đừng|không ai|sự thật|nhầm)/i.test(line)) add(12, true, 'It opens a gap the viewer wants closed (a "why", a mistake, a secret).');
  if (/\b(you|your|you're)\b/i.test(line) || /(\bbạn\b|của bạn)/i.test(line)) add(8, true, 'It speaks to the viewer directly.');
  if (/^\s*(hi|hello|hey|hey guys|welcome|xin chào|chào các bạn|chào mọi người|hôm nay mình|trong video này)/i.test(line)) add(-20, false, 'It starts with a greeting. People scroll past those: start with the point.');
  if (/\[[^\]]+\]/.test(line)) add(-5, false, 'Fill in the [brackets] with the real detail before you film.');

  score = Math.max(0, Math.min(100, score));
  return { score, label: score >= 75 ? 'strong' : score >= 55 ? 'fair' : 'weak', reasons };
};

const FORMULAS = {
  vi: [
    { formula: 'curiosity', make: (t) => `Tại sao ${t} không như bạn nghĩ?` },
    { formula: 'number', make: (t) => `3 sai lầm khi ${t} mà ai cũng mắc` },
    { formula: 'contrarian', make: (t) => `Đừng ${t} trước khi xem điều này` },
    { formula: 'pain', make: (t) => `Bạn có đang mất thời gian với ${t} không?` },
    { formula: 'result', make: (t) => `Cách ${t} nhanh hơn, mình làm như thế này` },
    { formula: 'story', make: (t) => `Mình từng làm sai chuyện ${t}. Đây là bài học` },
  ],
  en: [
    { formula: 'curiosity', make: (t) => `Why ${t} is not what you think` },
    { formula: 'number', make: (t) => `3 mistakes everyone makes with ${t}` },
    { formula: 'contrarian', make: (t) => `Stop ${t} until you see this` },
    { formula: 'pain', make: (t) => `Are you wasting time on ${t}?` },
    { formula: 'result', make: (t) => `A faster way to handle ${t}, the way I do it` },
    { formula: 'story', make: (t) => `I got ${t} wrong once. Here is what I learned` },
  ],
};

/** Six hook starting points from a topic, for when the AI is not available (or as a second opinion). The creator must make each one true. Pure. */
export const hookFormulas = (topic, language = 'vi') => {
  const t = String(topic ?? '').trim().replace(/[.?!]+$/, '').slice(0, 80);
  if (!t) return [];
  return (FORMULAS[language] ?? FORMULAS.vi).map(({ formula, make }) => ({ formula, text: make(t) }));
};

/** The hooks with their scores, best first. */
export const rankHooks = (hooks) => hooks.map((hook) => ({ ...hook, ...scoreHook(hook.text) })).sort((a, b) => b.score - a.score);

// ---------------------------------------------------------------- scripts

/** The script as the plain words to say, one beat per paragraph, ending with the call to action. Pure. */
export const spokenText = (script) => [...(script?.beats ?? []).map((b) => b.say), script?.cta].filter(Boolean).join('\n\n');

/** The script with timings and on-screen notes, for copying into a notes app. */
export const scriptSheet = (script) =>
  [
    script?.title ? `# ${script.title}` : '',
    ...(script?.beats ?? []).map((b) => `[${b.at}] ${b.say}${b.show ? `\n   (on screen: ${b.show})` : ''}`),
    script?.cta ? `CTA: ${script.cta}` : '',
  ]
    .filter(Boolean)
    .join('\n');

/** About how many seconds it takes to say a text out loud (roughly 2.6 words a second). */
export const speakSeconds = (text) => Math.round(wordsOf(text).length / 2.6);

/** Splits a spoken script into chunks of at most `max` words for the teleprompter, never cutting a sentence mid-way when it can help it. */
export const prompterLines = (text, max = 9) => {
  const out = [];
  for (const paragraph of String(text ?? '').split(/\n{2,}/)) {
    const words = wordsOf(paragraph);
    for (let i = 0; i < words.length; i += max) out.push(words.slice(i, i + max).join(' '));
    if (words.length) out.push('');
  }
  while (out.at(-1) === '') out.pop();
  return out;
};

/** Hashtags as one line, each with a single "#". */
export const hashtagLine = (tags) => tags.map((t) => `#${String(t).replace(/^#+/, '').replace(/\s+/g, '')}`).join(' ');

// ---------------------------------------------------------------- income and goals

export const SOURCES = [
  { id: 'tiktok-shop', label: 'TikTok Shop' },
  { id: 'creator-rewards', label: 'Creator rewards' },
  { id: 'sponsor', label: 'Sponsorship' },
  { id: 'freelance', label: 'Client work' },
  { id: 'product', label: 'Digital product' },
  { id: 'membership', label: 'Membership / donations' },
  { id: 'discord', label: 'Discord community' },
  { id: 'other', label: 'Other' },
];
const SOURCE_LABEL = Object.fromEntries(SOURCES.map((s) => [s.id, s.label]));
export const sourceLabel = (id) => SOURCE_LABEL[id] ?? 'Other';

const pad = (n) => String(n).padStart(2, '0');
export const monthKeyOf = (at) => {
  const d = new Date(at);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};
const shiftMonth = (key, by) => {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + by, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

/** A new income entry. `amount` is in VND (a whole number). */
export const newIncome = ({ amount, source = 'other', at = Date.now(), note = '', pieceId = '' }) => ({
  amount: Math.max(0, Math.round(Number(amount) || 0)),
  source: SOURCE_LABEL[source] ? source : 'other',
  at,
  note: String(note).trim().slice(0, 120),
  pieceId,
});

/** An amount of dong as "1.250.000 ₫". */
export const vnd = (n) => `${Math.round(n).toLocaleString('vi-VN')} ₫`;
/** A compact form for tight places: "1,2 tr", "850 k". */
export const vndShort = (n) => (Math.abs(n) >= 1_000_000 ? `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace('.', ',')} tr` : Math.abs(n) >= 1000 ? `${Math.round(n / 1000)} k` : `${Math.round(n)}`);

export const monthTotal = (entries, key) => entries.filter((e) => monthKeyOf(e.at) === key).reduce((n, e) => n + e.amount, 0);

/** The month's income by source, biggest first: [{ source, amount, share }]. */
export const bySource = (entries, key) => {
  const rows = new Map();
  for (const e of entries.filter((x) => monthKeyOf(x.at) === key)) rows.set(e.source, (rows.get(e.source) ?? 0) + e.amount);
  const total = [...rows.values()].reduce((n, v) => n + v, 0);
  return [...rows].map(([source, amount]) => ({ source, amount, share: total ? amount / total : 0 })).sort((a, b) => b.amount - a.amount);
};

/** The last `months` months up to `key`, oldest first: [{ month, total }]. */
export const trend = (entries, key, months = 6) => Array.from({ length: months }, (_, i) => shiftMonth(key, i - (months - 1))).map((month) => ({ month, total: monthTotal(entries, month) }));

/**
 * Where the month stands against a goal. `projected` assumes the rest of the month goes at the pace so far (a straight line,
 * which is rough early in the month). Pure.
 */
export const goalProgress = ({ total, goal, now = Date.now() }) => {
  const d = new Date(now);
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const day = d.getDate();
  const daysLeft = daysInMonth - day;
  const remaining = Math.max(0, goal - total);
  return {
    pct: goal > 0 ? Math.min(100, Math.round((total / goal) * 100)) : 0,
    remaining,
    daysLeft,
    neededPerDay: daysLeft > 0 ? Math.ceil(remaining / daysLeft) : remaining,
    projected: Math.round((total / day) * daysInMonth),
    reached: goal > 0 && total >= goal,
  };
};

/** Plain-language observations about the income, most important first: [{ tone: 'good' | 'warn' | 'info', text }]. */
export const insights = (entries, goal, now = Date.now()) => {
  const out = [];
  const key = monthKeyOf(now);
  const total = monthTotal(entries, key);
  const previous = monthTotal(entries, shiftMonth(key, -1));
  if (!entries.length) return [{ tone: 'info', text: 'Log your first income, even a small one. The picture builds from there.' }];

  const rows = bySource(entries, key);
  if (rows[0] && rows[0].share >= 0.7 && total > 0) out.push({ tone: 'warn', text: `${Math.round(rows[0].share * 100)}% of this month comes from ${sourceLabel(rows[0].source)}. One change there empties the month: grow a second source.` });

  if (goal > 0) {
    const g = goalProgress({ total, goal, now });
    if (g.reached) out.push({ tone: 'good', text: `You reached this month's goal (${vnd(goal)}).` });
    else if (g.projected >= goal) out.push({ tone: 'good', text: `At this pace you finish the month around ${vnd(g.projected)}, above your goal.` });
    else out.push({ tone: 'warn', text: `To reach ${vnd(goal)} you need about ${vnd(g.neededPerDay)} a day for the ${g.daysLeft} days left.` });
  }

  if (previous > 0 && total > 0) {
    const change = Math.round(((total - previous) / previous) * 100);
    if (change >= 10) out.push({ tone: 'good', text: `${change}% more than last month so far.` });
    else if (change <= -10) out.push({ tone: 'info', text: `${Math.abs(change)}% less than last month so far (the month is not over).` });
  }

  const last = Math.max(...entries.map((e) => e.at));
  const quiet = Math.floor((now - last) / DAY);
  if (quiet >= 14) out.push({ tone: 'warn', text: `No income logged for ${quiet} days. If money did come in, log it; if not, today is a good day to send one pitch.` });

  const sources = new Set(entries.filter((e) => now - e.at < 90 * DAY).map((e) => e.source));
  if (sources.size === 1 && out.length < 3) out.push({ tone: 'info', text: 'All your income in the last three months comes from one source.' });
  return out;
};

/** How much each kind of content earned: pieces that have income attached, best first. */
export const earningsByPiece = (entries, pieces) => {
  const totals = new Map();
  for (const e of entries.filter((x) => x.pieceId)) totals.set(e.pieceId, (totals.get(e.pieceId) ?? 0) + e.amount);
  return pieces.filter((p) => totals.has(p.id)).map((p) => ({ piece: p, amount: totals.get(p.id) })).sort((a, b) => b.amount - a.amount);
};

// ---------------------------------------------------------------- deals

export const DEAL_STAGES = [
  { id: 'lead', label: 'Lead', chance: 0.1 },
  { id: 'contacted', label: 'Contacted', chance: 0.2 },
  { id: 'negotiating', label: 'Negotiating', chance: 0.5 },
  { id: 'won', label: 'Won', chance: 1 },
  { id: 'lost', label: 'Lost', chance: 0 },
];
export const DEAL_KINDS = [
  { id: 'sponsor', label: 'Sponsor' },
  { id: 'client', label: 'Client' },
  { id: 'collab', label: 'Collab' },
];
export const CHANNELS = ['Discord', 'TikTok DM', 'Email', 'Zalo', 'Facebook', 'Other'];

export const newDeal = ({ name, kind = 'client', channel = 'Discord', value = 0, followUpAt = null, note = '' }) => ({
  name: String(name).trim().slice(0, 80),
  kind,
  channel,
  stage: 'lead',
  value: Math.max(0, Math.round(Number(value) || 0)),
  followUpAt,
  note: String(note).trim().slice(0, 600),
});

const chanceOf = (stage) => DEAL_STAGES.find((s) => s.id === stage)?.chance ?? 0;
const isOpen = (deal) => !['won', 'lost'].includes(deal.stage);

/** The money still in play, and what it is worth when each stage is weighted by its chance of closing. */
export const pipelineValue = (deals) => ({
  open: deals.filter(isOpen).reduce((n, d) => n + d.value, 0),
  weighted: Math.round(deals.filter(isOpen).reduce((n, d) => n + d.value * chanceOf(d.stage), 0)),
  won: deals.filter((d) => d.stage === 'won').reduce((n, d) => n + d.value, 0),
});

/** Open deals whose follow-up is today or overdue, longest overdue first. */
export const dueFollowUps = (deals, now = Date.now()) => {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return deals.filter((d) => isOpen(d) && d.followUpAt && d.followUpAt <= end.getTime()).sort((a, b) => a.followUpAt - b.followUpAt);
};

/** Open deals that have no follow-up date: they will be forgotten. */
export const forgotten = (deals) => deals.filter((d) => isOpen(d) && !d.followUpAt);

/** Won out of won + lost, as a percentage; null until one deal is closed. */
export const winRate = (deals) => {
  const won = deals.filter((d) => d.stage === 'won').length;
  const lost = deals.filter((d) => d.stage === 'lost').length;
  return won + lost ? Math.round((won / (won + lost)) * 100) : null;
};

// ---------------------------------------------------------------- pricing

/**
 * A price for a piece of development work: your hourly target times the hours, a buffer for what always goes wrong, and an
 * optional discount. All in VND. Pure.
 */
export const packagePrice = ({ hourly, hours, bufferPct = 15, discountPct = 0 }) => {
  const base = Math.max(0, hourly) * Math.max(0, hours);
  const buffer = Math.round(base * (Math.max(0, bufferPct) / 100));
  const discount = Math.round((base + buffer) * (Math.max(0, Math.min(100, discountPct)) / 100));
  return { base: Math.round(base), buffer, discount, total: Math.round(base + buffer - discount) };
};

/**
 * What to ask a brand for one video, from your average views and a CPM (what a thousand views is worth to a brand). The CPM is
 * YOUR assumption: ask a few brands or creators in your niche, because it varies a lot. low / mid / high is -30%, the CPM, +40%.
 */
export const sponsorRate = ({ avgViews, cpm, extraPct = 0 }) => {
  const mid = (Math.max(0, avgViews) / 1000) * Math.max(0, cpm) * (1 + Math.max(0, extraPct) / 100);
  return { low: Math.round(mid * 0.7), mid: Math.round(mid), high: Math.round(mid * 1.4) };
};

/** A quote: line items { desc, qty, unit } with a discount and VAT. All in VND. */
export const quoteTotals = (items, { discountPct = 0, vatPct = 0 } = {}) => {
  const subtotal = items.reduce((n, i) => n + Math.max(0, Number(i.qty) || 0) * Math.max(0, Number(i.unit) || 0), 0);
  const discount = Math.round(subtotal * (Math.max(0, Math.min(100, discountPct)) / 100));
  const taxable = subtotal - discount;
  const vat = Math.round(taxable * (Math.max(0, vatPct) / 100));
  return { subtotal: Math.round(subtotal), discount, vat, total: Math.round(taxable + vat) };
};

// ---------------------------------------------------------------- Discord server blueprint

const CHANNEL = (name, topic, kind = 'text') => ({ name, topic, kind });

const BLUEPRINTS = {
  dev: {
    label: 'Developer community',
    categories: [
      { name: 'START HERE', channels: [CHANNEL('welcome', 'Who this server is for and how to get help', 'announcement'), CHANNEL('rules', 'The few rules that keep it friendly'), CHANNEL('introduce-yourself', 'Say hi, what you build, what you want to learn')] },
      { name: 'COMMUNITY', channels: [CHANNEL('general', 'Chat'), CHANNEL('show-your-work', 'Projects, demos, screenshots'), CHANNEL('help', 'Ask a question. One thread per problem', 'forum'), CHANNEL('resources', 'Useful links and tools')] },
      { name: 'THE BUILD LOG', channels: [CHANNEL('announcements', 'New videos, releases, offers', 'announcement'), CHANNEL('dev-log', 'What the owner shipped this week')] },
      { name: 'VOICE', channels: [CHANNEL('hangout', 'Voice', 'voice'), CHANNEL('co-working', 'Quiet voice room to work together', 'voice')] },
    ],
    roles: [
      { name: 'Owner', why: 'You. Full control, kept for one person.' },
      { name: 'Mod', why: 'A trusted few who can mute and delete, nothing else.' },
      { name: 'Member', why: 'Everyone after reading the rules.' },
      { name: 'Supporter', why: 'People who back you on an outside page (see the tiers). Give it by hand or with a bot you trust.' },
    ],
    tiers: [
      { name: 'Free', price: '0', perks: ['All community channels', 'Weekly build log'] },
      { name: 'Supporter', price: '[your price] / month, on an outside page', perks: ['A private channel for questions to you', 'Early access to templates and code', 'Your name in the credits'] },
    ],
  },
  creator: {
    label: 'Creator / fans community',
    categories: [
      { name: 'START HERE', channels: [CHANNEL('welcome', 'What this community is', 'announcement'), CHANNEL('rules', 'House rules'), CHANNEL('introduce-yourself', 'Say hi')] },
      { name: 'THE CHANNEL', channels: [CHANNEL('announcements', 'New videos and lives', 'announcement'), CHANNEL('new-videos', 'Discuss the latest video'), CHANNEL('ideas', 'Tell the creator what to make next', 'forum'), CHANNEL('clips', 'Fan clips and edits')] },
      { name: 'CHAT', channels: [CHANNEL('general', 'Anything goes (within the rules)'), CHANNEL('memes', 'Memes'), CHANNEL('hangout', 'Voice', 'voice')] },
    ],
    roles: [
      { name: 'Owner', why: 'You.' },
      { name: 'Mod', why: 'A trusted few.' },
      { name: 'Fan', why: 'Everyone after the rules.' },
      { name: 'Supporter', why: 'People who back you outside Discord.' },
    ],
    tiers: [
      { name: 'Free', price: '0', perks: ['Chat and announcements'] },
      { name: 'Supporter', price: '[your price] / month, on an outside page', perks: ['Behind-the-scenes posts', 'Vote on the next video', 'A supporter role and a private channel'] },
    ],
  },
  study: {
    label: 'Study group',
    categories: [
      { name: 'START HERE', channels: [CHANNEL('welcome', 'The goal of the group', 'announcement'), CHANNEL('rules', 'Rules'), CHANNEL('introduce-yourself', 'What you study')] },
      { name: 'STUDY', channels: [CHANNEL('announcements', 'Schedules and deadlines', 'announcement'), CHANNEL('questions', 'Ask and answer', 'forum'), CHANNEL('notes-and-resources', 'Notes, slides, links'), CHANNEL('accountability', 'Post your goal for today')] },
      { name: 'VOICE', channels: [CHANNEL('focus-room', 'Silent co-study', 'voice'), CHANNEL('discussion', 'Talk it through', 'voice')] },
    ],
    roles: [
      { name: 'Owner', why: 'You.' },
      { name: 'Mod', why: 'Keeps the study rooms calm.' },
      { name: 'Student', why: 'Everyone after the rules.' },
    ],
    tiers: [{ name: 'Free', price: '0', perks: ['Everything above'] }],
  },
};
export const BLUEPRINT_KINDS = Object.entries(BLUEPRINTS).map(([id, b]) => ({ id, label: b.label }));

/** The rules and welcome message are short on purpose; `name` is the community's name. */
export const blueprintFor = (kind, name = 'our community') => {
  const base = BLUEPRINTS[kind] ?? BLUEPRINTS.dev;
  return {
    ...base,
    rules: ['Be kind. No harassment, hate or personal attacks.', 'No spam, no self-promotion outside the places made for it.', 'No scams, no illegal content, no sharing private information.', 'Keep it on topic in each channel.', 'Listen to the mods. Ask if something is unclear.'],
    welcome: `Welcome to ${name}! Read #rules, say hi in #introduce-yourself, and ask anything in the help channels. New here? Tell us what you are working on.`,
    onboarding: ['What brings you here?', 'What do you want to learn or build?', 'Which topics do you want to hear about?'],
  };
};

/** The blueprint as a checklist to work through while setting the server up. */
export const blueprintText = (bp) =>
  [
    '# Server setup checklist',
    '',
    '## Channels',
    ...bp.categories.flatMap((c) => [`- [ ] Category: ${c.name}`, ...c.channels.map((ch) => `    - [ ] #${ch.name} (${ch.kind}): ${ch.topic}`)]),
    '',
    '## Roles',
    ...bp.roles.map((r) => `- [ ] ${r.name}: ${r.why}`),
    '',
    '## Rules (pin in #rules)',
    ...bp.rules.map((r, i) => `${i + 1}. ${r}`),
    '',
    '## Welcome message',
    bp.welcome,
    '',
    '## Onboarding questions',
    ...bp.onboarding.map((q) => `- ${q}`),
    '',
    '## Tiers (payment happens on an outside page, not in Discord)',
    ...bp.tiers.map((t) => `- ${t.name} (${t.price}): ${t.perks.join('; ')}`),
  ].join('\n');

// ---------------------------------------------------------------- a printable quote

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/**
 * A quote as a stand-alone page to print or save as PDF (the browser's print dialog does that). Every value is escaped, because
 * it is written into a new page. Pure.
 */
export const quoteHtml = ({ from, to, title, items, discountPct = 0, vatPct = 0, terms = '', date = new Date() }) => {
  const totals = quoteTotals(items, { discountPct, vatPct });
  const rows = items
    .filter((i) => String(i.desc ?? '').trim())
    .map((i) => `<tr><td>${esc(i.desc)}</td><td class="n">${esc(Number(i.qty) || 0)}</td><td class="n">${esc(vnd(Number(i.unit) || 0))}</td><td class="n">${esc(vnd((Number(i.qty) || 0) * (Number(i.unit) || 0)))}</td></tr>`)
    .join('');
  const day = new Date(date).toLocaleDateString('vi-VN');
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${esc(title || 'Quote')}</title><style>
body{font:14px/1.5 system-ui,Segoe UI,sans-serif;color:#111;margin:40px auto;max-width:720px;padding:0 24px}
h1{font-size:22px;margin:0 0 4px}.muted{color:#666}table{width:100%;border-collapse:collapse;margin:24px 0}
th,td{padding:9px 8px;border-bottom:1px solid #ddd;text-align:left}th{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#666}
.n{text-align:right;white-space:nowrap}.total td{font-weight:700;border-bottom:0;font-size:16px}.sum td{border-bottom:0;padding:4px 8px}
.terms{white-space:pre-line;margin-top:24px;padding-top:12px;border-top:1px solid #ddd}
</style></head><body>
<h1>${esc(title || 'Báo giá / Quote')}</h1>
<p class="muted">${esc(day)}</p>
<p><b>${esc(from || '')}</b><br>${to ? `Gửi: ${esc(to)}` : ''}</p>
<table><thead><tr><th>Hạng mục</th><th class="n">SL</th><th class="n">Đơn giá</th><th class="n">Thành tiền</th></tr></thead><tbody>${rows}</tbody>
<tfoot>
<tr class="sum"><td colspan="3" class="n">Tạm tính</td><td class="n">${esc(vnd(totals.subtotal))}</td></tr>
${totals.discount ? `<tr class="sum"><td colspan="3" class="n">Giảm giá (${esc(discountPct)}%)</td><td class="n">-${esc(vnd(totals.discount))}</td></tr>` : ''}
${totals.vat ? `<tr class="sum"><td colspan="3" class="n">VAT (${esc(vatPct)}%)</td><td class="n">${esc(vnd(totals.vat))}</td></tr>` : ''}
<tr class="total"><td colspan="3" class="n">Tổng cộng</td><td class="n">${esc(vnd(totals.total))}</td></tr>
</tfoot></table>
${terms ? `<div class="terms">${esc(terms)}</div>` : ''}
</body></html>`;
};
