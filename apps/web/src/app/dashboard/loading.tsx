import Link from "next/link";

import { Wordmark } from "@/components/brand";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectListSkeleton } from "./project-list-skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <p role="status" className="sr-only">
        Loading your projects
      </p>

      <header className="border-b">
        <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between gap-4 px-4 md:px-6">
          <Link href="/" aria-label="Cloro home">
            <Wordmark />
          </Link>
          <div className="flex items-center gap-4">
            <Skeleton className="hidden h-3.5 w-40 sm:block" />
            <Skeleton className="h-7 w-20" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 md:px-6">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="mt-3 h-4 w-full max-w-[60ch]" />

        <div className="mt-8 flex flex-col gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="flex-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-2 h-9 w-full" />
            </div>
            <Skeleton className="h-9 w-24 shrink-0 sm:mt-6" />
          </div>

          <ProjectListSkeleton />
        </div>
      </main>
    </div>
  );
}
