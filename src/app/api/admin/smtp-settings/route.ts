import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, requireRole } from '@/server/services/authorization.service';
import { smtpSettingsService } from '@/server/services/smtp-settings.service';
import { SmtpSettingsSchema } from '@/server/validation/schemas';
import { errorToResponse } from '@/server/errors';

export async function GET(): Promise<NextResponse> {
  try {
    const auth = await getAuthContext();
    await requireRole(auth, 'ADMIN');
    const settings = await smtpSettingsService.get();
    return NextResponse.json(settings ? { ...settings, password: settings.password ? '••••••••' : '' } : null);
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    const auth = await getAuthContext();
    await requireRole(auth, 'ADMIN');
    const body = await req.json();
    const input = SmtpSettingsSchema.parse(body);

    // Keep the existing password if the client sent back the masked placeholder unchanged.
    if (input.password === '••••••••') {
      const existing = await smtpSettingsService.get();
      input.password = existing?.password ?? undefined;
    }

    const settings = await smtpSettingsService.upsert(input);
    return NextResponse.json({ ...settings, password: settings.password ? '••••••••' : '' });
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}
