import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, requireRole } from '@/server/services/authorization.service';
import { assignmentService } from '@/server/services/assignment.service';
import { CreateAssignmentSchema } from '@/server/validation/schemas';
import { errorToResponse } from '@/server/errors';

export async function GET(): Promise<NextResponse> {
  try {
    const auth = await getAuthContext();
    await requireRole(auth, 'INSTRUCTOR');

    const assignments = await assignmentService.listForInstructor(auth.user.id);
    return NextResponse.json(assignments);
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const auth = await getAuthContext();
    await requireRole(auth, 'INSTRUCTOR');

    const body = await req.json();
    const input = CreateAssignmentSchema.parse(body);

    const assignment = await assignmentService.createAssignment(auth.user.id, input);
    return NextResponse.json(assignment, { status: 201 });
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}
