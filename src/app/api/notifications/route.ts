import { NextResponse } from 'next/server';
import { getAuthContext } from '@/server/services/authorization.service';
import { notificationService } from '@/server/services/notification.service';
import { errorToResponse } from '@/server/errors';

export async function GET(): Promise<NextResponse> {
  try {
    const auth = await getAuthContext();
    const [notifications, unreadCount] = await Promise.all([
      notificationService.listForUser(auth.user.id),
      notificationService.unreadCount(auth.user.id),
    ]);
    return NextResponse.json({ notifications, unreadCount });
  } catch (error: unknown) {
    const { statusCode, message, code } = errorToResponse(error);
    return NextResponse.json({ message, code }, { status: statusCode });
  }
}
