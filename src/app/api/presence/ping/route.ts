import { NextResponse } from 'next/server';
import { getAuthContext } from '@/server/services/authorization.service';
import { notificationService } from '@/server/services/notification.service';
import { errorToResponse } from '@/server/errors';

export async function POST(): Promise<NextResponse> {
  try {
    const auth = await getAuthContext();
    await notificationService.touchPresence(auth.user.id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}
