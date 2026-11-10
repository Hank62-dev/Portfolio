import { AGENTS } from './agents';

// Guest mode: a small script that plays the part of the realtime server, so a visitor sees the workspace
// moving without signing in and without touching anything real. Everything here is made up.

export const DEMO_STEPS = [
  { agent: 'codex', task: 'Refactor the checkout flow', action: 'started', text: 'Splitting the cart reducer from the payment form.' },
  { agent: 'claude', task: 'Compare vector stores for the knowledge base', action: 'started', text: 'Reading three benchmarks on recall at low memory.' },
  { agent: 'pixel', task: 'Tidy the spacing scale', action: 'started', text: 'Collapsing nine spacing values into six.' },
  { agent: 'codex', task: 'Refactor the checkout flow', action: 'output', text: '14 files changed, tests still green.' },
  { agent: 'nova', task: 'Draft the Q4 onboarding guide', action: 'started', text: 'Outline approved, writing section two of five.' },
  { agent: 'atlas', task: 'Regression pass on login', action: 'started', text: 'Replaying 42 recorded sessions.' },
  { agent: 'claude', task: 'Compare vector stores for the knowledge base', action: 'completed', text: 'Recommendation written, two trade-offs flagged.' },
  { agent: 'rhea', task: 'Fine-tune the intent classifier', action: 'started', text: 'Epoch 3 of 8, validation loss falling.' },
  { agent: 'pixel', task: 'Tidy the spacing scale', action: 'completed', text: 'Merged. Components re-checked at three widths.' },
  { agent: 'mira', task: 'Watch the deploy', action: 'started', text: 'All services healthy, latency steady.' },
  { agent: 'atlas', task: 'Regression pass on login', action: 'completed', text: '0 regressions. One flaky test quarantined.' },
  { agent: 'gemini', task: 'Summarise the support backlog', action: 'started', text: 'Clustering 310 tickets by cause.' },
];

/**
 * The realtime message for step `n` of the script (it loops). A "started" step marks the agent as working,
 * a "completed" step marks it idle, and each one also adds an event.
 */
export const demoMessage = (n, now = Date.now()) => {
  const step = DEMO_STEPS[n % DEMO_STEPS.length];
  const working = step.action !== 'completed';
  return {
    type: 'event',
    agents: [{ id: step.agent, status: working ? 'working' : 'idle', task: working ? step.task : 'Idle' }],
    event: { agent: step.agent, action: step.action, text: step.text, at: now },
  };
};

const OPENING_BUSY = ['codex', 'claude', 'nova'];

/** The starting picture: three agents already busy, so the floor is alive from the first frame. */
export const demoOpening = () => ({
  type: 'state',
  agents: AGENTS.map((agent) => {
    const busy = OPENING_BUSY.includes(agent.id) && DEMO_STEPS.find((s) => s.agent === agent.id && s.action === 'started');
    return { id: agent.id, status: busy ? 'working' : 'idle', task: busy ? busy.task : 'Idle' };
  }),
});

/** Sample calendar for the guest briefing, placed on `day`. */
export const demoSchedule = (day = new Date()) => {
  const at = (h, m) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m).toISOString();
  return [
    { title: 'Standup with the team', start: at(9, 0), end: at(9, 15), allDay: false, location: 'Online' },
    { title: 'Design review: workspace redesign', start: at(11, 0), end: at(12, 0), allDay: false, location: 'Studio' },
    { title: 'Focus block: write the case study', start: at(14, 0), end: at(16, 0), allDay: false, location: '' },
  ];
};
