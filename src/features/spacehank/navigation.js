import { Activity, BookHeart, BrainCircuit, Boxes, FolderOpen, Gamepad2, GraduationCap, HeartPulse, Kanban, LayoutDashboard, Mic, Music2, NotebookPen, Orbit, Palette, Sprout, Terminal, Wallet, Rocket } from 'lucide-react';

export const NAV_SECTIONS = ['WORKSPACE', 'KNOWLEDGE', 'CREATE', 'LIFE'];

// `blurb` is the line under the name in the "everything" sheet; `keywords` only feed the search
export const NAVIGATION = [
  { id: 'hank', label: 'Hank 62', icon: LayoutDashboard, section: 'WORKSPACE', blurb: 'Today, at a glance', keywords: 'dashboard home briefing today weather' },
  { id: 'space', label: 'SpaceWorkAI', icon: Boxes, section: 'WORKSPACE', blurb: 'The agent office in 3D', keywords: 'floor company agents office 3d' },
  { id: 'rag', label: 'Hank RAG', icon: BrainCircuit, section: 'WORKSPACE', badge: 'AI', blurb: 'Ask your own notes', keywords: 'chat ask question search knowledge' },
  { id: 'pulse', label: 'Dev Pulse', icon: HeartPulse, section: 'WORKSPACE', blurb: 'Repos, builds, uptime', keywords: 'github repos commits status uptime health deploy actions' },
  { id: 'shell', label: 'Git Bash', icon: Terminal, section: 'WORKSPACE', blurb: 'A terminal in the page', keywords: 'terminal command line console cli type' },
  { id: 'docs', label: 'Document Vault', icon: FolderOpen, section: 'KNOWLEDGE', blurb: 'Files and PDFs', keywords: 'files upload pdf documents' },
  { id: 'notes', label: 'Second Brain', icon: NotebookPen, section: 'KNOWLEDGE', blurb: 'Writing and ideas', keywords: 'notes journal diary write ideas memory' },
  { id: 'constellation', label: 'Constellation', icon: Orbit, section: 'KNOWLEDGE', blurb: 'Notes as a night sky', keywords: 'graph map stars notes links sky connections' },
  { id: 'memos', label: 'Voice Memos', icon: Mic, section: 'KNOWLEDGE', blurb: 'Say it, keep it', keywords: 'record audio voice speech transcript dictate' },
  { id: 'memory', label: 'Memory Stream', icon: Activity, section: 'KNOWLEDGE', blurb: 'What happened, in order', keywords: 'timeline events log history' },
  { id: 'studio', label: 'Image Studio', icon: Palette, section: 'CREATE', blurb: 'Pictures and brand', keywords: 'image picture generate brand colours palette tokens design' },
  { id: 'creator', label: 'Creator Lab', icon: Rocket, section: 'CREATE', badge: 'NEW', blurb: 'Content and income', keywords: 'creator content tiktok discord money income sponsor clients freelance hooks script teleprompter deals quote pricing' },
  { id: 'music', label: 'Hank Music', icon: Music2, section: 'CREATE', blurb: 'Your songs, offline', keywords: 'songs player library playlist audio listen' },
  { id: 'missions', label: 'Mission Board', icon: Kanban, section: 'LIFE', blurb: 'Tasks on a board', keywords: 'kanban tasks cards todo board plan agents' },
  { id: 'study', label: 'Study Hub', icon: GraduationCap, section: 'LIFE', blurb: 'Courses and focus', keywords: 'courses exams deadlines flashcards pomodoro focus learn school' },
  { id: 'habits', label: 'Habit Garden', icon: Sprout, section: 'LIFE', blurb: 'Streaks that grow', keywords: 'habits streak plants routine daily' },
  { id: 'wallet', label: 'Wallet', icon: Wallet, section: 'LIFE', blurb: 'Where the money went', keywords: 'money spending expenses budget finance income' },
  { id: 'play', label: 'Ra chơi', icon: Gamepad2, section: 'LIFE', blurb: 'Games for a break', keywords: 'games play fun break puzzle sudoku caro snake boats tim so bau cua chơi' },
  { id: 'diary', label: 'Nhật ký', icon: BookHeart, section: 'LIFE', blurb: 'A page for today', keywords: 'diary journal nhat ky hanh trinh memories kỷ niệm viết mood pet mơ journey' },
];

export const DEFAULT_TAB = 'hank';

/**
 * Each tab's own colour on a phone. They are hand-picked, like pigments on a shelf, not a spin round the colour wheel:
 * the home tab keeps the brand ember, and the rest are the muted earth and ink tones of a printed catalogue.
 * (index.css keeps their saturation low, so a tab only leans toward its colour, it never shouts it)
 */
const HUES = {
  hank: 16, // ember (the brand)
  space: 214, // blueprint
  rag: 30, // copper
  pulse: 160, // verdigris
  shell: 112, // phosphor moss
  docs: 50, // manila
  notes: 350, // madder
  constellation: 246, // night ink
  memos: 332, // dusty rose
  memory: 178, // deep teal
  studio: 304, // plum
  creator: 22, // persimmon
  music: 42, // brass
  missions: 196, // slate
  study: 262, // indigo
  habits: 132, // sage
  wallet: 84, // olive
  play: 6, // poppy
  diary: 200, // dawn
};
export const tabHue = (id) => HUES[id] ?? 16;

/** The tab's colour as an accent on a dark or light surface: a tone of the hue, never the full-strength one. */
export const tabAccent = (id) => `hsl(${tabHue(id)} 46% 64%)`;
