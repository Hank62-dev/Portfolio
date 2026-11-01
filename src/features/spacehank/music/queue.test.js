import { describe, expect, it } from 'vitest';
import { advance, createQueue, enqueue, playNext, prune, retreat } from './queue';

const ids = ['a', 'b', 'c', 'd'];
const steady = () => 0.99; // a "random" that leaves the shuffle in a known order

describe('createQueue', () => {
  it('keeps the order and starts where asked', () => {
    expect(createQueue(ids, { startId: 'c' })).toEqual({ order: ids, index: 2 });
    expect(createQueue(ids, { startId: 'nope' }).index).toBe(0);
    expect(createQueue([])).toEqual({ order: [], index: -1 });
  });

  it('puts the chosen track first when shuffled and loses nothing', () => {
    const q = createQueue(ids, { startId: 'c', shuffle: true });
    expect(q.order[0]).toBe('c');
    expect(q.index).toBe(0);
    expect([...q.order].sort()).toEqual(ids);
    expect(createQueue(ids, { startId: 'a', shuffle: true, random: steady }).order).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('advance and retreat', () => {
  const q = { order: ids, index: 2 };

  it('moves on, and stops at the end when it ended by itself and repeat is off', () => {
    expect(advance(q, 'off', { auto: true }).queue.index).toBe(3);
    expect(advance({ order: ids, index: 3 }, 'off', { auto: true }).ended).toBe(true);
  });

  it('wraps for repeat-all and for a pressed next button', () => {
    expect(advance({ order: ids, index: 3 }, 'all', { auto: true }).queue.index).toBe(0);
    expect(advance({ order: ids, index: 3 }, 'off').queue.index).toBe(0);
  });

  it('stays on the track for repeat-one when it ends, but a pressed next still moves', () => {
    expect(advance(q, 'one', { auto: true }).queue.index).toBe(2);
    expect(advance(q, 'one').queue.index).toBe(3);
  });

  it('goes back and wraps to the last track', () => {
    expect(retreat(q).index).toBe(1);
    expect(retreat({ order: ids, index: 0 }).index).toBe(3);
  });

  it('copes with an empty queue', () => {
    expect(advance({ order: [], index: -1 }, 'all').ended).toBe(true);
    expect(retreat({ order: [], index: -1 })).toEqual({ order: [], index: -1 });
  });
});

describe('editing the queue', () => {
  it('queues a track to play next, moving it if it was already there', () => {
    expect(playNext({ order: ids, index: 0 }, 'd')).toEqual({ order: ['a', 'd', 'b', 'c'], index: 0 });
    expect(playNext({ order: ids, index: 2 }, 'a')).toEqual({ order: ['b', 'c', 'a', 'd'], index: 1 });
  });

  it('adds to the end once', () => {
    expect(enqueue({ order: ['a'], index: 0 }, 'b').order).toEqual(['a', 'b']);
    const same = { order: ['a'], index: 0 };
    expect(enqueue(same, 'a')).toBe(same);
  });

  it('drops deleted tracks and follows the one that is playing', () => {
    expect(prune({ order: ids, index: 2 }, (id) => id !== 'a')).toEqual({ order: ['b', 'c', 'd'], index: 1 });
    expect(prune({ order: ids, index: 2 }, (id) => id !== 'c')).toEqual({ order: ['a', 'b', 'd'], index: 2 });
    expect(prune({ order: ids, index: 1 }, () => false)).toEqual({ order: [], index: -1 });
  });
});
