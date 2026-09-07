import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { db } from '@/lib/prisma';
import type { Role } from '@prisma/client';

// Credentials auth has no external token to actually refresh, so this stands in for one: every
// 15 minutes, instead of trusting the cached JWT outright, the account is re-checked against the
// database (still exists, still ACTIVE) before the token is allowed to keep working. Catches a
// disabled/deleted account within 15 minutes instead of it staying valid for the full session length.
const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;

// Bumping SESSION_INVALIDATION_KEY in .env.local (and restarting) force-expires every
// already-issued session on its very next check — a deliberate kill switch, independent of
// NEXTAUTH_SECRET (rotating that would also break CSRF/other cryptographic state, not just sessions).
function currentSessionKey(): string {
  return process.env.SESSION_INVALIDATION_KEY ?? 'default';
}

export const authConfig: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password_hash) {
          throw new Error('Invalid credentials');
        }

        const passwordMatch = await compare(credentials.password, user.password_hash);
        if (!passwordMatch) {
          throw new Error('Invalid credentials');
        }

        if (user.status !== 'ACTIVE') {
          throw new Error('User account is disabled');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Fresh sign-in.
        token.id = user.id;
        token.role = (user as unknown as { role: Role }).role;
        token.sessionKey = currentSessionKey();
        token.accessTokenExpires = Date.now() + ACCESS_TOKEN_TTL_MS;
        return token;
      }

      if (token.sessionKey !== currentSessionKey()) {
        return { ...token, error: 'SessionInvalidated' };
      }

      if (typeof token.accessTokenExpires === 'number' && Date.now() < token.accessTokenExpires) {
        return token;
      }

      // 15-minute access window elapsed — re-validate against the database.
      const dbUser = await db.user.findUnique({ where: { id: token.id } });
      if (!dbUser || dbUser.status !== 'ACTIVE') {
        return { ...token, error: 'SessionInvalidated' };
      }

      return {
        ...token,
        role: dbUser.role,
        accessTokenExpires: Date.now() + ACCESS_TOKEN_TTL_MS,
      };
    },
    async session({ session, token }) {
      if (token.error) {
        return { ...session, error: token.error, user: undefined } as unknown as typeof session;
      }
      if (session.user) {
        session.user.role = token.role;
        session.user.id = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    // Outer ceiling for a "Remember me" login — the cookie itself is what actually decides
    // whether a non-remembered session survives closing the browser (see
    // /api/auth/remember-me, called right after sign-in), independent of this value.
    maxAge: 30 * 24 * 60 * 60,
  },
};
