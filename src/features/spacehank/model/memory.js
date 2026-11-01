/**
 * Runs of the same agent doing the same thing become one group ("Codex, output, x12"), so a chatty agent takes one
 * row instead of a screenful. `events` is newest first, and so are the groups.
 */
export const groupRuns = (events) => {
  const groups = [];
  for (const event of events) {
    const last = groups[groups.length - 1];
    if (last && last.name === event.name && last.action === event.action) last.items.push(event);
    else groups.push({ name: event.name, action: event.action, color: event.color, items: [event] });
  }
  return groups;
};
