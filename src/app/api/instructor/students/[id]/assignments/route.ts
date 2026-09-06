import { NextResponse } from 'next/server';
import { getAuthContext, requireRole } from '@/server/services/authorization.service';
import { assignmentService } from '@/server/services/assignment.service';
import { errorToResponse } from '@/server/errors';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id: studentId } = await params;
    const auth = await getAuthContext();
    await requireRole(auth, 'INSTRUCTOR');

    const assignments = await assignmentService.listForInstructorAndStudent(auth.user.id, studentId);
    return NextResponse.json(assignments);
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}
