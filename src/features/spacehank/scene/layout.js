// Geometry and colours of the 3D company floor. Positions are world units on the shared floor plane.

export const MODEL_BASE = '/models/office';

const DEFAULT_ROOM_COLOR = '#20313e';

const desks = (xs, zs, color) => zs.flatMap((z) => xs.map((x) => ({ position: [x, 0, z], color })));

const LEFT_XS = [-10.3, -6.3];
const RIGHT_XS = [6.3, 10.3];

export const ROOMS = [
  {
    id: 'engineering',
    title: 'ENGINEERING / CORE',
    number: '01',
    position: [-8.3, 0, -3],
    size: [7.6, 4.2],
    desks: [
      { position: [-10.3, 0, -4.2] },
      { position: [-6.3, 0, -4.2], color: '#274e53' },
      { position: [-10.3, 0, -1.75], color: '#274e53' },
      { position: [-6.3, 0, -1.75], color: '#274e53' },
    ],
  },
  {
    id: 'research',
    title: 'RESEARCH / RAG',
    number: '02',
    color: '#2b2440',
    position: [8.3, 0, -3],
    size: [7.6, 4.2],
    desks: desks(RIGHT_XS, [-4.2, -1.75], '#30294b'),
  },
  {
    id: 'documents',
    title: 'DOCUMENTS / OPS',
    number: '03',
    color: '#3b2d1e',
    position: [-8.3, 0, 6.8],
    size: [7.6, 4],
    desks: desks(LEFT_XS, [5.7, 7.9], '#4e3a29'),
  },
  {
    id: 'design',
    title: 'DESIGN / STUDIO',
    number: '04',
    color: '#3e2531',
    position: [8.3, 0, 6.8],
    size: [7.6, 4],
    desks: desks(RIGHT_XS, [5.7, 7.9], '#4b2939'),
  },
  {
    id: 'quality',
    title: 'QUALITY / QA',
    number: '05',
    color: '#233a55',
    position: [-8.3, 0, 11.6],
    size: [7.6, 4],
    desks: desks(LEFT_XS, [10.5, 12.7], '#29425b'),
  },
  {
    id: 'ml-lab',
    title: 'ML LAB / TRAINING',
    number: '06',
    color: '#432743',
    position: [8.3, 0, 11.6],
    size: [7.6, 4],
    desks: desks(RIGHT_XS, [10.5, 12.7], '#4b2d49'),
  },
].map((room) => ({ color: DEFAULT_ROOM_COLOR, ...room }));

/** Where each agent walks while idle between tasks: a rectangle of waypoints inside their room. */
export const AGENT_ROUTES = {
  codex: [[-10.3, 0, -4.2], [-6.3, 0, -4.2], [-6.3, 0, -1.75], [-10.3, 0, -1.75]],
  claude: [[6.3, 0, -4.2], [10.3, 0, -4.2], [10.3, 0, -1.75], [6.3, 0, -1.75]],
  nova: [[-8.8, 0, 5.6], [-5.2, 0, 5.6], [-5.2, 0, 7.8], [-8.8, 0, 7.8]],
  pixel: [[4.3, 0, 5.6], [8.8, 0, 5.6], [8.8, 0, 7.8], [4.3, 0, 7.8]],
  atlas: [[-8.8, 0, 10.3], [-5.2, 0, 10.3], [-5.2, 0, 12.3], [-8.8, 0, 12.3]],
  rhea: [[4.3, 0, 10.3], [8.8, 0, 10.3], [8.8, 0, 12.3], [4.3, 0, 12.3]],
  gemini: [[10.3, 0, -4.2], [6.3, 0, -4.2], [6.3, 0, -1.75], [10.3, 0, -1.75]],
  grok: [[6.3, 0, -1.75], [10.3, 0, -1.75], [10.3, 0, -4.2], [6.3, 0, -4.2]],
  deepseek: [[-6.3, 0, -1.75], [-10.3, 0, -1.75], [-10.3, 0, -4.2], [-6.3, 0, -4.2]],
  qwen: [[-5.8, 0, 5.3], [-3.8, 0, 5.3], [-3.8, 0, 7.5], [-5.8, 0, 7.5]],
  mira: [[-1.35, 0, 0.35], [1.35, 0, 0.35], [1.35, 0, 3.35], [-1.35, 0, 3.35]],
};

export const SERVER_ROOM = { position: [0, 0, 1.9], rackXs: [-3.05, -1.83, -0.61, 0.61, 1.83, 3.05] };
export const MEETING_TABLE = { position: [0, 0.18, 14.6], size: [2.8, 0.16, 1.45] };
