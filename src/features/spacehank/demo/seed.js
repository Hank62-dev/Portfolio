import { addSamples, loadLibrary } from '../music/library';
import { habits, sampleHabits } from '../habits/store';
import { seedDemoLog } from '../focus/log';
import { memos } from '../memos/store';
import { sampleCards, missions } from '../missions/store';
import { createNote } from '../notes/library';
import { sampleNotes } from '../notes/graph';
import { storage } from '../storage';
import { saveImage } from '../studio/gallery';
import { courses, flashcards, sampleStudy } from '../study/store';
import { entries, sampleEntries } from '../wallet/store';

// The first time someone opens the demo, every tab is filled with made-up data so there is something to use.
// A marker in localStorage says it was done; "Reset demo" clears the demo database and the marker.
const MARK = 'hank62.demo.seeded.v1';
const EXTRA_KEYS = ['hank62.demo.docs', 'hank62.demo.ai', 'spacehank.constellation', 'hank62.demo.focus.log'];

const seeded = () => {
  try {
    return Boolean(localStorage.getItem(MARK));
  } catch {
    return false;
  }
};

/** A short, quiet recording so a voice memo has something to play. */
const quietWav = (seconds = 4) => {
  const rate = 8000;
  const count = rate * seconds;
  const buffer = new ArrayBuffer(44 + count * 2);
  const view = new DataView(buffer);
  const text = (offset, value) => [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, 36 + count * 2, true);
  text(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, count * 2, true);
  for (let i = 0; i < count; i += 1) view.setInt16(44 + i * 2, Math.round(Math.sin(i / 14) * 900 * Math.sin((i / count) * Math.PI)), true);
  return new Blob([buffer], { type: 'audio/wav' });
};

const sampleMemos = (now = Date.now()) => [
  { title: 'Ý tưởng cho buổi demo', transcript: 'Ý tưởng cho buổi demo: mở đầu bằng bản đồ các ngôi sao, rồi cho xem Hank trả lời từ tài liệu.', duration: 4, at: now - 3 * 3600000 },
  { title: 'Remember to book the flight', transcript: 'Remember to book the flight to Da Nang before the price goes up.', duration: 4, at: now - 26 * 3600000 },
].map((memo, i) => ({
  id: crypto.randomUUID(),
  createdAt: memo.at,
  updatedAt: memo.at,
  ...memo,
  blob: quietWav(memo.duration),
  mime: 'audio/wav',
  peaks: Array.from({ length: 48 }, (_, k) => 0.15 + 0.7 * Math.abs(Math.sin((k + i * 5) / 4.5)) * Math.abs(Math.cos(k / 11))),
}));

/** Fills the demo database once. Safe to call every time; it does nothing when the demo has been set up already. */
let inflight = null;
export const seedDemo = () => (inflight ??= setUp());

const setUp = async () => {
  if (seeded()) return;
  for (const n of sampleNotes()) await createNote(n.text, { sample: true });
  await missions.putMany(sampleCards());
  await entries.putMany(sampleEntries());
  const study = sampleStudy();
  await courses.put(study.course);
  await flashcards.putMany(study.cards);
  await habits.putMany(sampleHabits());
  await memos.putMany(sampleMemos());
  seedDemoLog();
  try {
    const { drawSamplePictures } = await import('../studio/sample');
    for (const { prompt, blob } of await drawSamplePictures()) await saveImage({ prompt, blob, sample: true });
  } catch {
    /* the pictures are a nicety; the demo works without them */
  }
  await loadLibrary();
  await addSamples();
  try {
    localStorage.setItem(MARK, '1');
  } catch {
    /* without storage the demo is simply set up again next time */
  }
};

/** Empties the demo database and the notes kept beside it, so the next load starts from the made-up data again. */
export const resetDemo = async () => {
  await Promise.all(Object.values(storage).map((table) => table.clear()));
  try {
    for (const key of [MARK, ...EXTRA_KEYS]) localStorage.removeItem(key);
    sessionStorage.removeItem('hank62.demo.ai');
  } catch {
    /* nothing to clear */
  }
};
