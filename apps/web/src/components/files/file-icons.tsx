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
// Shades are the 400 step so every glyph clears 3:1 on the near-black panel.
const ICONS: Record<string, { Icon: LucideIcon; color: string }> = {
  ts: { Icon: Braces, color: 'text-blue-400' },
  tsx: { Icon: Braces, color: 'text-blue-400' },
  js: { Icon: Braces, color: 'text-yellow-400' },
  jsx: { Icon: Braces, color: 'text-yellow-400' },
  mjs: { Icon: Braces, color: 'text-yellow-400' },
  cjs: { Icon: Braces, color: 'text-yellow-400' },
  json: { Icon: FileJson, color: 'text-amber-400' },
  css: { Icon: Palette, color: 'text-violet-400' },
  scss: { Icon: Palette, color: 'text-pink-400' },
  html: { Icon: Globe, color: 'text-orange-400' },
  htm: { Icon: Globe, color: 'text-orange-400' },
  md: { Icon: FileText, color: 'text-sky-400' },
  sql: { Icon: Database, color: 'text-emerald-400' },
  py: { Icon: FileCode, color: 'text-green-400' },
  sh: { Icon: FileCode, color: 'text-zinc-400' },
  yml: { Icon: FileText, color: 'text-rose-400' },
  yaml: { Icon: FileText, color: 'text-rose-400' },
};

export function FileIcon({ name, className }: { name: string; className?: string }) {
  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
  const { Icon, color } = ICONS[ext] ?? { Icon: FileBase, color: 'text-muted-foreground' };
  return <Icon className={`${className ?? ''} ${color}`} aria-hidden="true" />;
}
