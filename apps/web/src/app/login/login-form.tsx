'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export function LoginForm({ showGithub }: { showGithub: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const res = await signIn('credentials', { email, password, redirect: false });
    if (res?.error) {
      setError('invalid credentials');
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="mx-auto mt-24 w-full max-w-sm space-y-6">
      <h1 className="text-xl font-semibold">Sign in to Cloro</h1>
      {showGithub && (
        <button
          onClick={() => signIn('github', { callbackUrl: '/dashboard' })}
          className="w-full rounded border px-4 py-2 text-sm"
        >
          Continue with GitHub
        </button>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          required
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border px-3 py-2 text-sm"
        />
        <input
          type="password"
          required
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border px-3 py-2 text-sm"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="w-full rounded bg-black px-4 py-2 text-sm text-white">
          Sign in
        </button>
      </form>
      <p className="text-sm text-gray-500">
        No account?{' '}
        <a href="/register" className="underline">
          Register
        </a>
      </p>
    </div>
  );
}
