import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';
import { REMEMBER_ME_COOKIE, SESSION_COOKIE_NAMES } from '@/lib/session-cookie-names';

// A JWT's own validity (session.maxAge in auth.ts) is independent of how long the browser
// keeps the cookie around — this route controls the latter. Call it right after signIn()
// succeeds: with remember=true the cookie gets a 30-day Max-Age so it survives closing the
// browser; with remember=false (the default) it's re-set with no Max-Age at all, so the
// browser drops it — and the session with it — as soon as the browser actually closes.
//
// This alone isn't enough, though: next-auth's own /api/auth/session polling re-stamps the
// cookie back to a 30-day Max-Age on every touch (see the [...nextauth] route wrapper), so the
// REMEMBER_ME_COOKIE marker set below is what that wrapper reads to know whether to undo that
// on every subsequent request — its own persistence has to mirror the session cookie's exactly,
// or the correction stops working the moment this marker itself expires/disappears.
const REMEMBER_ME_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authConfig);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const remember = body?.remember === true;

  const res = NextResponse.json({ success: true });

  let isSecureCookie = false;
  for (const name of SESSION_COOKIE_NAMES) {
    const existing = req.cookies.get(name);
    if (!existing) continue;

    isSecureCookie = name.startsWith('__Secure-');
    res.cookies.set({
      name,
      value: existing.value,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: isSecureCookie,
      ...(remember ? { maxAge: REMEMBER_ME_MAX_AGE_SECONDS } : {}),
    });
    break;
  }

  res.cookies.set({
    name: REMEMBER_ME_COOKIE,
    value: remember ? '1' : '0',
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: isSecureCookie,
    ...(remember ? { maxAge: REMEMBER_ME_MAX_AGE_SECONDS } : {}),
  });

  return res;
}
