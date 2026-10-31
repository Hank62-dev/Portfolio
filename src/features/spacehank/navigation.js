import { Activity, BrainCircuit, Boxes, FolderOpen, LayoutDashboard } from 'lucide-react';

export const NAV_SECTIONS = ['WORKSPACE', 'KNOWLEDGE'];

export const NAVIGATION = [
  { id: 'hank', label: 'Hank 62', icon: LayoutDashboard, section: 'WORKSPACE' },
  { id: 'space', label: 'SpaceWorkAI', icon: Boxes, section: 'WORKSPACE' },
  { id: 'rag', label: 'Hank RAG', icon: BrainCircuit, section: 'WORKSPACE', badge: 'AI' },
  { id: 'docs', label: 'Document Vault', icon: FolderOpen, section: 'KNOWLEDGE' },
  { id: 'memory', label: 'Memory Stream', icon: Activity, section: 'KNOWLEDGE' },
];

export const DEFAULT_TAB = 'hank';
