import { ChevronDown, FileCode, FileJson, FileText } from "lucide-react";

import { parsePaths, type TreeNode } from "shared";

/**
 * A miniature of the real project page, rendered from the real tree algorithm
 * (`parsePaths`) rather than from rectangles pretending to be a screenshot.
 *
 * The code colours are Monaco's stock vs-dark token colours, matching what the
 * editor actually renders, so the preview cannot drift from the editor it depicts.
 * File glyphs are left monochrome in the preview: the per-extension colours belong
 * in the workspace, and the landing page keeps to a single accent.
 */

type Tok = "key" | "typ" | "fn" | "prop" | "str" | "num" | "com" | "pun";

/** Monaco's own vs-dark palette. Not a Cloro palette, and not re-skinned. */
const TOKENS: Record<Tok, string> = {
  key: "text-[#569cd6]", // keyword
  typ: "text-[#4ec9b0]", // type / class
  fn: "text-[#dcdcaa]", // function
  prop: "text-[#9cdcfe]", // variable / property
  str: "text-[#ce9178]", // string
  num: "text-[#b5cea8]", // number
  com: "italic text-[#6a9955]", // comment
  pun: "text-[#d4d4d4]", // punctuation, operators, plain text
};

const CODE: Array<Array<[string, Tok]>> = [
  [
    ["import", "key"],
    [" { ", "pun"],
    ["Pool", "typ"],
    [" } ", "pun"],
    ["from", "key"],
    [" '", "str"],
    ["pg", "str"],
    ["'", "str"],
    [";", "pun"],
  ],
  [],
  [["// one pool per process; the tree lives in Postgres", "com"]],
  [
    ["export", "key"],
    [" const ", "key"],
    ["pool", "prop"],
    [" = ", "pun"],
    ["new", "key"],
    [" ", "pun"],
    ["Pool", "typ"],
    ["(", "pun"],
    ["{", "pun"],
  ],
  [
    ["  connectionString", "prop"],
    [": ", "pun"],
    ["process", "prop"],
    [".", "pun"],
    ["env", "prop"],
    [".", "pun"],
    ["DATABASE_URL", "prop"],
    [",", "pun"],
  ],
  [["}", "pun"], [");", "pun"]],
  [],
  [
    ["export", "key"],
    [" const ", "key"],
    ["query", "fn"],
    [" = ", "pun"],
    ["(", "pun"],
    ["sql", "prop"],
    [": ", "pun"],
    ["string", "typ"],
    [", ", "pun"],
    ["params", "prop"],
    ["?: ", "pun"],
    ["unknown", "typ"],
    ["[]", "pun"],
    [") =>", "pun"],
  ],
  [
    ["  ", "pun"],
    ["pool", "prop"],
    [".", "pun"],
    ["query", "fn"],
    ["(", "pun"],
    ["sql", "prop"],
    [", ", "pun"],
    ["params", "prop"],
    [");", "pun"],
  ],
];

const PROJECT_FILES = [
  { id: "1", path: "src/routes/health.ts" },
  { id: "2", path: "src/routes/users.ts" },
  { id: "3", path: "src/db.ts" },
  { id: "4", path: "src/server.ts" },
  { id: "5", path: "package.json" },
];

const TABS = ["db.ts", "server.ts", "health.ts"];

const PEERS = [
  { name: "wren", color: "#5b9bf8" },
  { name: "imani", color: "#86c99a" },
];

const ACTIVE_LINE = 4; // 0-indexed: the `connectionString` line

function glyph(name: string) {
  if (name.endsWith(".json")) return FileJson;
  if (name.endsWith(".ts") || name.endsWith(".tsx")) return FileCode;
  return FileText;
}

