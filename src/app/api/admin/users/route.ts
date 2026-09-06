import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, requireRole } from '@/server/services/authorization.service';
import { adminUserService } from '@/server/services/admin-user.service';
import { CreateUserSchema } from '@/server/validation/schemas';
import { errorToResponse } from '@/server/errors';
import { Role } from '@prisma/client';

const SORTABLE_FIELDS = new Set(['name', 'email', 'role', 'created_at']);

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const auth = await getAuthContext();
    await requireRole(auth, 'ADMIN');

    const params = req.nextUrl.searchParams;
    const roleParam = params.get('role');
    const role = roleParam && roleParam in Role ? (roleParam as Role) : undefined;
    const search = params.get('search') ?? undefined;
    const sortByParam = params.get('sortBy');
    const sortBy = sortByParam && SORTABLE_FIELDS.has(sortByParam) ? (sortByParam as 'name' | 'email' | 'role' | 'created_at') : undefined;
    const sortDir = params.get('sortDir') === 'asc' ? 'asc' : 'desc';
    const page = Math.max(1, Number(params.get('page')) || 1);
    const pageSize = Math.min(500, Math.max(1, Number(params.get('pageSize')) || 100));

    const result = await adminUserService.listUsers({ role, search, sortBy, sortDir, page, pageSize });
    return NextResponse.json(result);
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
