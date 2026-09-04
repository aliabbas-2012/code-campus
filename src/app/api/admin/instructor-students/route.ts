import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, requireRole } from '@/server/services/authorization.service';
import { rosterService } from '@/server/services/roster.service';
import { CreateInstructorStudentSchema } from '@/server/validation/schemas';
import { errorToResponse } from '@/server/errors';

export async function GET(): Promise<NextResponse> {
  try {
    const auth = await getAuthContext();
    await requireRole(auth, 'ADMIN');

    const links = await rosterService.listAll();
    return NextResponse.json(links);
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const auth = await getAuthContext();
    await requireRole(auth, 'ADMIN');

    const body = await req.json();
    const input = CreateInstructorStudentSchema.parse(body);

    const link = await rosterService.createLink(input.instructor_id, input.student_id);
    return NextResponse.json(link, { status: 201 });
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}
