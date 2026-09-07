import type { DefaultSession } from 'next-auth';
import type { Role } from '@prisma/client';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession['user'];
    /** Set by the jwt callback when the session was force-invalidated (SESSION_INVALIDATION_KEY
     * rotated, or the account was disabled/deleted since the last 15-minute refresh) — SessionGuard
     * watches for this and signs the client out. */
    error?: 'SessionInvalidated';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: Role;
    /** The SESSION_INVALIDATION_KEY value in effect when this token was issued — compared against
     * the current env value on every refresh so rotating that key force-expires every existing session. */
    sessionKey: string;
    /** Epoch ms — once passed, the next jwt callback invocation re-validates the account against the
     * database instead of trusting the cached token, standing in for a real access/refresh-token pair
     * since Credentials auth has no external token to actually refresh. */
    accessTokenExpires: number;
    error?: 'SessionInvalidated';
  }
}
