// Git Bash: a command line for the workspace. The parser and every command are plain functions that talk to the
// app through a `ctx` object (see CTX below), so the whole thing can be tested without a browser.
//
// CTX the shell is given:
//   tabs      [{ id, label }]                   agents  [{ id, name, role, status, task }]
//   go(tab)   task(agentId, text) → boolean      music(move) / play(mood) → Promise<string>
//   note(text) / card(title) → Promise            spend(text) → string (throws when it cannot read an amount)
//   habits()  → [{ name, done, streak }]          toggleHabit(name) → string
//   search(q) → [{ title }]                       ask(q) → Promise<string>
//   weather() → Promise<string>                   now() → Date

/** Splits a line into words, keeping "quoted phrases" together. */
export const tokenize = (line) => [...String(line).matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)].map((m) => m[1] ?? m[2] ?? m[3]);

/** { name, args, rest }: the command, its words, and everything after the command as one string. */
export const parseLine = (line) => {
  const trimmed = String(line).trim();
  const [name = '', ...args] = tokenize(trimmed);
  return { name: name.toLowerCase(), args, rest: trimmed.slice(name.length).trim() };
};

const out = (text, tone) => ({ text, tone });
const ok = (text) => out(text, 'ok');
const err = (text) => out(text, 'err');
const dim = (text) => out(text, 'dim');

const findBy = (list, word, keys) => {
  const w = String(word ?? '').toLowerCase();
  return list.find((x) => keys.some((k) => String(x[k]).toLowerCase() === w)) ?? list.find((x) => keys.some((k) => String(x[k]).toLowerCase().includes(w)) && w.length > 1);
};

