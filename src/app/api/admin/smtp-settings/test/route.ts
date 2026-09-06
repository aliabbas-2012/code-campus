import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, requireRole } from '@/server/services/authorization.service';
import { emailService } from '@/server/services/email.service';
import { SendTestSmtpEmailSchema } from '@/server/validation/schemas';
import { errorToResponse } from '@/server/errors';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const auth = await getAuthContext();
    await requireRole(auth, 'ADMIN');
    const body = await req.json();
    const settings = SendTestSmtpEmailSchema.parse(body);
    await emailService.sendTest(settings, auth.user.email);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}
