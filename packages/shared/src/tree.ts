import { z } from "zod";

// Paths are a trust boundary: a '../' segment would let one project's files
// collide with another's namespace, so they are rejected, never sanitised.
// unique (project_id, path) in Postgres is the backstop for concurrent renames.
// One segment is also the whole rule for a folder name (ADR 003 rename is
// name-only) and for each part of a path, so both share this.
export function isValidSegment(segment: string): boolean {
  return segment.length > 0 && segment !== "." && segment !== ".." && !segment.includes("/");
}

export function isValidPath(path: string): boolean {
  if (!path || path.length > 200) return false;
  return path.split("/").every(isValidSegment);
}

// `.gitkeep` is the placeholder `New Folder` writes (ADR 001): a real row that every
// path listing hides. One predicate, so the tree, quick-open and the project export
// cannot drift on which rows are displayable.
export const isPlaceholder = (path: string): boolean =>
  path.split("/").pop() === ".gitkeep";

// Folder-scoped create joins the clicked folder's prefix to the typed name;
// `''` is the project root. parentOf is its inverse, for name-only renames.
export const joinPath = (parent: string, name: string): string =>
  parent ? `${parent}/${name}` : name;

export function parentOf(path: string): string {
  return path.slice(0, Math.max(0, path.lastIndexOf("/")));
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
