'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    if (!res.ok) {
      setError(res.status === 409 ? 'email already registered' : 'invalid fields');
      return;
    }
    const signInRes = await signIn('credentials', { email, password, redirect: false });
    if (signInRes?.error) {
      setError('sign-in failed, try logging in');
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="mx-auto mt-24 w-full max-w-sm space-y-6">
      <h1 className="text-xl font-semibold">Create an account</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          required
          placeholder="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded border px-3 py-2 text-sm"
        />
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
          Register
        </button>
      </form>
      <p className="text-sm text-gray-500">
        Have an account?{' '}
        <a href="/login" className="underline">
          Sign in
        </a>
      </p>
    </div>
  );
}
