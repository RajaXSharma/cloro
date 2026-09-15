import { z } from "zod";

// Paths are a trust boundary: a '../' segment would let one project's files
// collide with another's namespace, so they are rejected, never sanitised.
// unique (project_id, path) in Postgres is the backstop for concurrent renames.
export function isValidPath(path: string): boolean {
  if (!path || path.length > 200) return false;
  return path.split("/").every((s) => s.length > 0 && s !== "." && s !== "..");
}

export const PathSchema = z.string().min(1).max(200).refine(isValidPath, "invalid path");

const LANGUAGES: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  py: "python",
  json: "json",
  html: "html",
  htm: "html",
  css: "css",
  scss: "scss",
  md: "markdown",
  sql: "sql",
  sh: "shell",
  bash: "shell",
  yml: "yaml",
  yaml: "yaml",
  rs: "rust",
  go: "go",
  java: "java",
  c: "c",
  h: "c",
  cpp: "cpp",
  cc: "cpp",
  hpp: "cpp",
  rb: "ruby",
  php: "php",
};

export function extToLanguage(path: string): string {
  const base = path.slice(path.lastIndexOf("/") + 1);
  const ext = base.includes(".") ? base.split(".").pop()!.toLowerCase() : "";
  return LANGUAGES[ext] ?? "plaintext";
}

export type FileNode = { type: "file"; id: string; path: string; name: string };
export type FolderNode = {
  type: "folder";
  name: string;
  path: string;
  children: TreeNode[];
};
export type TreeNode = FileNode | FolderNode;

// Folders are paths, not rows — the sidebar is derived from the flat list.
// Returned order is folders before files, alphabetical within each, recursively.
export function parsePaths(files: { id: string; path: string }[]): TreeNode[] {
  const root: FolderNode = { type: "folder", name: "", path: "", children: [] };
  const folders = new Map<string, FolderNode>([["", root]]);

  for (const file of files) {
    const parts = file.path.split("/");
    const name = parts.pop()!;
    let parent = "";
    for (const part of parts) {
      const path = parent ? `${parent}/${part}` : part;
      if (!folders.has(path)) {
        const folder: FolderNode = { type: "folder", name: part, path, children: [] };
        folders.set(path, folder);
        folders.get(parent)!.children.push(folder);
      }
      parent = path;
    }
    folders.get(parent)!.children.push({ type: "file", id: file.id, path: file.path, name });
  }

  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) =>
      a.type === b.type ? a.name.localeCompare(b.name) : a.type === "folder" ? -1 : 1,
    );
    for (const node of nodes) if (node.type === "folder") sort(node.children);
  };
  sort(root.children);
  return root.children;
}
