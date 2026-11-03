import { dayKey } from '../notes/notes';
import { daysBetween, diaryStreak, journeyStats, writtenDays } from '../diary/model';
import { summarize } from '../focus/stats';

// Mơ, the little apricot who walks the journey with you. How she feels and how far she has grown come from what you did:
// pages written in the diary and focus sessions finished. As plain functions, so all of it is tested.

export const PET_NAME = 'Mơ';

export const STAGES = [
  { id: 'baby', name: 'Mầm non', min: 0 },
  { id: 'kid', name: 'Nhóc con', min: 6 },
  { id: 'traveler', name: 'Lữ khách', min: 24 },
  { id: 'explorer', name: 'Nhà thám hiểm', min: 75 },
  { id: 'legend', name: 'Huyền thoại', min: 200 },
];

/** A page in the diary is worth three, a finished focus session one. */
export const growthPoints = ({ entries = 0, focusSessions = 0 }) => entries * 3 + focusSessions;

/** Which stage `points` reach, the next one (or null), and how far along to it (0 to 1). */
export const stageOf = (points) => {
  const index = STAGES.reduce((at, stage, i) => (points >= stage.min ? i : at), 0);
  const next = STAGES[index + 1] ?? null;
  return { stage: STAGES[index], index, next, left: next ? next.min - points : 0, progress: next ? (points - STAGES[index].min) / (next.min - STAGES[index].min) : 1 };
};

const BIG_DAYS = [7, 14, 30, 50, 100, 200, 365];

/**
 * How she feels. In order: asleep at night; over the moon after a great day (a page and a long focus, or a landmark streak);
 * happy after anything done; missing you after three days away; worried when tonight could break a streak; otherwise calm.
 */
export const petMood = ({ hour, wroteToday, focusToday, streak, daysAway, entries }) => {
  if (hour >= 23 || hour < 5) return 'sleepy';
  if (wroteToday && (focusToday >= 25 || BIG_DAYS.includes(streak))) return 'excited';
  if (wroteToday || focusToday > 0) return 'happy';
  if (entries > 0 && daysAway >= 3) return 'lonely';
  if (hour >= 20 && streak > 0) return 'worried';
  return 'calm';
};

const LINES = {
  sleepy: ['Zzz… mình buồn ngủ rồi. Mai đi tiếp nhé.', 'Khuya rồi, nghỉ thôi bạn ơi.', 'Mình ngủ trước đây… chúc bạn mơ đẹp.'],
  excited: ['Hôm nay tuyệt quá! Mình nhảy cẫng lên luôn!', 'Một ngày đầy ắp. Mình tự hào về bạn lắm!', 'Ôi, bạn làm được hết rồi. Ăn mừng thôi!'],
  happy: ['Mình vui lắm. Cảm ơn bạn đã ghé qua.', 'Hôm nay tốt rồi đó. Cứ nhẹ nhàng đi tiếp nhé.', 'Có bạn đi cùng, mình thấy ấm áp ghê.'],
  lonely: ['Mấy hôm nay mình nhớ bạn… kể mình nghe nhé?', 'Đường vắng quá. Mình chờ bạn nãy giờ đó.', 'Quay lại với mình nha, mình giữ chỗ cho bạn rồi.'],
  worried: ['Tối rồi mà trang hôm nay vẫn trống… viết vài dòng nhé?', 'Giữ chuỗi ngày nào bạn ơi, chỉ cần một dòng thôi.', 'Mình hơi lo cho chuỗi ngày của bạn đó nha.'],
  calm: ['Chào bạn. Hôm nay mình đi đâu đây?', 'Mình đang đợi bạn kể chuyện hôm nay.', 'Một ngày mới. Mình sẵn sàng lên đường rồi.'],
};

export const TAP_LINES = ['Hihi, nhột quá!', 'Mình ở đây nè.', 'Ôm cái nào!', 'Đi tiếp thôi bạn ơi.', 'Bạn làm mình vui ghê.'];

/** One of her lines for this mood; the same `seed` always gives the same line. */
export const lineFor = (mood, seed = 0) => {
  const lines = LINES[mood] ?? LINES.calm;
  return lines[Math.abs(Math.floor(seed)) % lines.length];
};

/** What she wears: a scarf from the kid stage, a backpack for the traveler, a hat for the explorer, a star for the legend. */
export const outfitOf = (stageId) => {
  const rank = STAGES.findIndex((s) => s.id === stageId);
  return { scarf: rank >= 1, backpack: rank >= 2, hat: rank >= 3, star: rank >= 4 };
};

/** Everything the screens need to draw and word her, from the diary pages, the focus log and the time. */
export const derivePet = ({ notes, log, now = new Date() }) => {
  const today = dayKey(now);
  const days = writtenDays(notes);
  const stats = journeyStats(notes, today);
  const focus = summarize(log, now);
  const points = growthPoints({ entries: stats.total, focusSessions: focus.totalSessions });
  const growth = stageOf(points);
  const hour = now.getHours();
  const mood = petMood({
    hour,
    wroteToday: days.includes(today),
    focusToday: focus.today.minutes,
    streak: diaryStreak(notes, today),
    daysAway: days.length ? daysBetween(days[days.length - 1], today) : 0,
    entries: stats.total,
  });
  // a new line each hour, so she is not repeating herself, but she does not flicker while you look
  const seed = Number(today.replaceAll('-', '')) + hour;
  return { name: PET_NAME, mood, line: lineFor(mood, seed), points, ...growth, outfit: outfitOf(growth.stage.id), stats, focusToday: focus.today.minutes };
};
