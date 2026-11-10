import { describe, expect, it } from 'vitest';
import { STAGES, quoteHtml, blueprintFor, blueprintText, bySource, byStage, dueFollowUps, dueToPost, earningsByPiece, forgotten, goalProgress, hashtagLine, hookFormulas, insights, monthKeyOf, monthTotal, moveStage, newDeal, newIncome, newPiece, packagePrice, pipelineValue, prompterLines, quoteTotals, rankHooks, scoreHook, scriptSheet, speakSeconds, sponsorRate, spokenText, trend, vnd, vndShort, winRate } from './model';

const DAY = 86400000;
const now = new Date(2026, 10, 12, 10).getTime(); // 12 Nov 2026
const inc = (amount, source, daysAgo = 0, extra = {}) => ({ id: `${source}${amount}${daysAgo}`, ...newIncome({ amount, source, at: now - daysAgo * DAY }), ...extra });

describe('hooks', () => {
  it('rewards a short, concrete, curious line that speaks to the viewer', () => {
    const good = scoreHook('3 mistakes that make your Discord bot crash?');
    expect(good.score).toBeGreaterThanOrEqual(75);
    expect(good.label).toBe('strong');
    expect(good.reasons.some((r) => /number/.test(r.text))).toBe(true);
  });
  it('marks down a greeting, an over-long line and an unfilled bracket', () => {
    expect(scoreHook('Hello guys, welcome back to my channel, today I am going to talk about something that I have been meaning to share with all of you for a while').label).toBe('weak');
    expect(scoreHook('Xin chào các bạn, hôm nay mình sẽ nói về bot').reasons.some((r) => /greeting/.test(r.text))).toBe(true);
    expect(scoreHook('Why [your topic] is not what you think').reasons.some((r) => /brackets/.test(r.text))).toBe(true);
  });
  it('understands Vietnamese cues too', () => {
    expect(scoreHook('Tại sao bot của bạn hay sập lúc 3 giờ sáng?').score).toBeGreaterThanOrEqual(75);
  });
  it('is zero for nothing and never leaves 0 to 100', () => {
    expect(scoreHook('   ').score).toBe(0);
    for (const text of ['x', 'a b c d e f g h i j k l m n o p q r s t u v w x y z', '9 9 9 9?']) {
      const { score } = scoreHook(text);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
  it('writes six starting hooks from a topic, in either language, and ranks them best first', () => {
    const vi = hookFormulas('viết bot Discord', 'vi');
    expect(vi).toHaveLength(6);
    expect(new Set(vi.map((h) => h.formula)).size).toBe(6);
    expect(hookFormulas('writing Discord bots', 'en')[0].text).toMatch(/^Why writing Discord bots/);
    expect(hookFormulas('  ', 'en')).toEqual([]);
    const ranked = rankHooks(vi);
    expect(ranked.map((h) => h.score)).toEqual([...ranked.map((h) => h.score)].sort((a, b) => b - a));
  });
});

describe('scripts', () => {
  const script = { title: 'Fix it', beats: [{ at: '0-3s', say: 'Your bot crashes at 3am.', show: 'face' }, { at: '3-10s', say: 'Here is why.', show: '' }], cta: 'Follow for more' };
  it('gives the words to say, and a sheet with timings', () => {
    expect(spokenText(script)).toBe('Your bot crashes at 3am.\n\nHere is why.\n\nFollow for more');
    expect(scriptSheet(script)).toContain('[0-3s] Your bot crashes at 3am.');
    expect(scriptSheet(script)).toContain('(on screen: face)');
    expect(scriptSheet(script)).toContain('CTA: Follow for more');
  });
  it('estimates how long it takes to say', () => {
    expect(speakSeconds('one two three four five six seven eight nine ten eleven twelve thirteen')).toBe(5);
    expect(speakSeconds('')).toBe(0);
  });
  it('splits a script into short lines for the teleprompter and keeps the paragraph breaks', () => {
    const lines = prompterLines('a b c d e f g h i j k\n\nlast line', 5);
    expect(lines).toEqual(['a b c d e', 'f g h i j', 'k', '', 'last line']);
    expect(prompterLines('')).toEqual([]);
  });
  it('writes hashtags with one # each', () => {
    expect(hashtagLine(['#dev', 'discord bot', 'tips'])).toBe('#dev #discordbot #tips');
  });
});

describe('the pipeline', () => {
  it('starts as an idea, or as a script when a pack comes with it', () => {
    expect(newPiece({ title: ' A ' }).stage).toBe('idea');
    expect(newPiece({ title: 'A', pack: { hooks: [] } }).stage).toBe('script');
    expect(newPiece({ title: 'A' }).title).toBe('A');
  });
  it('moves forward and back, stops at the ends and stamps the moment it is posted', () => {
    let piece = newPiece({ title: 'A' });
    expect(moveStage(piece, -1, now).stage).toBe('idea');
    for (let i = 0; i < STAGES.length + 2; i += 1) piece = moveStage(piece, 1, now);
    expect(piece.stage).toBe('posted');
    expect(piece.postedAt).toBe(now);
    expect(moveStage(piece, -1, now + 5).postedAt).toBeNull();
  });
  it('groups by stage with the soonest scheduled first', () => {
    const pieces = [
      { id: 'a', stage: 'idea', scheduledAt: now + 2 * DAY, createdAt: 1 },
      { id: 'b', stage: 'idea', scheduledAt: now + DAY, createdAt: 2 },
      { id: 'c', stage: 'idea', scheduledAt: null, createdAt: 3 },
      { id: 'd', stage: 'posted', scheduledAt: null, createdAt: 4 },
    ];
    const groups = byStage(pieces);
    expect(groups.idea.map((p) => p.id)).toEqual(['b', 'a', 'c']);
    expect(groups.posted).toHaveLength(1);
    expect(groups.filmed).toEqual([]);
  });
  it('lists what should go out today, not what is posted or later', () => {
    const pieces = [
      { id: 'late', stage: 'edited', scheduledAt: now - DAY },
      { id: 'today', stage: 'edited', scheduledAt: now + 3600000 },
      { id: 'later', stage: 'edited', scheduledAt: now + 3 * DAY },
      { id: 'done', stage: 'posted', scheduledAt: now - DAY },
      { id: 'none', stage: 'idea', scheduledAt: null },
    ];
    expect(dueToPost(pieces, now).map((p) => p.id)).toEqual(['late', 'today']);
  });
});

describe('income', () => {
  it('cleans up an entry', () => {
    expect(newIncome({ amount: '1500000.4', source: 'nope' })).toMatchObject({ amount: 1500000, source: 'other' });
    expect(newIncome({ amount: -5 }).amount).toBe(0);
  });
  it('writes dong the Vietnamese way, and short', () => {
    expect(vnd(1250000)).toMatch(/^1[.\s]250[.\s]000\s?₫$/);
    expect(vndShort(1200000)).toBe('1,2 tr');
    expect(vndShort(12500000)).toBe('13 tr');
    expect(vndShort(850000)).toBe('850 k');
    expect(vndShort(500)).toBe('500');
  });
  it('totals a month and splits it by source', () => {
    const entries = [inc(3000000, 'freelance'), inc(1000000, 'sponsor', 1), inc(500000, 'freelance', 40)];
    const key = monthKeyOf(now);
    expect(monthTotal(entries, key)).toBe(4000000);
    const rows = bySource(entries, key);
    expect(rows.map((r) => r.source)).toEqual(['freelance', 'sponsor']);
    expect(rows[0].share).toBeCloseTo(0.75);
  });
  it('gives the last six months, oldest first', () => {
    const t = trend([inc(100, 'other', 0), inc(200, 'other', 35)], monthKeyOf(now), 6);
    expect(t).toHaveLength(6);
    expect(t.at(-1).total).toBe(100);
    expect(t.at(-2).total).toBe(200);
    expect(t[0].month < t.at(-1).month).toBe(true);
  });
  it('measures the month against a goal', () => {
    const g = goalProgress({ total: 3000000, goal: 10000000, now }); // day 12 of 30
    expect(g).toMatchObject({ pct: 30, remaining: 7000000, daysLeft: 18, reached: false });
    expect(g.neededPerDay).toBe(Math.ceil(7000000 / 18));
    expect(g.projected).toBe(Math.round((3000000 / 12) * 30));
    expect(goalProgress({ total: 12000000, goal: 10000000, now })).toMatchObject({ pct: 100, remaining: 0, reached: true });
    expect(goalProgress({ total: 5, goal: 0, now }).pct).toBe(0);
  });
  it('credits income to the piece of content it came from', () => {
    const pieces = [{ id: 'p1', title: 'One' }, { id: 'p2', title: 'Two' }];
    const entries = [inc(100, 'sponsor', 0, { pieceId: 'p2' }), inc(300, 'sponsor', 1, { pieceId: 'p2' }), inc(50, 'sponsor', 2, { pieceId: 'p1' }), inc(900, 'other')];
    expect(earningsByPiece(entries, pieces).map((r) => [r.piece.id, r.amount])).toEqual([['p2', 400], ['p1', 50]]);
  });
});

describe('what the income says', () => {
  it('asks for a first entry when there is none', () => {
    expect(insights([], 0, now)).toHaveLength(1);
  });
  it('warns when one source is nearly all of the month', () => {
    const list = insights([inc(9000000, 'freelance'), inc(500000, 'sponsor')], 0, now);
    expect(list[0]).toMatchObject({ tone: 'warn' });
    expect(list[0].text).toMatch(/Client work/);
  });
  it('tells whether the goal is in reach, and what each day needs', () => {
    expect(insights([inc(8000000, 'freelance'), inc(3000000, 'sponsor')], 10000000, now).some((i) => i.tone === 'good' && /goal/.test(i.text))).toBe(true);
    const behind = insights([inc(1000000, 'freelance'), inc(500000, 'sponsor')], 20000000, now);
    expect(behind.some((i) => /a day/.test(i.text))).toBe(true);
  });
  it('compares with last month and notices a dry spell', () => {
    const up = insights([inc(2000000, 'freelance', 1), inc(1000000, 'sponsor', 2), inc(1500000, 'freelance', 20)], 0, now);
    expect(up.some((i) => /more than last month/.test(i.text))).toBe(true);
    const quiet = insights([inc(1000000, 'freelance', 20), inc(900000, 'sponsor', 25)], 0, now);
    expect(quiet.some((i) => /No income logged for 20 days/.test(i.text))).toBe(true);
  });
});

describe('deals', () => {
  const deal = (stage, value, followUpAt = null) => ({ id: `${stage}${value}`, ...newDeal({ name: 'X', value, followUpAt }), stage });
  it('adds up what is open, what it is worth weighted by stage, and what is won', () => {
    const deals = [deal('lead', 10000000), deal('negotiating', 20000000), deal('won', 5000000), deal('lost', 7000000)];
    expect(pipelineValue(deals)).toEqual({ open: 30000000, weighted: 11000000, won: 5000000 });
  });
  it('lists follow-ups that are due, longest overdue first, and the deals nobody will remember', () => {
    const deals = [deal('contacted', 1, now - DAY), deal('lead', 2, now + 3600000), deal('lead', 3, now + 5 * DAY), deal('won', 4, now - DAY), deal('lead', 5, null)];
    expect(dueFollowUps(deals, now).map((d) => d.value)).toEqual([1, 2]);
    expect(forgotten(deals).map((d) => d.value)).toEqual([5]);
  });
  it('knows the win rate only once something is closed', () => {
    expect(winRate([deal('lead', 1)])).toBeNull();
    expect(winRate([deal('won', 1), deal('won', 2), deal('lost', 3), deal('lead', 4)])).toBe(67);
  });
});

describe('pricing', () => {
  it('prices a job from the hourly target, hours, a buffer and a discount', () => {
    expect(packagePrice({ hourly: 300000, hours: 10 })).toEqual({ base: 3000000, buffer: 450000, discount: 0, total: 3450000 });
    expect(packagePrice({ hourly: 300000, hours: 10, bufferPct: 0, discountPct: 10 })).toEqual({ base: 3000000, buffer: 0, discount: 300000, total: 2700000 });
    expect(packagePrice({ hourly: -1, hours: 5 }).total).toBe(0);
  });
  it('turns average views and a CPM into a low, middle and high ask', () => {
    expect(sponsorRate({ avgViews: 20000, cpm: 50000 })).toEqual({ low: 700000, mid: 1000000, high: 1400000 });
    expect(sponsorRate({ avgViews: 20000, cpm: 50000, extraPct: 50 }).mid).toBe(1500000);
    expect(sponsorRate({ avgViews: 0, cpm: 50000 }).mid).toBe(0);
  });
  it('totals a quote with a discount and VAT, ignoring nonsense', () => {
    const items = [{ desc: 'Bot', qty: 1, unit: 2000000 }, { desc: 'Hosting setup', qty: 2, unit: 500000 }, { desc: 'bad', qty: -3, unit: 'x' }];
    expect(quoteTotals(items, { discountPct: 10, vatPct: 8 })).toEqual({ subtotal: 3000000, discount: 300000, vat: 216000, total: 2916000 });
    expect(quoteTotals([])).toEqual({ subtotal: 0, discount: 0, vat: 0, total: 0 });
  });
});

describe('the Discord blueprint', () => {
  it('has the parts of a server, with the community name in the welcome', () => {
    const bp = blueprintFor('dev', 'Hank Devs');
    expect(bp.categories.length).toBeGreaterThanOrEqual(3);
    expect(bp.categories.flatMap((c) => c.channels).some((c) => c.name === 'rules')).toBe(true);
    expect(bp.welcome).toContain('Hank Devs');
    expect(bp.roles.some((r) => r.name === 'Owner')).toBe(true);
    expect(blueprintFor('nope').label).toBe(blueprintFor('dev').label);
  });
  it('says that payment for tiers happens outside Discord', () => {
    const text = blueprintText(blueprintFor('creator', 'Fans'));
    expect(text).toContain('outside page');
    expect(text).toContain('- [ ] Category: START HERE');
    expect(text).toContain('#rules (text)');
  });
});

describe('a printable quote', () => {
  it('writes the lines and totals, and escapes everything it was given', () => {
    const html = quoteHtml({ from: 'Hank <script>alert(1)</script>', to: 'A & B', title: 'Bot "setup"', items: [{ desc: '<b>Bot</b>', qty: 1, unit: 2000000 }, { desc: '', qty: 1, unit: 5 }], discountPct: 10, vatPct: 8, terms: 'Pay 50% first' });
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>Bot</b>');
    expect(html).toContain('&lt;b&gt;Bot&lt;/b&gt;');
    expect(html).toContain('A &amp; B');
    expect(html).toContain('Giảm giá (10%)');
    expect(html).toContain('VAT (8%)');
    expect(html).toContain('Pay 50% first');
    expect(html.match(/<tr><td>/g)).toHaveLength(1); // the empty line is left out
  });
  it('leaves out discount and VAT lines when there are none', () => {
    const html = quoteHtml({ from: 'A', items: [{ desc: 'x', qty: 2, unit: 1000 }] });
    expect(html).not.toContain('Giảm giá');
    expect(html).not.toContain('VAT (');
    expect(html).toContain('Tổng cộng');
  });
});