export const COMMANDS = [
  {
    name: 'help',
    usage: 'help',
    help: 'List the commands',
    run: () => COMMANDS.map((c) => out(`${c.usage.padEnd(22)} ${c.help}`, 'dim')),
  },
  { name: 'clear', usage: 'clear', help: 'Clear the screen', run: () => ({ clear: true }) },
  { name: 'date', usage: 'date', help: 'Today, as the shell sees it', run: (a, r, ctx) => [out(ctx.now().toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' }))] },
  { name: 'echo', usage: 'echo <text>', help: 'Print some text', run: (a, rest) => [out(rest)] },
  {
    name: 'tabs',
    usage: 'tabs',
    help: 'List the places you can go',
    run: (a, r, ctx) => ctx.tabs.map((t) => out(`${t.id.padEnd(10)} ${t.label}`, 'dim')),
  },
  {
    name: 'go',
    usage: 'go <tab>',
    help: 'Open a tab, e.g. go music',
    run: (args, rest, ctx) => {
      const tab = findBy(ctx.tabs, args[0], ['id', 'label']);
      if (!tab) return [err(`No tab called "${args[0] ?? ''}". Try: tabs`)];
      ctx.go(tab.id);
      return [ok(`Opening ${tab.label}`)];
    },
  },
  {
    name: 'agents',
    usage: 'agents',
    help: 'Who is working on what',
    run: (a, r, ctx) => ctx.agents.map((ag) => out(`${ag.id.padEnd(10)} ${String(ag.status).padEnd(10)} ${ag.task ?? ''}`, ag.status === 'working' ? 'ok' : 'dim')),
  },
  {
    name: 'task',
    usage: 'task <agent> <what to do>',
    help: 'Give an agent a task',
    run: (args, rest, ctx) => {
      const agent = findBy(ctx.agents, args[0], ['id', 'name']);
      const text = args.slice(1).join(' ');
      if (!agent) return [err(`No agent called "${args[0] ?? ''}". Try: agents`)];
      if (!text) return [err(`What should ${agent.name} do?`)];
      return [ctx.task(agent.id, text) ? ok(`Sent to ${agent.name}: ${text}`) : err('The task was not sent (the realtime server may be offline).')];
    },
  },
  { name: 'play', usage: 'play [mood]', help: 'Play from your library, or a mix for a mood', run: async (a, rest, ctx) => [ok(await ctx.play(rest))] },
  { name: 'pause', usage: 'pause', help: 'Pause the music', run: async (a, r, ctx) => [ok(await ctx.music('pause'))] },
  { name: 'resume', usage: 'resume', help: 'Resume the music', run: async (a, r, ctx) => [ok(await ctx.music('resume'))] },
  { name: 'next', usage: 'next', help: 'Next song', run: async (a, r, ctx) => [ok(await ctx.music('next'))] },
  { name: 'prev', usage: 'prev', help: 'Previous song', run: async (a, r, ctx) => [ok(await ctx.music('previous'))] },
  {
    name: 'note',
    usage: 'note <text>',
    help: 'Save a note to Second Brain',
    run: async (a, rest, ctx) => {
      if (!rest) return [err('What should the note say?')];
      await ctx.note(rest);
      return [ok('Saved to Second Brain')];
    },
  },
  {
    name: 'card',
    usage: 'card <title>',
    help: 'Add a card to the Mission Board',
    run: async (a, rest, ctx) => {
      if (!rest) return [err('What is the card called?')];
      await ctx.card(rest);
      return [ok(`Added to the board: ${rest}`)];
    },
  },
  {
    name: 'spend',
    usage: 'spend <text>',
    help: 'Log money, e.g. spend ăn trưa 45k',
    run: async (a, rest, ctx) => {
      try {
        return [ok(await ctx.spend(rest))];
      } catch (error) {
        return [err(error.message)];
      }
    },
  },
  {
    name: 'habits',
    usage: 'habits',
    help: 'Today in the garden',
    run: (a, r, ctx) => {
      const list = ctx.habits();
      return list.length ? list.map((h) => out(`${h.done ? '[x]' : '[ ]'} ${h.name}  ${h.streak ? `${h.streak} day streak` : ''}`.trimEnd(), h.done ? 'ok' : undefined)) : [dim('No habits yet. Plant one in Habit Garden.')];
    },
  },
  { name: 'done', usage: 'done <habit>', help: 'Tick a habit for today', run: (a, rest, ctx) => [ok(ctx.toggleHabit(rest))] },
  {
    name: 'search',
    usage: 'search <words>',
    help: 'Search your notes',
    run: (a, rest, ctx) => {
      if (!rest) return [err('Search for what?')];
      const found = ctx.search(rest);
      return found.length ? found.slice(0, 8).map((n) => out(`- ${n.title}`)) : [dim('Nothing found.')];
    },
  },
  {
    name: 'ask',
    usage: 'ask <question>',
    help: 'Ask your notes (uses AI)',
    run: async (a, rest, ctx) => {
      if (!rest) return [err('Ask what?')];
      return String(await ctx.ask(rest)).split('\n').map((line) => out(line));
    },
  },
  { name: 'weather', usage: 'weather', help: "Today's weather", run: async (a, r, ctx) => [out(await ctx.weather())] },
];

/** Command names that start with `prefix`, in the order they are listed. */
export const complete = (prefix) => COMMANDS.map((c) => c.name).filter((n) => n.startsWith(String(prefix).toLowerCase()));

/** Runs one line. Returns { lines, clear? }; an unknown command or a failing one becomes a red line, never a throw. */
export const runLine = async (line, ctx) => {
  const { name, args, rest } = parseLine(line);
  if (!name) return { lines: [] };
  const command = COMMANDS.find((c) => c.name === name);
  if (!command) {
    const near = complete(name.slice(0, 2));
    return { lines: [err(`Unknown command: ${name}`), dim(near.length ? `Did you mean: ${near.join(', ')}?` : 'Type help to see what is there.')] };
  }
  try {
    const result = await command.run(args, rest, ctx);
    if (result?.clear) return { lines: [], clear: true };
    return { lines: result ?? [] };
  } catch (error) {
    return { lines: [err(error.message || 'That did not work.')] };
  }
};
