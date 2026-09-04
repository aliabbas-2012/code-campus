import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, requireRole, verifyProjectAccess } from '@/server/services/authorization.service';
import { submissionService } from '@/server/services/submission.service';
import { SubmissionActionSchema } from '@/server/validation/schemas';
import { errorToResponse } from '@/server/errors';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const auth = await getAuthContext();
    await verifyProjectAccess(auth, id, 'read');

    const submission = await submissionService.getSubmission(id);
    return NextResponse.json(submission);
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const auth = await getAuthContext();

    const body = await req.json();
    const input = SubmissionActionSchema.parse(body);

    if (input.action === 'submit') {
      await requireRole(auth, 'STUDENT');
      await verifyProjectAccess(auth, id, 'write');
      await submissionService.submit(id, auth.user.id);
    } else {
      await requireRole(auth, 'INSTRUCTOR');
      await verifyProjectAccess(auth, id, 'read');

      if (input.action === 'request_revision') {
        await submissionService.requestRevision(id, auth.user.id, input.feedback);
      } else {
        await submissionService.grade(id, auth.user.id, input.score);
      }
    }

    const submission = await submissionService.getSubmission(id);
    return NextResponse.json(submission);
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}
