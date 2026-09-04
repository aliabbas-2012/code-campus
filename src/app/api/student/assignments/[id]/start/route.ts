import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, requireRole, requireStudentWorkspace } from '@/server/services/authorization.service';
import { submissionService } from '@/server/services/submission.service';
import { errorToResponse } from '@/server/errors';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(_req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const auth = await getAuthContext();
    await requireRole(auth, 'STUDENT');
    const workspaceId = await requireStudentWorkspace(auth);

    const result = await submissionService.startAssignment(id, auth.user.id, workspaceId);
    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}
