import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, requireRole } from '@/server/services/authorization.service';
import { guidelinesService } from '@/server/services/guidelines.service';
import { UpdateGuidelinesSchema } from '@/server/validation/schemas';
import { errorToResponse } from '@/server/errors';

export async function GET(): Promise<NextResponse> {
  try {
    const auth = await getAuthContext();
    await requireRole(auth, 'INSTRUCTOR');
    const guidelines = await guidelinesService.getForInstructor(auth.user.id);
    return NextResponse.json(guidelines ?? { content: '' });
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    const auth = await getAuthContext();
    await requireRole(auth, 'INSTRUCTOR');
    const body = await req.json();
    const input = UpdateGuidelinesSchema.parse(body);
    const guidelines = await guidelinesService.upsertForInstructor(auth.user.id, input.content);
    return NextResponse.json(guidelines);
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}
