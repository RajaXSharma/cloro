import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { DocList } from './doc-list';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your documents</h1>
        <p className="text-sm text-gray-500">Signed in as {session.user.name}</p>
      </div>
      <DocList />
    </main>
  );
}
