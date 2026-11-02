// What Hank "says" in the demo. There is no AI behind it: small rules over the visitor's own demo data, written to give the
// same shapes the real services return (see api/owner.js and api/rag.js), so every screen behaves as it does for real.

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const thinking = () => sleep(500 + Math.random() * 600);

const words = (text) => String(text ?? '').toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) ?? [];
const isVietnamese = (text) => /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i.test(text);
const hash = (text) => [...String(text)].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);

// ---- AI usage -----------------------------------------------------------------------------------------------------

const USED = 'hank62.demo.ai';
const used = () => {
  try {
    return Number(sessionStorage.getItem(USED)) || 0;
  } catch {
    return 0;
  }
};
const count = () => {
  try {
    sessionStorage.setItem(USED, String(used() + 1));
  } catch {
    /* the counter is only for show */
  }
};

export const aiUsage = async () => ({ used: used(), limit: 60, text: true, image: 'demo' });

// ---- the DJ -------------------------------------------------------------------------------------------------------

// words people say for a mood, and the genres of the sample library that fit
const MOODS = [
  [/focus|code|coding|study|work|tập trung|học|làm việc|deep/, ['lofi', 'ambient']],
  [/chill|relax|calm|sleep|thư giãn|ngủ|nhẹ nhàng|rain|mưa/, ['ambient', 'lofi']],
  [/night|late|đêm|drive|commute|lái xe/, ['synthwave', 'lofi']],
  [/happy|energy|gym|run|vui|sôi động|morning|sáng|party/, ['indie', 'synthwave']],
];

export const djPick = async ({ mood, tracks }) => {
  count();
  await thinking();
  const wanted = MOODS.find(([pattern]) => pattern.test(String(mood).toLowerCase()))?.[1] ?? [];
  const terms = words(mood);
  const scored = tracks
    .map((t) => {
      const haystack = `${t.title} ${t.artist} ${t.genre}`.toLowerCase();
      return { id: t.id, score: (wanted.includes(t.genre) ? 3 : 0) + terms.filter((w) => haystack.includes(w)).length };
    })
    .sort((a, b) => b.score - a.score);
  const picked = scored.filter((s) => s.score > 0).slice(0, 4);
  const ids = (picked.length ? picked : scored.slice(0, 3)).map((s) => s.id);
  return { ids, note: isVietnamese(mood) ? `Một mix cho "${mood}" (demo, chọn theo thể loại).` : `A mix for "${mood}" (demo: picked by genre).` };
};

// ---- the morning note ---------------------------------------------------------------------------------------------

export const aiNote = async ({ context = {} } = {}) => {
  count();
  await thinking();
  const busy = context.schedule?.length ? `You have ${context.schedule.length} things today, starting with ${context.schedule[0]}.` : 'Your calendar is clear.';
  const agents = context.agentsWorking ? ` ${context.agentsWorking} agents are at work.` : '';
  return { text: `${busy}${agents} Take the hard thing first, and let the rest follow.` };
};

// ---- questions to the notes ---------------------------------------------------------------------------------------

