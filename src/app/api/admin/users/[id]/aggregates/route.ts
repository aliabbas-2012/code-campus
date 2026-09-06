import { NextResponse } from 'next/server';
import { getAuthContext, requireRole } from '@/server/services/authorization.service';
import { adminUserService } from '@/server/services/admin-user.service';
import { errorToResponse } from '@/server/errors';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const auth = await getAuthContext();
    await requireRole(auth, 'ADMIN');

    const aggregates = await adminUserService.getUserAggregates(id);
    return NextResponse.json(aggregates);
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}
