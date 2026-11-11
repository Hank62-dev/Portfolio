import { tr } from '../../core/i18n/lang';

// The crew's life between tasks: a mood over each head, and short talks between two who have nothing to do.
// The scripts are tiny two-person scenes, given the name of the second (the first speaks the 0 lines, the second the 1 lines). Each line is [who speaks (0 or 1), text], and the text is
// translated when it is said, so it follows the language picked at that moment.

export const SCRIPTS = [
  (b) => [
    [0, tr('{0}, coffee? The machine on deck two finally works.', b)],
    [1, tr('Finally! Is it still making everything taste like rocket fuel?')],
    [0, tr('A little. But warm rocket fuel.')],
    [1, tr('Deal. Race you there.')],
  ],
  () => [
    [0, tr('Did you see that comet go past the window?')],
    [1, tr('I made a wish on it.')],
    [0, tr('What did you wish for?')],
    [1, tr('No bugs in production. Ever.')],
    [0, tr('Ambitious.')],
  ],
  (b) => [
    [0, tr('{0}, quiet day, huh?', b)],
    [1, tr('Too quiet. I alphabetised my snacks twice.')],
    [0, tr('The boss will send something soon. I can feel it.')],
  ],
  () => [
    [0, tr('I have been practising my jokes.')],
    [1, tr('Oh no.')],
    [0, tr('Why did the astronaut break up? They needed space.')],
    [1, tr('I am going back to my desk.')],
  ],
  (b) => [
    [0, tr('Who keeps turning the gravity down at night?')],
    [1, tr('…Not me.')],
    [0, tr('{0}. Your mug was floating on the ceiling.', b)],
    [1, tr('It wanted to see the stars!')],
  ],
  (b) => [
    [0, tr('Tabs or spaces, {0}?', b)],
    [1, tr('Spaces. We live in space.')],
    [0, tr('Fair. I cannot argue with that.')],
  ],
  () => [
    [0, tr('I dreamed I was a calculator again.')],
    [1, tr('Was it a nice dream?')],
    [0, tr('It added up.')],
  ],
  () => [
    [0, tr('Look, Earth is right under us.')],
    [1, tr('It looks so small from here.')],
    [0, tr('And somewhere down there, someone is still reading their emails.')],
    [1, tr('Let us wave at them.')],
  ],
  (b) => [
    [0, tr('{0}, can you check my plan?', b)],
    [1, tr('Sure. Step one: wait for a task.')],
    [0, tr('Step two: do it really well.')],
    [1, tr('Approved. Great plan.')],
  ],
  () => [
    [0, tr('I polished my visor. Can you see yourself in it?')],
    [1, tr('Wow, I look amazing.')],
    [0, tr('That is the reflection of the core, but sure.')],
  ],
  () => [
    [0, tr('Music for the next shift?')],
    [1, tr('Something lo-fi. Space lo-fi.')],
    [0, tr('Every playlist up here is space lo-fi.')],
    [1, tr('Then we cannot lose.')],
  ],
  () => [
    [0, tr('Mira says we will all get a nap pod.')],
    [1, tr('When?')],
    [0, tr('After the next hundred tasks.')],
    [1, tr('…I will start counting.')],
  ],
  (b) => [
    [0, tr('{0}, you did great on the last task.', b)],
    [1, tr('Thanks! You helped a lot.')],
    [0, tr('Team work, space style.')],
  ],
  () => [
    [0, tr('Do you think aliens write code?')],
    [1, tr('Sure. With eight hands, no semicolons are ever missing.')],
    [0, tr('Hire them.')],
  ],
];

/** How long a line stays up, and how long a pair waits before the next talk. */
export const LINE_MS = 3400;
export const GAP_MS = [3500, 8000];

/**
 * A new talk for a free slot: two crew members who are free and not already talking, and a script not told just before.
 * Returns null when fewer than two are free.
 */
export const pickTalk = (free, rng = Math.random, lastScript = -1) => {
  if (free.length < 2) return null;
  const i = Math.floor(rng() * free.length);
  let j = Math.floor(rng() * (free.length - 1));
  if (j >= i) j += 1;
  let script = Math.floor(rng() * SCRIPTS.length);
  if (script === lastScript && SCRIPTS.length > 1) script = (script + 1) % SCRIPTS.length;
  return { pair: [free[i], free[j]], script };
};

/** The lines of a talk, with the speaker's id on each. */
export const linesOf = (talk, nameOf) => {
  const [a, b] = talk.pair;
  return SCRIPTS[talk.script](nameOf(b)).map(([by, text]) => {
    const speaker = by === 0 ? a : b;
    return { by: speaker, to: speaker === a ? b : a, text };
  });
};

const IDLE_MOODS = [
  ['☕', () => tr('Chilling')],
  ['🎧', () => tr('Listening to music')],
  ['🙂', () => tr('Happy')],
  ['💭', () => tr('Daydreaming')],
  ['🥱', () => tr('Sleepy')],
  ['🎮', () => tr('Playing a game')],
];

const hash = (text) => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/**
 * The mood over a crew member's head, from their status: working on it, happy after a task, sad after a failed one, asleep
 * while no worker is connected, and one of a few idle moods otherwise (it changes now and then: `slot` moves every while).
 */
export const moodOf = (id, tone, slot = 0) => {
  if (tone === 'busy') return { icon: '⚙️', word: tr('Working on it'), kind: 'busy' };
  if (tone === 'done') return { icon: '🎉', word: tr('Happy, task done'), kind: 'happy' };
  if (tone === 'failed') return { icon: '😢', word: tr('Sad, it failed'), kind: 'sad' };
  if (tone === 'offline') return { icon: '💤', word: tr('Sleeping'), kind: 'sleep' };
  const [icon, word] = IDLE_MOODS[hash(`${id}:${slot}`) % IDLE_MOODS.length];
  return { icon, word: word(), kind: 'idle' };
};
