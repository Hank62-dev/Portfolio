import { Activity, BrainCircuit, Boxes, FolderOpen, LayoutDashboard, Music2, NotebookPen, Palette } from 'lucide-react';

export const NAV_SECTIONS = ['WORKSPACE', 'KNOWLEDGE', 'CREATE'];

export const NAVIGATION = [
  { id: 'hank', label: 'Hank 62', icon: LayoutDashboard, section: 'WORKSPACE', keywords: 'dashboard home briefing today weather' },
  { id: 'space', label: 'SpaceWorkAI', icon: Boxes, section: 'WORKSPACE', keywords: 'floor company agents office 3d' },
  { id: 'rag', label: 'Hank RAG', icon: BrainCircuit, section: 'WORKSPACE', badge: 'AI', keywords: 'chat ask question search knowledge' },
  { id: 'docs', label: 'Document Vault', icon: FolderOpen, section: 'KNOWLEDGE', keywords: 'files upload pdf documents' },
  { id: 'notes', label: 'Second Brain', icon: NotebookPen, section: 'KNOWLEDGE', keywords: 'notes journal diary write ideas memory' },
  { id: 'memory', label: 'Memory Stream', icon: Activity, section: 'KNOWLEDGE', keywords: 'timeline events log history' },
  { id: 'studio', label: 'Image Studio', icon: Palette, section: 'CREATE', keywords: 'image picture generate brand colours palette tokens design' },
  { id: 'music', label: 'Hank Music', icon: Music2, section: 'CREATE', keywords: 'songs player library playlist audio listen' },
];

export const DEFAULT_TAB = 'hank';
