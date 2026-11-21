import { describe, expect, it } from 'vitest';
import { monthStarts, yearCells } from './pixels';

describe('year in pixels', () => {
  const notes = [
    { day: '2026-01-01', mood: 4, text: 'Năm mới', updatedAt: 2 },
    { day: '2026-03-10', mood: 0, text: '', updatedAt: 1 }, // an empty page does not count
  ];
  const habits = [
    { name: 'Đọc', days: ['2026-01-01', '2026-01-02'] },
    { name: 'Chạy', days: ['2026-01-01'] },
  ];
  const cells = yearCells({ year: 2026, notes, habits, today: '2026-11-21' });

  it('has a cell for every day, Monday on top', () => {
    expect(cells).toHaveLength(365);
    // 1 January 2026 is a Thursday
    expect(cells[0]).toMatchObject({ day: '2026-01-01', week: 0, weekday: 3 });
    expect(cells[4]).toMatchObject({ day: '2026-01-05', week: 1, weekday: 0 });
  });

  it('colours by mood and by habits kept, and knows the future', () => {
    expect(cells[0]).toMatchObject({ mood: 4, written: true, habits: 1 });
    expect(cells[1]).toMatchObject({ mood: 0, written: false, habits: 0.5 });
    expect(cells.find((c) => c.day === '2026-03-10').written).toBe(false);
    expect(cells.find((c) => c.day === '2026-12-01').future).toBe(true);
  });

  it('marks where the months start', () => {
    const starts = monthStarts(cells);
    expect(starts).toHaveLength(12);
    expect(starts[0]).toEqual({ month: 0, week: 0 });
  });
});
