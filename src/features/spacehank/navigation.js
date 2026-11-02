import { Activity, BrainCircuit, Boxes, FolderOpen, GraduationCap, HeartPulse, Kanban, LayoutDashboard, Mic, Music2, NotebookPen, Orbit, Palette, Sprout, Terminal, Wallet } from 'lucide-react';

export const NAV_SECTIONS = ['WORKSPACE', 'KNOWLEDGE', 'CREATE', 'LIFE'];

export const NAVIGATION = [
  { id: 'hank', label: 'Hank 62', icon: LayoutDashboard, section: 'WORKSPACE', keywords: 'dashboard home briefing today weather' },
  { id: 'space', label: 'SpaceWorkAI', icon: Boxes, section: 'WORKSPACE', keywords: 'floor company agents office 3d' },
  { id: 'rag', label: 'Hank RAG', icon: BrainCircuit, section: 'WORKSPACE', badge: 'AI', keywords: 'chat ask question search knowledge' },
  { id: 'pulse', label: 'Dev Pulse', icon: HeartPulse, section: 'WORKSPACE', keywords: 'github repos commits status uptime health deploy actions' },
  { id: 'shell', label: 'Hank Shell', icon: Terminal, section: 'WORKSPACE', keywords: 'terminal command line console cli type' },
  { id: 'docs', label: 'Document Vault', icon: FolderOpen, section: 'KNOWLEDGE', keywords: 'files upload pdf documents' },
  { id: 'notes', label: 'Second Brain', icon: NotebookPen, section: 'KNOWLEDGE', keywords: 'notes journal diary write ideas memory' },
  { id: 'constellation', label: 'Constellation', icon: Orbit, section: 'KNOWLEDGE', keywords: 'graph map stars notes links sky connections' },
  { id: 'memos', label: 'Voice Memos', icon: Mic, section: 'KNOWLEDGE', keywords: 'record audio voice speech transcript dictate' },
  { id: 'memory', label: 'Memory Stream', icon: Activity, section: 'KNOWLEDGE', keywords: 'timeline events log history' },
  { id: 'studio', label: 'Image Studio', icon: Palette, section: 'CREATE', keywords: 'image picture generate brand colours palette tokens design' },
  { id: 'music', label: 'Hank Music', icon: Music2, section: 'CREATE', keywords: 'songs player library playlist audio listen' },
  { id: 'missions', label: 'Mission Board', icon: Kanban, section: 'LIFE', keywords: 'kanban tasks cards todo board plan agents' },
  { id: 'study', label: 'Study Hub', icon: GraduationCap, section: 'LIFE', keywords: 'courses exams deadlines flashcards pomodoro focus learn school' },
  { id: 'habits', label: 'Habit Garden', icon: Sprout, section: 'LIFE', keywords: 'habits streak plants routine daily' },
  { id: 'wallet', label: 'Wallet', icon: Wallet, section: 'LIFE', keywords: 'money spending expenses budget finance income' },
];

export const DEFAULT_TAB = 'hank';
