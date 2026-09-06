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

    const detail = await adminUserService.getUserDetail(id);
    return NextResponse.json(detail);
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}

export async function DELETE(_req: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { id } = await params;
    const auth = await getAuthContext();
    await requireRole(auth, 'ADMIN');

    await adminUserService.deleteAdmin(id, auth.user.id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}
