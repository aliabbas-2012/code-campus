import { NextRequest, NextResponse } from 'next/server';
import { passwordResetService } from '@/server/services/password-reset.service';
import { ResetPasswordSchema } from '@/server/validation/schemas';
import { errorToResponse } from '@/server/errors';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { token, new_password } = ResetPasswordSchema.parse(body);
    await passwordResetService.resetPassword(token, new_password);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}
