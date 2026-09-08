import NextAuth from 'next-auth';
import { NextRequest } from 'next/server';
import { authConfig } from '@/lib/auth';
import { REMEMBER_ME_COOKIE, SESSION_COOKIE_NAMES } from '@/lib/session-cookie-names';

const handler = NextAuth(authConfig);

type RouteContext = { params: Promise<{ nextauth: string[] }> };

// next-auth v4's own internal routes (session.js, callback.js — not something authConfig's
// callbacks can influence) unconditionally re-stamp the session cookie's Max-Age/Expires to
// `session.maxAge` (30 days) on *every* request that touches it — the initial sign-in, and
// every later GET /api/auth/session poll from useSession(). That silently undoes the "Remember
// me" unchecked case (a session-only cookie, no Max-Age) within minutes of login, since
// SessionProvider's refetchInterval (and just navigating around) triggers exactly that touch.
// There's no authConfig hook for this — it's baked into next-auth's route handlers — so this
// wrapper corrects it after the fact: if the user didn't check "Remember me" (recorded in the
// REMEMBER_ME_COOKIE marker by /api/auth/remember-me, called right after signIn()), strip
// Max-Age/Expires back off the session-token Set-Cookie on every response from this route.
async function withRememberMeCorrection(req: NextRequest, context: RouteContext): Promise<Response> {
  const response = (await handler(req, context)) as Response;

  const remembered = req.cookies.get(REMEMBER_ME_COOKIE)?.value === '1';
  if (remembered) return response;

  const setCookieValues = response.headers.getSetCookie();
  if (setCookieValues.length === 0) return response;

  const hasSessionCookie = setCookieValues.some((c) => SESSION_COOKIE_NAMES.some((name) => c.startsWith(`${name}=`)));
  if (!hasSessionCookie) return response;

  const corrected = setCookieValues.map((cookieStr) => {
    const isSessionCookie = SESSION_COOKIE_NAMES.some((name) => cookieStr.startsWith(`${name}=`));
    if (!isSessionCookie) return cookieStr;
    return cookieStr.replace(/;\s*Max-Age=\d+/i, '').replace(/;\s*Expires=[^;]+/i, '');
  });

  const newHeaders = new Headers(response.headers);
  newHeaders.delete('set-cookie');
  for (const c of corrected) newHeaders.append('set-cookie', c);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

export { withRememberMeCorrection as GET, withRememberMeCorrection as POST };
