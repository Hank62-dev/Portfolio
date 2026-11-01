// "Do what I said": the actions a sentence may turn into, and the strict check on whatever the AI answers.
// The model only chooses from this list. What comes back is validated here, shown to the person, and run only
// after they confirm, so a wrong or manipulated answer cannot do more than the list allows.

export const MUSIC_MOVES = ['pause', 'resume', 'next', 'previous'];
export const FLOOR_MOVES = ['pause', 'resume'];

/** The catalog sent to the AI: what each action does and what it needs. Keep the ids in step with `validate`. */
export const buildCatalog = ({ tabs, agents }) => [
  { id: 'navigate', description: `Open a tab of the workspace. Tabs: ${tabs.map((t) => `${t.id} (${t.label})`).join(', ')}`, params: { tab: 'the tab id' } },
  {
    id: 'dispatch_task',
    description: `Give a task to an AI agent. Agents: ${agents.map((a) => `${a.id} (${a.name}, ${a.role})`).join(', ')}`,
    params: { agent: 'the agent id', task: 'what to do, as a clear instruction' },
  },
  { id: 'focus_agent', description: 'Show an agent on the 3D floor', params: { agent: 'the agent id' } },
  { id: 'music', description: 'Control the music that is playing', params: { do: MUSIC_MOVES.join(' | ') } },
  { id: 'play_mood', description: 'Start playing songs from the library that fit a mood or activity', params: { mood: 'e.g. late-night coding' } },
  { id: 'sleep_timer', description: 'Stop the music after some minutes', params: { minutes: 'a number from 1 to 180' } },
  { id: 'new_note', description: 'Save a new note', params: { text: 'the note, in markdown; the first line is its title' } },
  { id: 'ask_notes', description: 'Answer a question from the saved notes', params: { question: 'the question' } },
  { id: 'search_notes', description: 'Search the saved notes', params: { query: 'words to look for' } },
  { id: 'draft_image', description: 'Open the Image Studio with a picture description filled in (does not generate it)', params: { prompt: 'the picture to describe' } },
  { id: 'floor', description: 'Pause or resume the animation on the 3D floor', params: { do: FLOOR_MOVES.join(' | ') } },
];

const text = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

const findAgent = (agents, value) => {
  const wanted = text(value, 40).toLowerCase();
  return agents.find((a) => a.id === wanted) ?? agents.find((a) => a.name.toLowerCase() === wanted || a.name.toLowerCase().includes(wanted) && wanted.length > 2);
};

const findTab = (tabs, value) => {
  const wanted = text(value, 40).toLowerCase();
  return tabs.find((t) => t.id === wanted) ?? tabs.find((t) => t.label.toLowerCase() === wanted);
};

const refuse = (say, fallback = 'Hank could not turn that into something to do.') => ({ ok: false, say: text(say, 200) || fallback });

/**
 * Checks the AI's answer against the catalog and the real tabs and agents. Returns
 * { ok: true, action, params, describe } with clean values, or { ok: false, say }.
 */
export const validate = (reply, { tabs, agents }) => {
  const action = reply?.action;
  const params = reply?.params && typeof reply.params === 'object' ? reply.params : {};
  if (!action || action === 'none') return refuse(reply?.say);

  switch (action) {
    case 'navigate': {
      const tab = findTab(tabs, params.tab);
      return tab ? { ok: true, action, params: { tab: tab.id }, describe: `Open ${tab.label}` } : refuse('There is no such tab.');
    }
    case 'dispatch_task': {
      const agent = findAgent(agents, params.agent);
      const task = text(params.task, 400);
      if (!agent) return refuse('I could not tell which agent you meant.');
      if (!task) return refuse('What should the agent do?');
      return { ok: true, action, params: { agent: agent.id, task }, describe: `Give ${agent.name} the task: “${task}”` };
    }
    case 'focus_agent': {
      const agent = findAgent(agents, params.agent);
      return agent ? { ok: true, action, params: { agent: agent.id }, describe: `Show ${agent.name} on the floor` } : refuse('I could not tell which agent you meant.');
    }
    case 'music': {
      const move = text(params.do, 20).toLowerCase();
      return MUSIC_MOVES.includes(move) ? { ok: true, action, params: { do: move }, describe: `Music: ${move}` } : refuse('I did not understand what to do with the music.');
    }
    case 'play_mood': {
      const mood = text(params.mood, 120);
      return mood ? { ok: true, action, params: { mood }, describe: `Play songs for “${mood}”` } : refuse('What mood should I play?');
    }
    case 'sleep_timer': {
      const minutes = Math.round(Number(params.minutes));
      return Number.isFinite(minutes) && minutes >= 1 && minutes <= 180
        ? { ok: true, action, params: { minutes }, describe: `Stop the music after ${minutes} minutes` }
        : refuse('The timer needs a number of minutes between 1 and 180.');
    }
    case 'new_note': {
      const body = String(params.text ?? '').trim().slice(0, 4000);
      return body ? { ok: true, action, params: { text: body }, describe: `Save a note: “${text(body, 70)}”` } : refuse('What should the note say?');
    }
    case 'ask_notes': {
      const question = text(params.question, 300);
      return question ? { ok: true, action, params: { question }, describe: `Ask your notes: “${question}”` } : refuse('What do you want to ask?');
    }
    case 'search_notes': {
      const query = text(params.query, 120);
      return query ? { ok: true, action, params: { query }, describe: `Search your notes for “${query}”` } : refuse('What should I search for?');
    }
    case 'draft_image': {
      const prompt = text(params.prompt, 500);
      return prompt ? { ok: true, action, params: { prompt }, describe: `Open the Image Studio with: “${text(prompt, 70)}”` } : refuse('What should the picture show?');
    }
    case 'floor': {
      const move = text(params.do, 20).toLowerCase();
      return FLOOR_MOVES.includes(move) ? { ok: true, action, params: { do: move }, describe: `${move === 'pause' ? 'Pause' : 'Resume'} the floor` } : refuse('Pause or resume?');
    }
    default:
      return refuse(reply?.say);
  }
};

/** Only worth asking the AI when it reads like a sentence rather than a few letters of a command name. */
export const looksLikeRequest = (query) => query.trim().split(/\s+/).filter(Boolean).length >= 3;