const firstSentence = (text) => {
  const body = String(text).split('\n').slice(1).join(' ').replace(/#[\p{L}\p{N}_-]+/gu, '').trim() || String(text);
  return (body.match(/[^.!?]+[.!?]?/)?.[0] ?? body).trim().slice(0, 160);
};

export const askNotes = async ({ question, notes = [] }) => {
  count();
  await thinking();
  if (!notes.length) return { answer: isVietnamese(question) ? 'Mình không thấy ghi chú nào nói về điều này. (Đây là demo, mình chỉ tìm trong ghi chú mẫu.)' : 'I found nothing in the notes about that. (This is a demo: it only looks through the sample notes.)', cited: [] };
  const top = notes.slice(0, 3);
  const body = top.map((n, i) => `${n.title}: ${firstSentence(n.text)} [${i + 1}]`).join('\n\n');
  return { answer: `${isVietnamese(question) ? 'Theo ghi chú của bạn:' : 'From your notes:'}\n\n${body}`, cited: top.map((_, i) => i + 1) };
};

// ---- "do what I said" ---------------------------------------------------------------------------------------------

const TABS = [
  ['rag', /hank rag|chat|hỏi hank|trợ lý/],
  ['docs', /document|vault|tài liệu|file/],
  ['notes', /note|ghi chú|second brain|journal|nhật ký/],
  ['constellation', /constellation|sao|bản đồ/],
  ['memos', /memo|voice|ghi âm/],
  ['music', /music|nhạc|bài hát|song/],
  ['studio', /studio|image|ảnh|hình|brand/],
  ['missions', /mission|board|kanban|thẻ|công việc/],
  ['study', /study|học|flashcard|deadline|thi/],
  ['habits', /habit|thói quen|garden/],
  ['wallet', /wallet|ví|chi tiêu|tiền/],
  ['pulse', /pulse|github|repo|dev/],
  ['shell', /shell|bash|terminal|lệnh/],
  ['space', /spaceworkai|floor|agent|robot|không gian/],
  ['hank', /home|trang chủ|dashboard|tổng quan/],
];

export const interpretCommand = async ({ text, catalog = [] }) => {
  count();
  await thinking();
  const said = String(text).trim();
  const lower = said.toLowerCase();
  const has = (id) => catalog.some((c) => c.id === id);
  const rest = (pattern) => said.replace(pattern, '').replace(/^[\s:,-]+/, '').trim();

  if (/\d+\s?(k|tr|nghìn|ngàn|triệu|đ|vnd)\b/i.test(said) && has('log_money')) return { action: 'log_money', params: { text: said } };
  if (/(pause|dừng|tạm dừng)\b.*(nhạc|music|song)|^(pause|dừng nhạc)/.test(lower)) return { action: 'music', params: { do: 'pause' } };
  if (/(resume|tiếp tục)\b.*(nhạc|music)/.test(lower)) return { action: 'music', params: { do: 'resume' } };
  if (/(next|bài tiếp|qua bài)/.test(lower)) return { action: 'music', params: { do: 'next' } };
  const minutes = lower.match(/(\d{1,3})\s*(phút|minutes?|min)\b/)?.[1];
  if (minutes && /(timer|hẹn giờ|tắt nhạc|sleep)/.test(lower)) return { action: 'sleep_timer', params: { minutes: Number(minutes) } };
  if (/(play|phát|mở nhạc|bật nhạc)/.test(lower)) return { action: 'play_mood', params: { mood: rest(/^(play|phát|mở nhạc|bật nhạc)/i) || 'something to listen to' } };
  if (/^(note|ghi chú|ghi lại|lưu)\b/.test(lower)) return { action: 'new_note', params: { text: rest(/^(note|ghi chú|ghi lại|lưu)/i) } };
  if (/^(card|thẻ|thêm thẻ|task card)\b/.test(lower)) return { action: 'new_card', params: { title: rest(/^(card|thẻ|thêm thẻ|task card)/i) } };
  if (/^(draw|vẽ|tạo ảnh|image)\b/.test(lower)) return { action: 'draft_image', params: { prompt: rest(/^(draw|vẽ|tạo ảnh|image)/i) } };
  if (/^(search|tìm)\b/.test(lower)) return { action: 'search_notes', params: { query: rest(/^(search|tìm)/i) } };
  if (/(\?|^ask|^hỏi|là gì|what|why|how)/.test(lower) && has('ask_notes')) return { action: 'ask_notes', params: { question: said } };
  const tab = TABS.find(([, pattern]) => pattern.test(lower))?.[0];
  if (tab && /(open|go|mở|vào|đi tới|chuyển)/.test(lower)) return { action: 'navigate', params: { tab } };
  return { action: 'none', say: 'In the demo I understand simple things: open a tab, play music, add a note or a card, log money like "ăn trưa 45k".' };
};

// ---- flashcards from a text ---------------------------------------------------------------------------------------

export const generateCards = async ({ text, limit = 6 }) => {
  count();
  await thinking();
  const sentences = String(text).replace(/\s+/g, ' ').match(/[^.!?]{20,}[.!?]/g) ?? [];
  const cards = sentences.slice(0, Math.min(limit, 8)).map((sentence) => {
    const clean = sentence.trim();
    const split = clean.match(/^(.{3,60}?)\s+(is|are|means|là|gồm|được gọi là)\s+(.+)$/i);
    return split
      ? { front: `${isVietnamese(clean) ? '' : 'What '}${split[2].toLowerCase() === 'là' ? '' : ''}${isVietnamese(clean) ? `${split[1]} là gì?` : `${split[2].toLowerCase() === 'are' ? 'are' : 'is'} ${split[1]}?`}`.trim(), back: split[3].replace(/[.!?]$/, '') }
      : { front: `Explain: ${clean.split(' ').slice(0, 6).join(' ')}…`, back: clean };
  });
  if (!cards.length) throw new Error('Paste a few full sentences and Hank will turn them into cards.');
  return { cards };
};

// ---- pictures -----------------------------------------------------------------------------------------------------

/** A soft abstract picture seeded by the prompt, drawn on a canvas and returned the way the server does (base64 + mime). */
export const generateImage = async (prompt) => {
  count();
  await sleep(900 + Math.random() * 700);
  const seed = hash(prompt);
  const size = 768;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const hue = seed % 360;
  const sky = ctx.createLinearGradient(0, 0, size, size);
  sky.addColorStop(0, `hsl(${hue} 70% 14%)`);
  sky.addColorStop(1, `hsl(${(hue + 70) % 360} 75% 38%)`);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 9; i += 1) {
    const s = hash(`${prompt}${i}`);
    const x = (s % 1000) / 1000 * size;
    const y = ((s >> 5) % 1000) / 1000 * size;
    const r = 70 + ((s >> 9) % 220);
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
    glow.addColorStop(0, `hsl(${(hue + (s % 140)) % 360} 85% 68% / 0.55)`);
    glow.addColorStop(1, `hsl(${(hue + (s % 140)) % 360} 85% 68% / 0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return { data: canvas.toDataURL('image/png').split(',')[1], mime: 'image/png' };
};

// ---- Hank RAG and the document vault ------------------------------------------------------------------------------

const DOCS = 'hank62.demo.docs';
const SEED_DOCS = [
  { id: 'demo-doc-1', name: 'Portfolio brief.pdf', chunks: 14 },
  { id: 'demo-doc-2', name: 'Database Systems notes.md', chunks: 27 },
  { id: 'demo-doc-3', name: 'Trip to Da Nang.txt', chunks: 6 },
];

const readDocs = () => {
  try {
    return JSON.parse(localStorage.getItem(DOCS) ?? 'null') ?? SEED_DOCS;
  } catch {
    return SEED_DOCS;
  }
};
const writeDocs = (list) => {
  try {
    localStorage.setItem(DOCS, JSON.stringify(list));
  } catch {
    /* the list just forgets itself on reload */
  }
};

export const listDocuments = async () => {
  await sleep(250);
  return readDocs();
};

export const uploadDocument = async ({ file }) => {
  await sleep(700 + Math.random() * 600);
  const chunks = Math.max(2, Math.ceil((file?.size ?? 2000) / 900));
  writeDocs([{ id: `demo-doc-${Date.now()}`, name: file?.name ?? 'Untitled', chunks }, ...readDocs()]);
  return chunks;
};

export const deleteDocument = async (id) => {
  await sleep(200);
  writeDocs(readDocs().filter((d) => d.id !== id));
};

const GREETING = /^(xin chào|chào|hello|hi|hey|alo)\b/i;

export const askRag = async ({ message, web = 'auto' }) => {
  await thinking();
  const text = String(message).trim();
  const vi = isVietnamese(text) || /(là gì|giúp|cho mình|tôi|mình)/i.test(text);
  const docs = readDocs();

  if (GREETING.test(text)) {
    return { text: vi ? 'Xin chào! Mình là Hank. Mình trả lời được nhiều chủ đề, đọc tài liệu bạn đã thêm vào Vault, và tìm trên web khi cần. Bạn muốn hỏi gì?' : 'Hi! I am Hank. I can answer on many topics, read the documents you added to the Vault, and search the web when needed. What would you like to know?', verified: false, citations: [], source: 'general_knowledge' };
  }
  const inDocs = docs.find((d) => words(text).some((w) => w.length > 3 && d.name.toLowerCase().includes(w))) ?? (/(tài liệu|document|vault|file|summar|tóm tắt)/i.test(text) ? docs[0] : null);
  if (inDocs && web !== 'on') {
    return {
      text: vi ? `Mình tìm thấy nội dung liên quan trong "${inDocs.name}" (${inDocs.chunks} đoạn). Đây là bản demo nên mình chưa đọc thật, nhưng khi bạn dùng bản riêng, Hank sẽ trích đoạn đúng và dẫn nguồn như thế này.` : `I found related material in "${inDocs.name}" (${inDocs.chunks} chunks). This is a demo, so nothing is really read, but in your own workspace Hank quotes the right passage and cites it like this.`,
      verified: true,
      citations: [{ name: inDocs.name, url: '' }],
      source: 'rag',
    };
  }
  if (web === 'on' || (web === 'auto' && /(today|hôm nay|mới nhất|latest|news|tin|giá|thời tiết|weather)/i.test(text))) {
    return {
      text: vi ? 'Với câu hỏi này Hank sẽ tìm trên web rồi tóm tắt kèm nguồn. Trong demo mình không ra ngoài mạng, nên đây chỉ là câu trả lời mẫu.' : 'For a question like this Hank searches the web and summarises it with sources. The demo stays offline, so this is only a sample answer.',
      verified: false,
      citations: [{ name: 'example.com/news', url: 'https://example.com' }],
      source: 'web',
    };
  }
  return {
    text: vi ? `Về "${text.slice(0, 80)}": trong demo mình trả lời mẫu thôi. Bản thật dùng mô hình AI, đọc tài liệu của bạn và tìm web khi cần. Thử hỏi "tóm tắt tài liệu của tôi" để xem cách dẫn nguồn.` : `About "${text.slice(0, 80)}": in the demo I only give sample answers. The real one uses an AI model, reads your documents and searches the web when needed. Try "summarise my documents" to see how sources are cited.`,
    verified: false,
    citations: [],
    source: 'general_knowledge',
  };
};
