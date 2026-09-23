import { Skeleton } from "@/components/ui/skeleton";

const TREE_ROWS = [
  { width: "w-24", indent: "ml-0" },
  { width: "w-28", indent: "ml-3" },
  { width: "w-20", indent: "ml-6" },
  { width: "w-24", indent: "ml-6" },
  { width: "w-16", indent: "ml-3" },
  { width: "w-28", indent: "ml-0" },
  { width: "w-20", indent: "ml-3" },
];

const EDITOR_LINES = [
  "w-3/5",
  "w-4/5",
  "w-2/5",
  "w-3/4",
  "w-1/2",
  "w-2/3",
  "w-1/3",
  "w-3/5",
  "w-1/4",
  "w-2/5",
];

const VERSION_ROWS = ["w-32", "w-24", "w-40"];

export function WorkspaceSkeleton() {
  return (
    <div className="flex min-h-[100dvh] flex-col lg:h-[100dvh]">
      <p role="status" className="sr-only">
        Loading project
      </p>

      {/* Header: same sticky bar, title and action cluster as the live page. */}
      <header className="sticky top-0 z-20 flex shrink-0 items-center gap-3 border-b bg-panel px-3 py-2 md:px-4">
        <Skeleton className="h-4 w-14" />
        <span className="h-4 w-px shrink-0 bg-border" aria-hidden="true" />
        <Skeleton className="h-4 w-36" />
        <Skeleton className="hidden h-3 w-12 sm:block" />
        <div className="ml-auto flex items-center gap-3">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-7 w-16" />
        </div>
      </header>

      <div className="flex flex-1 flex-col lg:min-h-0 lg:flex-row lg:overflow-hidden">
        {/* Editor pane, first on small screens like the real layout. */}
        <main className="order-1 flex min-w-0 flex-col lg:order-2 lg:min-h-0 lg:flex-1 lg:overflow-hidden">
          {/* Open tabs. */}
          <div className="flex shrink-0 items-center gap-4 border-b bg-background px-3 py-2.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-28" />
          </div>
          {/* Active path + connection status. */}
          <div className="flex shrink-0 items-center gap-3 border-b bg-background px-4 py-1.5">
            <Skeleton className="h-3.5 w-52" />
            <Skeleton className="ml-auto h-3 w-20" />
          </div>
          {/* Code area. */}
          <div className="min-h-[60dvh] lg:min-h-0 lg:flex-1">
            <div className="flex flex-col gap-3 p-4">
              {EDITOR_LINES.map((width, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-3 w-5 shrink-0" />
                  <Skeleton className={`h-3 ${width}`} />
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* File tree. */}
        <aside className="order-2 h-64 shrink-0 overflow-hidden border-t bg-panel lg:order-1 lg:h-auto lg:w-64 lg:border-t-0 lg:border-r">
          <div className="flex h-full flex-col">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2">
              <Skeleton className="h-3 w-10" />
              <div className="flex items-center gap-1">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-5 w-5" />
              </div>
            </div>
            <div className="flex flex-col gap-3 px-3 py-3">
              {TREE_ROWS.map((row, i) => (
                <Skeleton key={i} className={`h-3.5 ${row.width} ${row.indent}`} />
              ))}
            </div>
          </div>
        </aside>

        {/* Versions above the assistant, same split as the live right rail. */}
        <aside className="order-3 flex h-[30rem] shrink-0 flex-col overflow-hidden border-t bg-panel lg:h-auto lg:w-80 lg:border-t-0 lg:border-l">
          <div className="max-h-56 shrink-0 overflow-hidden border-b p-3">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-16" />
            </div>
            <div className="mt-3 flex flex-col gap-3">
              {VERSION_ROWS.map((width, i) => (
                <Skeleton key={i} className={`h-3.5 ${width}`} />
              ))}
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-5 w-16" />
            </div>
            <div className="flex flex-1 flex-col gap-3 p-3">
              <Skeleton className="h-10 w-4/5" />
              <Skeleton className="h-16 w-full" />
            </div>
            <div className="border-t p-3">
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
