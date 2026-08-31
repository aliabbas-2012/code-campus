'use client';

import { SessionProvider } from 'next-auth/react';

export function AuthSessionProvider({ children }: { children: React.ReactNode }): React.ReactNode {
  return <SessionProvider>{children}</SessionProvider>;
}
