import {
  Braces,
  Database,
  File as FileBase,
  FileCode,
  FileJson,
  FileText,
  Globe,
  Palette,
  type LucideIcon,
} from 'lucide-react';

// One row per extension family; anything unknown gets the plain file glyph.
const ICONS: Record<string, { Icon: LucideIcon; color: string }> = {
  ts: { Icon: Braces, color: 'text-blue-500' },
  tsx: { Icon: Braces, color: 'text-blue-500' },
  js: { Icon: Braces, color: 'text-yellow-500' },
  jsx: { Icon: Braces, color: 'text-yellow-500' },
  mjs: { Icon: Braces, color: 'text-yellow-500' },
  cjs: { Icon: Braces, color: 'text-yellow-500' },
  json: { Icon: FileJson, color: 'text-yellow-600' },
  css: { Icon: Palette, color: 'text-purple-500' },
  scss: { Icon: Palette, color: 'text-pink-500' },
  html: { Icon: Globe, color: 'text-orange-500' },
  htm: { Icon: Globe, color: 'text-orange-500' },
  md: { Icon: FileText, color: 'text-sky-500' },
  sql: { Icon: Database, color: 'text-emerald-500' },
  py: { Icon: FileCode, color: 'text-green-600' },
  sh: { Icon: FileCode, color: 'text-slate-500' },
  yml: { Icon: FileText, color: 'text-rose-400' },
  yaml: { Icon: FileText, color: 'text-rose-400' },
};

export function FileIcon({ name, className }: { name: string; className?: string }) {
  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
  const { Icon, color } = ICONS[ext] ?? { Icon: FileBase, color: 'text-muted-foreground' };
  return <Icon className={`${className ?? ''} ${color}`} />;
}
