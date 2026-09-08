// Shared between the [...nextauth] route wrapper and /api/auth/remember-me — see the comment
// in [...nextauth]/route.ts for why the wrapper exists at all.
export const SESSION_COOKIE_NAMES = ['__Secure-next-auth.session-token', 'next-auth.session-token'];

// A small non-httpOnly-to-the-client, server-read-only marker: '1' when the user checked
// "Remember me", '0' (or absent) otherwise. Persistence mirrors whatever it's marking —
// see /api/auth/remember-me/route.ts.
export const REMEMBER_ME_COOKIE = 'code-campus-remember-me';
