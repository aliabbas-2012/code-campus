import { NextRequest, NextResponse } from 'next/server';
import { passwordResetService } from '@/server/services/password-reset.service';
import { ForgotPasswordSchema } from '@/server/validation/schemas';
import { errorToResponse } from '@/server/errors';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { email } = ForgotPasswordSchema.parse(body);
    const result = await passwordResetService.requestReset(email);
    return NextResponse.json({
      message: 'If an account exists for that email, a password reset link has been sent.',
      ...result,
    });
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}
