import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, requireRole } from '@/server/services/authorization.service';
import { assignmentService } from '@/server/services/assignment.service';
import { AddAssignmentStudentsSchema } from '@/server/validation/schemas';
import { errorToResponse } from '@/server/errors';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const auth = await getAuthContext();
    await requireRole(auth, 'INSTRUCTOR');

    const body = await req.json();
    const input = AddAssignmentStudentsSchema.parse(body);

    await assignmentService.addStudents(id, auth.user.id, input.student_ids);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}