function Rows({ nodes, depth = 0 }: { nodes: TreeNode[]; depth?: number }) {
  return (
    <>
      {nodes.map((node) => {
        if (node.type === "folder") {
          return (
            <div key={node.path}>
              <div
                className="flex items-center gap-1.5 py-[3px] text-[11px] text-muted-foreground"
                style={{ paddingLeft: depth * 12 + 8 }}
              >
                <ChevronDown className="size-3 shrink-0" />
                <span className="truncate font-medium">{node.name}</span>
              </div>
              <Rows nodes={node.children} depth={depth + 1} />
            </div>
          );
        }
        const Glyph = glyph(node.name);
        const active = node.name === "db.ts";
        return (
          <div
            key={node.id}
            className={`flex items-center gap-1.5 py-[3px] text-[11px] ${
              active ? "bg-secondary/60 font-medium text-foreground" : "text-muted-foreground"
            }`}
            style={{ paddingLeft: depth * 12 + 22 }}
          >
            <Glyph className="size-3 shrink-0" />
            <span className="truncate">{node.name}</span>
          </div>
        );
      })}
    </>
  );
}

export function HeroPreview() {
  const tree = parsePaths(PROJECT_FILES);

  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-lg border bg-panel text-foreground select-none"
    >
      {/* Project header, matching /project/[id] */}
      <div className="flex items-center gap-3 border-b px-3 py-2">
        <span className="text-[11px] font-medium">checkout-service</span>
        <span className="meta text-[10px]">5 files</span>
        <div className="ml-auto flex items-center -space-x-1.5">
          {PEERS.map((p) => (
            <span
              key={p.name}
              title={p.name}
              className="grid size-4 place-items-center rounded-full border border-panel text-[8px] font-medium text-[#0b0c0e]"
              style={{ backgroundColor: p.color }}
            >
              {p.name[0].toUpperCase()}
            </span>
          ))}
        </div>
      </div>

      <div className="flex">
        {/* File tree */}
        <div className="w-[148px] shrink-0 border-r py-1.5">
          <div className="flex items-center justify-between px-3 pb-1.5">
            <span className="font-mono text-[9px] tracking-wide text-muted-foreground uppercase">
              Files
            </span>
          </div>
          <Rows nodes={tree} />
        </div>

        {/* Tabs + code */}
        <div className="min-w-0 flex-1">
          <div className="flex items-stretch border-b">
            {TABS.map((tab, i) => (
              <div
                key={tab}
                className={`border-r px-2.5 py-1.5 font-mono text-[10px] ${
                  i === 0
                    ? "bg-secondary/60 font-medium text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {tab}
              </div>
            ))}
          </div>

          <div className="py-2 font-mono text-[10.5px] leading-[1.7]">
            {CODE.map((line, i) => (
              <div
                key={i}
                className={`relative flex px-2 ${
                  i === ACTIVE_LINE ? "bg-secondary/40" : ""
                }`}
              >
                <span className="w-6 shrink-0 pr-2 text-right text-[#3a4048] select-none">
                  {i + 1}
                </span>
                <span className="min-w-0 whitespace-pre">
                  {line.map(([text, tok], j) => (
                    <span key={j} className={TOKENS[tok]}>
                      {text}
                    </span>
                  ))}
                </span>
                {/* A real presence caret: the remote peer's color and name. */}
                {i === ACTIVE_LINE && (
                  <span className="absolute top-0 bottom-0 left-[7.4rem] w-px bg-[#5b9bf8]">
                    <span className="absolute -top-3.5 left-0 rounded-full bg-[#5b9bf8] px-1.5 py-px text-[8px] leading-tight font-medium text-[#0b0c0e]">
                      wren
                    </span>
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right rail, collapsed to a strip */}
        <div className="hidden w-[92px] shrink-0 border-l py-2 lg:block">
          <div className="px-2 pb-1.5 font-mono text-[9px] tracking-wide text-muted-foreground uppercase">
            Versions
          </div>
          <div className="mx-2 mb-3 flex items-center justify-between rounded-sm border px-1.5 py-1">
            <span className="font-mono text-[9px] text-muted-foreground">before auth</span>
          </div>
          <div className="px-2 pb-1.5 font-mono text-[9px] tracking-wide text-muted-foreground uppercase">
            AI
          </div>
          <div className="mx-2 rounded-sm bg-secondary/60 px-1.5 py-1 text-[9px] text-muted-foreground">
            Add a health check
          </div>
        </div>
      </div>
    </div>
  );
}
