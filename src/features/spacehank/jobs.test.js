import { describe, expect, it } from 'vitest';
import { clearJobError, createDraft, jobs, startJob } from './jobs';

const slot = (key) => jobs.get().slots[key] ?? { busy: false, error: '', at: 0 };
const later = (ms, value) => new Promise((resolve) => setTimeout(() => resolve(value), ms));

describe('a job', () => {
  it('runs to its end and says so, whether or not anything is watching', async () => {
    const draft = createDraft({ result: '' });
    const promise = startJob('t-run', async () => {
      await later(5);
      draft.set({ result: 'ready' }); // the work puts its own result where the tab will find it
      return 42;
    });
    expect(slot('t-run').busy).toBe(true);
    expect(await promise).toBe(42);
    expect(slot('t-run')).toMatchObject({ busy: false, error: '' });
    expect(slot('t-run').at).toBeGreaterThan(0);
    expect(draft.get().result).toBe('ready');
  });

  it('joins the one that is running instead of starting a second', async () => {
    let calls = 0;
    const work = async () => {
      calls += 1;
      await later(5);
      return 'done';
    };
    const [a, b] = [startJob('t-join', work), startJob('t-join', work)];
    expect(await a).toBe('done');
    expect(await b).toBe('done');
    expect(calls).toBe(1);
    await startJob('t-join', work); // once it is over, a new one can start
    expect(calls).toBe(2);
  });

  it('keeps its failure for whoever comes back, and forgets it on request or on the next try', async () => {
    expect(await startJob('t-fail', async () => Promise.reject(new Error('quota reached')))).toBeUndefined();
    expect(slot('t-fail')).toMatchObject({ busy: false, error: 'quota reached' });
    clearJobError('t-fail');
    expect(slot('t-fail').error).toBe('');
    await startJob('t-fail', async () => Promise.reject(new Error('again')));
    expect(slot('t-fail').error).toBe('again');
    await startJob('t-fail', async () => 'fine');
    expect(slot('t-fail').error).toBe('');
  });

  it('has a message even for a failure that carries none, and survives work that throws at once', async () => {
    await startJob('t-bare', () => Promise.reject(new Error('')));
    expect(slot('t-bare').error).toMatch(/wrong/i);
    await startJob('t-sync', () => {
      throw new Error('broke at once');
    });
    expect(slot('t-sync').error).toBe('broke at once');
  });

  it('keeps separate jobs separate', async () => {
    const slow = startJob('t-a', () => later(10, 'a'));
    await startJob('t-b', async () => 'b');
    expect(slot('t-a').busy).toBe(true);
    expect(slot('t-b').busy).toBe(false);
    await slow;
  });
});

describe('a draft', () => {
  it('holds what was typed and what came back, outside any tab', () => {
    const draft = createDraft({ topic: '', pack: null });
    draft.set({ topic: 'a video about bots' });
    draft.set((state) => ({ pack: { for: state.topic } }));
    expect(draft.get()).toEqual({ topic: 'a video about bots', pack: { for: 'a video about bots' } });
  });
});
