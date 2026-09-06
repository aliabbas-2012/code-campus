import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, requireRole } from '@/server/services/authorization.service';
import { instructorProfileService } from '@/server/services/instructor-profile.service';
import { UpdateInstructorProfileSchema } from '@/server/validation/schemas';
import { errorToResponse } from '@/server/errors';

export async function GET(): Promise<NextResponse> {
  try {
    const auth = await getAuthContext();
    await requireRole(auth, 'INSTRUCTOR');
    const profile = await instructorProfileService.getOwn(auth.user.id);
    return NextResponse.json(profile);
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    const auth = await getAuthContext();
    await requireRole(auth, 'INSTRUCTOR');
    const body = await req.json();
    const input = UpdateInstructorProfileSchema.parse(body);
    const profile = await instructorProfileService.upsertOwn(auth.user.id, input);
    return NextResponse.json(profile);
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}
