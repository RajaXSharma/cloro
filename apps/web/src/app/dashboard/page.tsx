import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { Wordmark } from '@/components/brand';
import { ProjectList } from './project-list';
import { SignOutButton } from './sign-out-button';

export const metadata: Metadata = {
  title: 'Your projects',
  description: 'The Cloro projects you own and the ones shared with you.',
};

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between gap-4 px-4 md:px-6">
          <Link href="/" aria-label="Cloro home">
            <Wordmark />
          </Link>
          <div className="flex items-center gap-4">
            <p className="hidden text-xs text-muted-foreground sm:block">
              Signed in as <span className="text-foreground">{session.user.name}</span>
            </p>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 md:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Your projects</h1>
        <p className="mt-2 max-w-[60ch] text-sm text-muted-foreground">
          A project is a set of files and the people you share it with.
        </p>
        <div className="mt-8">
          <ProjectList />
        </div>
      </main>
    </div>
  );
}
