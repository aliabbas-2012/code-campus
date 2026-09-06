import { NextResponse } from 'next/server';
import { getAuthContext, requireRole } from '@/server/services/authorization.service';
import { submissionService } from '@/server/services/submission.service';
import { errorToResponse } from '@/server/errors';

export async function GET(): Promise<NextResponse> {
  try {
    const auth = await getAuthContext();
    await requireRole(auth, 'ADMIN');
    const requests = await submissionService.listPendingReopenRequests();
    return NextResponse.json(requests);
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}
