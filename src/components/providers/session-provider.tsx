'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { SessionProvider, signOut, useSession } from 'next-auth/react';
import { LAST_PATH_EXCLUDED, LAST_PATH_STORAGE_KEY } from '@/lib/last-path';

// Watches for the session callback marking the token invalid (SESSION_INVALIDATION_KEY
// rotated, or the account was disabled/deleted since the last 15-minute refresh — see
// src/lib/auth.ts) and forces a sign-out instead of leaving the app silently half-authenticated.
function SessionGuard(): null {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.error === 'SessionInvalidated') {
      void signOut({ callbackUrl: '/login' });
    }
  }, [session]);

  return null;
}

// Remembers the last page a signed-in user was on, so a remembered session that outlives a
// closed browser can offer "Resume where you left off" on the home page instead of only a
// generic dashboard link — see resume-last-page-button.tsx.
function LastPathTracker(): null {
  const pathname = usePathname();
  const { status } = useSession();

  useEffect(() => {
    if (status !== 'authenticated' || !pathname) return;
    if (LAST_PATH_EXCLUDED.includes(pathname)) return;
    try {
      localStorage.setItem(LAST_PATH_STORAGE_KEY, pathname);
    } catch {
      // Best-effort only.
    }
  }, [pathname, status]);

  return null;
}

export function AuthSessionProvider({ children }: { children: React.ReactNode }): React.ReactNode {
  return (
    <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus>
      <SessionGuard />
      <LastPathTracker />
      {children}
    </SessionProvider>
  );
}
