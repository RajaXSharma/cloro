import Link from "next/link";

import { Wordmark } from "@/components/brand";

const FACTS = [
  {
    term: "Real-time sync",
    detail: "Every keystroke travels as a CRDT update over a websocket. There is no save step.",
  },
  {
    term: "Per-file undo",
    detail: "One undo stack per open tab, shared with the session. AI edits land on the same stack.",
  },
  {
    term: "Your key, your model",
    detail: "Point the assistant at any OpenAI-compatible endpoint. The key stays on the server.",
  },
];

/**
 * Shared frame for /login and /register. The left panel is the only place the
 * product explains itself before sign-in; it is a real panel, not a decorative
 * half-screen gradient.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-2">
      <aside className="hidden flex-col justify-between border-r bg-panel p-10 lg:flex">
        <Link href="/" aria-label="Cloro home">
          <Wordmark />
        </Link>

        <div className="max-w-[38ch]">
          <p className="text-2xl leading-snug font-semibold tracking-tight text-balance">
            The document lives on the server. Everyone sees the same file.
          </p>
          <dl className="mt-8 flex flex-col gap-5">
            {FACTS.map((fact) => (
              <div key={fact.term} className="border-t pt-4">
                <dt className="text-sm font-medium">{fact.term}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {fact.detail}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="font-mono text-xs text-muted-foreground">Cloro</p>
      </aside>

      <main className="flex flex-col">
        <div className="border-b p-4 lg:hidden">
          <Link href="/" aria-label="Cloro home">
            <Wordmark />
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="w-full max-w-sm">
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            {subtitle && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
            )}
            <div className="mt-6 flex flex-col gap-5">{children}</div>
            <div className="mt-6 border-t pt-4 text-sm text-muted-foreground">{footer}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
