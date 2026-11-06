import { vi as vitest } from 'vitest';

// these tests check the Vietnamese text, so the workspace is put in Vietnamese before anything is imported
vitest.hoisted(() => {
  globalThis.__HANK_LANG__ = 'vi';
});

import { describe, expect, it } from 'vitest';
import { battleUrl, describeShot, inviteLink, normalizeCode, statusOf } from './online';

describe('room codes and links', () => {
  it('cleans what was typed or pasted into a code', () => {
    expect(normalizeCode(' ab-cd ')).toBe('ABCD');
    expect(normalizeCode('abcdefg')).toBe('ABCD');
    expect(normalizeCode('a0o1i')).toBe('A'); // 0, O, 1 and I are never in a code
    expect(normalizeCode(undefined)).toBe('');
  });

  it('builds the invite link into the demo, so a friend needs no password', () => {
    expect(inviteLink('K7QM', 'https://hank62dev.vercel.app')).toBe('https://hank62dev.vercel.app/spacehank?demo&tab=play&game=boats&room=K7QM');
  });

  it('puts the battle on the same server as the realtime link', () => {
    expect(battleUrl('wss://hank.example.com')).toBe('wss://hank.example.com/battle');
    expect(battleUrl('ws://localhost:8787/')).toBe('ws://localhost:8787/battle');
  });
});

describe('words about the game', () => {
  const room = (patch) => ({ seat: 0, phase: 'play', turn: 0, winner: null, names: ['An', 'Binh'], present: [true, true], ready: [true, true], ...patch });

  it('describes a shot from my side', () => {
    expect(describeShot({ by: 0, cell: 13, outcome: 'hit' }, 0, ['An', 'Binh'])).toBe('Bạn bắn B4: trúng!');
    expect(describeShot({ by: 1, cell: 99, outcome: 'sunk' }, 0, ['An', 'Binh'])).toBe('Binh bắn J10: chìm một chiếc!');
    expect(describeShot({ by: 1, cell: 0, outcome: 'miss' }, 0, [null, null])).toBe('Đối thủ bắn A1: trượt');
    expect(describeShot(null, 0, [])).toBe('');
  });

  it('says what is going on in every phase', () => {
    expect(statusOf(null)).toBe('');
    expect(statusOf(room({ phase: 'wait' }))).toMatch(/đợi/i);
    expect(statusOf(room({ phase: 'place', ready: [false, false] }))).toMatch(/xếp/i);
    expect(statusOf(room({ phase: 'place', ready: [true, false] }))).toBe('Đợi Binh xếp tàu…');
    expect(statusOf(room({ turn: 0 }))).toMatch(/lượt bạn/);
    expect(statusOf(room({ turn: 1 }))).toBe('Binh đang ngắm…');
    expect(statusOf(room({ present: [true, false] }))).toMatch(/mất kết nối/);
    expect(statusOf(room({ phase: 'over', winner: 0 }))).toBe('Bạn thắng rồi!');
    expect(statusOf(room({ phase: 'over', winner: 1 }))).toBe('Binh thắng');
  });
});
