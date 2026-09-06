import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, requireRole } from '@/server/services/authorization.service';
import { rosterService } from '@/server/services/roster.service';
import { errorToResponse } from '@/server/errors';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const auth = await getAuthContext();
    await requireRole(auth, 'INSTRUCTOR');

    const q = req.nextUrl.searchParams.get('q') ?? undefined;
    const roster = await rosterService.listForInstructor(auth.user.id, q);
    return NextResponse.json(roster);
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}
