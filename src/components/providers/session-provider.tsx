'use client';

import { useEffect } from 'react';
import { SessionProvider, signOut, useSession } from 'next-auth/react';

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

export function AuthSessionProvider({ children }: { children: React.ReactNode }): React.ReactNode {
  return (
    <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus>
      <SessionGuard />
      {children}
    </SessionProvider>
  );
}
