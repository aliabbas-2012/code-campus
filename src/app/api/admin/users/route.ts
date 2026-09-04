import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, requireRole } from '@/server/services/authorization.service';
import { adminUserService } from '@/server/services/admin-user.service';
import { CreateUserSchema } from '@/server/validation/schemas';
import { errorToResponse } from '@/server/errors';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const auth = await getAuthContext();
    await requireRole(auth, 'ADMIN');

    const roleParam = req.nextUrl.searchParams.get('role');
    const role = roleParam && roleParam in Role ? (roleParam as Role) : undefined;

    const users = await adminUserService.listUsers(role);
    return NextResponse.json(users);
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const auth = await getAuthContext();
    await requireRole(auth, 'ADMIN');

    const body = await req.json();
    const input = CreateUserSchema.parse(body);

    const user = await adminUserService.createUser(input);
    return NextResponse.json(user, { status: 201 });
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}
