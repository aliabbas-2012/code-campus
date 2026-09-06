import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/server/services/authorization.service';
import { accountService } from '@/server/services/account.service';
import { ChangePasswordSchema } from '@/server/validation/schemas';
import { errorToResponse } from '@/server/errors';

export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    const auth = await getAuthContext();
    const body = await req.json();
    const input = ChangePasswordSchema.parse(body);
    await accountService.changePassword(auth.user.id, input);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}
