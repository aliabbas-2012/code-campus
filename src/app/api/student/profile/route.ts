import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, requireRole } from '@/server/services/authorization.service';
import { studentProfileService } from '@/server/services/student-profile.service';
import { UpdateStudentProfileSchema } from '@/server/validation/schemas';
import { errorToResponse } from '@/server/errors';

export async function GET(): Promise<NextResponse> {
  try {
    const auth = await getAuthContext();
    await requireRole(auth, 'STUDENT');
    const profile = await studentProfileService.getOwn(auth.user.id);
    return NextResponse.json(profile);
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    const auth = await getAuthContext();
    await requireRole(auth, 'STUDENT');
    const body = await req.json();
    const input = UpdateStudentProfileSchema.parse(body);
    const profile = await studentProfileService.upsertOwn(auth.user.id, input);
    return NextResponse.json(profile);
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}
