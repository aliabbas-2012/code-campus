import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, requireRole } from '@/server/services/authorization.service';
import { submissionService } from '@/server/services/submission.service';
import { ResolveLineCommentSchema } from '@/server/validation/schemas';
import { errorToResponse } from '@/server/errors';
import { AuthorizationError } from '@/server/errors';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const auth = await getAuthContext();

    if (auth.user.role !== 'STUDENT' && auth.user.role !== 'INSTRUCTOR') {
      throw new AuthorizationError('Access denied', 'FORBIDDEN');
    }

    const body = await req.json();
    const input = ResolveLineCommentSchema.parse(body);

    const comment = await submissionService.setLineCommentResolved(id, auth.user.id, auth.user.role, input.resolved);
    return NextResponse.json(comment);
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const auth = await getAuthContext();
    await requireRole(auth, 'INSTRUCTOR');

    await submissionService.deleteLineComment(id, auth.user.id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}
