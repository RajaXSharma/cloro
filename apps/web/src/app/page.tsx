import type { Metadata } from "next";
import Link from "next/link";

import { Wordmark } from "@/components/brand";
import { HeroPreview } from "@/components/landing/hero-preview";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: { absolute: "Cloro - collaborative code editor" },
  description:
    "A collaborative code editor. Real-time multi-file editing, live cursors, per-file undo, version snapshots, and AI edits that land in the shared document.",
};

/** Peer colors are the same hsla family the app derives from a user's email. */
const PEERS = [
  { name: "wren", color: "#5b9bf8" },
  { name: "imani", color: "#86c99a" },
  { name: "toma", color: "#e5a663" },
];

const CAPABILITIES = [
  {
    title: "Live cursors",
    body: "Every peer's caret and selection render in their own color, with their name on the caret and their open file in the roster.",
    visual: "presence" as const,
    span: true,
  },
  {
    title: "Folders that are just paths",
    body: "A folder is a prefix on a file path. Create files at any depth and the tree derives itself.",
    visual: "paths" as const,
    span: false,
  },
  {
    title: "Per-file undo",
    body: "One undo stack per open file, shared across the session. Undo in one tab never reaches into another.",
    visual: null,
    span: false,
  },
  {
    title: "Version snapshots",
    body: "Save a named version and restore any of them. Restoring writes the current content to a snapshot first, so it is reversible.",
    visual: null,
    span: false,
  },
  {
    title: "AI edits in the shared doc",
    body: "Ask a question or describe an edit. Applied edits land on the same undo stack as your typing.",
    visual: null,
    span: false,
  },
];

const STEPS = [
  {
    label: "Create a project",
    body: "A project is a set of files and the people in it. There is nothing else to configure.",
  },
  {
    label: "Invite by email",
    body: "The owner adds collaborators. Anyone with access can create, rename and delete files.",
  },
  {
    label: "Edit together",
    body: "Open a file and it syncs over a websocket. Jump between files with Ctrl+P.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
          <Link href="/" aria-label="Cloro home">
            <Wordmark />
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/login"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pt-14 pb-16 md:px-6 md:pt-24 md:pb-24">
          <div className="grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:gap-12">
            <div>
              <h1 className="max-w-[18ch] text-4xl leading-[1.08] font-semibold tracking-tight text-balance md:text-5xl">
                Edit the same file at the same time.
              </h1>
              <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-muted-foreground">
                CRDT-backed multi-file editing. Live cursors, per-file undo, version
                snapshots, and AI edits that land in the shared document.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/register"
                  className={buttonVariants({ size: "lg", className: "h-10 px-4" })}
                >
                  Create account
                </Link>
                <Link
                  href="#how-it-works"
                  className={buttonVariants({
                    variant: "outline",
                    size: "lg",
                    className: "h-10 px-4",
                  })}
                >
                  How it works
                </Link>
              </div>
            </div>

            <HeroPreview />
          </div>
        </section>

        {/* Capabilities */}
        <section className="mx-auto max-w-6xl px-4 pb-16 md:px-6 md:pb-24">
          <h2 className="sr-only">What Cloro does</h2>
          <div className="grid gap-px overflow-hidden rounded-lg border bg-border md:grid-cols-2">
            {CAPABILITIES.map((item) => (
              <div
                key={item.title}
                className={`flex flex-col gap-3 p-6 ${item.span ? "md:col-span-2" : ""} ${
                  item.visual === "presence" ? "bg-navy" : "bg-panel"
                }`}
              >
                <h3 className="text-sm font-semibold">{item.title}</h3>
                <p className="max-w-[62ch] text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </p>

                {item.visual === "presence" && (
                  <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-3">
                    {PEERS.map((peer) => (
                      <span key={peer.name} className="flex items-center gap-2">
                        <span
                          className="grid size-5 place-items-center rounded-full text-[10px] font-medium text-background"
                          style={{ backgroundColor: peer.color }}
                        >
                          {peer.name[0].toUpperCase()}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {peer.name}
                        </span>
                        <span
                          className="inline-block h-3.5 w-px"
                          style={{ backgroundColor: peer.color }}
                        />
                      </span>
                    ))}
                  </div>
                )}

                {item.visual === "paths" && (
                  <div className="mt-1 flex flex-col gap-1 font-mono text-xs text-muted-foreground">
                    <span>src/routes/users.ts</span>
                    <span>src/db.ts</span>
                    <span>package.json</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-y">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
            <h2 className="text-2xl font-semibold tracking-tight">
              Three things before anyone types
            </h2>
            <div className="mt-8 grid divide-y md:grid-cols-3 md:divide-x md:divide-y-0">
              {STEPS.map((step, i) => (
                <div
                  key={step.label}
                  className={`flex flex-col gap-2 py-6 md:py-0 ${
                    i === 0 ? "md:pr-8" : "md:px-8"
                  }`}
                >
                  <h3 className="text-sm font-semibold">{step.label}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
          <div className="flex flex-wrap items-center justify-between gap-6 rounded-lg border bg-panel px-6 py-8">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                Open a project and start typing.
              </h2>
              <p className="mt-2 max-w-[46ch] text-sm text-muted-foreground">
                No local setup, nothing to install. The editor runs in the browser and the
                document lives on the server.
              </p>
            </div>
            <Link
              href="/register"
              className={buttonVariants({ size: "lg", className: "h-10 px-4" })}
            >
              Create account
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 md:px-6">
          <Wordmark markClassName="size-4" />
          <p className="font-mono text-xs text-muted-foreground">
            Next.js, Postgres, Yjs. Code stays in your database.
          </p>
          <Link
            href="/login"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}
