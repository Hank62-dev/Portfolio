import { Activity, BookHeart, CalendarDays, BrainCircuit, Boxes, FolderOpen, Gamepad2, GraduationCap, Headphones, HeartPulse, Kanban, LayoutDashboard, Mic, Music2, NotebookPen, Brush, Orbit, Palette, Sprout, Terminal, Wallet, Rocket } from 'lucide-react';
import { tr } from './lang';

export const NAV_SECTIONS = ['WORKSPACE', 'KNOWLEDGE', 'CREATE', 'LIFE'];

// `blurb` is the line under the name in the "everything" sheet; `keywords` only feed the search
export const NAVIGATION = [
  { id: 'hank', label: tr('Hank 62'), icon: LayoutDashboard, section: 'WORKSPACE', blurb: tr('Today, at a glance'), keywords: 'dashboard home briefing today weather' },
  { id: 'space', label: tr('SpaceWorkAI'), icon: Boxes, section: 'WORKSPACE', blurb: tr('The agent office in 3D'), keywords: 'floor company agents office 3d' },
  { id: 'rag', label: tr('Hank RAG'), icon: BrainCircuit, section: 'WORKSPACE', badge: 'AI', blurb: tr('Ask your own notes'), keywords: 'chat ask question search knowledge' },
  { id: 'pulse', label: tr('Dev Pulse'), icon: HeartPulse, section: 'WORKSPACE', blurb: tr('Repos, builds, uptime'), keywords: 'github repos commits status uptime health deploy actions' },
  { id: 'shell', label: tr('Git Bash'), icon: Terminal, section: 'WORKSPACE', blurb: tr('A terminal in the page'), keywords: 'terminal command line console cli type' },
  { id: 'docs', label: tr('Document Vault'), icon: FolderOpen, section: 'KNOWLEDGE', blurb: tr('Files and PDFs'), keywords: 'files upload pdf documents' },
  { id: 'notes', label: tr('Second Brain'), icon: NotebookPen, section: 'KNOWLEDGE', blurb: tr('Writing and ideas'), keywords: 'notes journal diary write ideas memory' },
  { id: 'constellation', label: tr('Constellation'), icon: Orbit, section: 'KNOWLEDGE', blurb: tr('Notes as a night sky'), keywords: 'graph map stars notes links sky connections' },
  { id: 'memos', label: tr('Voice Memos'), icon: Mic, section: 'KNOWLEDGE', blurb: tr('Say it, keep it'), keywords: 'record audio voice speech transcript dictate' },
  { id: 'memory', label: tr('Memory Stream'), icon: Activity, section: 'KNOWLEDGE', blurb: tr('What happened, in order'), keywords: 'timeline events log history' },
  { id: 'studio', label: tr('Image Studio'), icon: Palette, section: 'CREATE', blurb: tr('Pictures and brand'), keywords: 'image picture generate brand colours palette tokens design' },
  { id: 'creator', label: tr('Creator Lab'), icon: Rocket, section: 'CREATE', badge: 'NEW', blurb: tr('Content and income'), keywords: 'creator content tiktok discord money income sponsor clients freelance hooks script teleprompter deals quote pricing' },
  { id: 'paint', label: tr('Paint'), icon: Brush, section: 'CREATE', badge: 'NEW', blurb: tr('Draw with layers'), keywords: 'paint draw drawing sketch brush pen layers canvas picture annotate ve vẽ hoa tranh' },
  { id: 'music', label: tr('Hank Music'), icon: Music2, section: 'CREATE', blurb: tr('Your songs, offline'), keywords: 'songs player library playlist audio listen' },
  { id: 'podcast', label: tr('Podcast'), icon: Headphones, section: 'CREATE', badge: 'NEW', blurb: tr('Shows you follow'), keywords: 'podcast listen audio episodes shows radio nghe' },
  { id: 'calendar', label: tr('Calendar'), icon: CalendarDays, section: 'LIFE', blurb: tr('Events, deadlines, agenda'), keywords: 'calendar agenda schedule events google lich lịch sự kiện hạn deadline thang tuan month week' },
  { id: 'missions', label: tr('Mission Board'), icon: Kanban, section: 'LIFE', blurb: tr('Tasks on a board'), keywords: 'kanban tasks cards todo board plan agents' },
  { id: 'study', label: tr('Study Hub'), icon: GraduationCap, section: 'LIFE', blurb: tr('Courses and focus'), keywords: 'courses exams deadlines flashcards pomodoro focus learn school' },
  { id: 'habits', label: tr('Habit Garden'), icon: Sprout, section: 'LIFE', blurb: tr('Streaks that grow'), keywords: 'habits streak plants routine daily' },
  { id: 'wallet', label: tr('Wallet'), icon: Wallet, section: 'LIFE', blurb: tr('Where the money went'), keywords: 'money spending expenses budget finance income' },
  { id: 'play', label: tr('Ra chơi'), icon: Gamepad2, section: 'LIFE', blurb: tr('Games for a break'), keywords: 'games play fun break puzzle sudoku caro snake boats tim so bau cua chơi' },
  { id: 'diary', label: tr('Nhật ký'), icon: BookHeart, section: 'LIFE', blurb: tr('A page for today'), keywords: 'diary journal nhat ky hanh trinh memories kỷ niệm viết mood pet mơ journey' },
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
  paint: 340, // rose madder
  creator: 22, // persimmon
  music: 42, // brass
  podcast: 286, // violet
  calendar: 228, // blue ink
  missions: 196, // slate
  study: 262, // indigo
  habits: 132, // sage
  wallet: 84, // olive
  play: 6, // poppy
  diary: 200, // dawn
};
export const tabHue = (id) => HUES[id] ?? 16;

/** Screens whose top is a sky that runs up behind the top bar; the others have the tab's colour glowing in the corner. */
export const SKY_TABS = ['hank', 'habits'];

/** The tab's colour as an accent on a dark or light surface: a tone of the hue, never the full-strength one. */
export const tabAccent = (id) => `hsl(${tabHue(id)} 46% 64%)`;
