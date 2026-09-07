import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth';

// A JWT's own validity (session.maxAge in auth.ts) is independent of how long the browser
// keeps the cookie around — this route controls the latter. Call it right after signIn()
// succeeds: with remember=true the cookie gets a 30-day Max-Age so it survives closing the
// browser; with remember=false (the default) it's re-set with no Max-Age at all, so the
// browser drops it — and the session with it — as soon as the browser actually closes.
const REMEMBER_ME_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

const SESSION_COOKIE_NAMES = ['__Secure-next-auth.session-token', 'next-auth.session-token'];

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authConfig);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const remember = body?.remember === true;

  const res = NextResponse.json({ success: true });

  for (const name of SESSION_COOKIE_NAMES) {
    const existing = req.cookies.get(name);
    if (!existing) continue;

    res.cookies.set({
      name,
      value: existing.value,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: name.startsWith('__Secure-'),
      ...(remember ? { maxAge: REMEMBER_ME_MAX_AGE_SECONDS } : {}),
    });
    break;
  }

  return res;
}
