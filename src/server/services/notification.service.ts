import { db } from '@/lib/prisma';
import { NotFoundError, AuthorizationError } from '@/server/errors';
import { emailService } from '@/server/services/email.service';
import type { NotificationType } from '@prisma/client';

const ONLINE_WINDOW_MS = 2 * 60 * 1000; // presence heartbeat pings every ~60s from active tabs

export class NotificationService {
  async create(recipientId: string, type: NotificationType, title: string, message: string, link?: string) {
    const notification = await db.notification.create({
      data: { recipient_id: recipientId, type, title, message, link },
    });

    const recipient = await db.user.findUnique({ where: { id: recipientId } });
    if (recipient) {
      const isOnline = recipient.last_active_at && Date.now() - recipient.last_active_at.getTime() < ONLINE_WINDOW_MS;
      if (!isOnline) {
        const linkHtml = link ? `<p><a href="${link}">Open in Code Campus</a></p>` : '';
        await emailService.send(recipient.email, title, `<p>${message}</p>${linkHtml}`);
      }
    }

    return notification;
  }

  async listForUser(userId: string, limit = 50) {
    return db.notification.findMany({
      where: { recipient_id: userId },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }

  async unreadCount(userId: string): Promise<number> {
    return db.notification.count({ where: { recipient_id: userId, read: false } });
  }

  async markRead(notificationId: string, userId: string): Promise<void> {
    const notification = await db.notification.findUnique({ where: { id: notificationId } });
    if (!notification) {
      throw new NotFoundError('Notification not found');
    }
    if (notification.recipient_id !== userId) {
      throw new AuthorizationError('Access denied', 'FORBIDDEN');
    }
    if (!notification.read) {
      await db.notification.update({
        where: { id: notificationId },
        data: { read: true, read_at: new Date() },
      });
    }
  }

  async markAllRead(userId: string): Promise<void> {
    await db.notification.updateMany({
      where: { recipient_id: userId, read: false },
      data: { read: true, read_at: new Date() },
    });
  }

  async touchPresence(userId: string): Promise<void> {
    await db.user.update({ where: { id: userId }, data: { last_active_at: new Date() } });
  }
}

export const notificationService = new NotificationService();
