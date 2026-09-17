'use client';

import { LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
    >
      <LogOut className="size-4" />
      Sign out
    </button>
  );
}
