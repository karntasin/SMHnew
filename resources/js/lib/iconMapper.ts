import type { LucideIcon } from 'lucide-react';
import { icons } from '@/lib/icon-list';
import { LayoutGrid } from 'lucide-react';

const iconMap = icons.reduce((acc, curr) => {
  acc[curr.name] = curr.icon;
  return acc;
}, {} as Record<string, LucideIcon>);

const ALIASES: Record<string, string> = {
  Building: 'Building2',
  Cog: 'Settings',
  Headset: 'Headphones',
  LayoutDashboard: 'LayoutDashboard',
  LayoutGrid: 'LayoutGrid',
  FileBarChart: 'BarChart3',
  FileSearch: 'Search',
  FileOutput: 'Send',
  FilePlus2: 'FilePlus',
  FileSignature: 'PenTool',
  HardHat: 'HardDrive',
  Code2: 'Code',
  ClipboardCheck: 'CheckSquare',
  FileCheck: 'CheckSquare',
  ShieldAlert: 'AlertTriangle',
  UserCheck: 'UserCheck',
  CalendarDays: 'CalendarDays',
  Settings2: 'Settings2',
};

export function iconMapper(name?: string): LucideIcon {
  if (!name) return LayoutGrid;

  const trimmed = String(name).trim();
  const pascal = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  const aliased = ALIASES[pascal] || pascal;

  return iconMap[aliased] || iconMap[pascal] || LayoutGrid;
}
