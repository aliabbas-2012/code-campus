import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, requireRole } from '@/server/services/authorization.service';
import { submissionService } from '@/server/services/submission.service';
import { ResolveReopenRequestSchema } from '@/server/validation/schemas';
import { errorToResponse } from '@/server/errors';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const auth = await getAuthContext();
    await requireRole(auth, 'ADMIN');

    const body = await req.json();
    const input = ResolveReopenRequestSchema.parse(body);

    await submissionService.resolveReopenRequest(id, auth.user.id, input.approve);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}
