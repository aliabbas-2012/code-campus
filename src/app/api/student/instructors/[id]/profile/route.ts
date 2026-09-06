import { NextResponse } from 'next/server';
import { getAuthContext, requireRole } from '@/server/services/authorization.service';
import { instructorProfileService } from '@/server/services/instructor-profile.service';
import { errorToResponse } from '@/server/errors';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const auth = await getAuthContext();
    await requireRole(auth, 'STUDENT');
    const profile = await instructorProfileService.getForStudent(id, auth.user.id);
    return NextResponse.json(profile);
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}
