import crypto from 'crypto';
import { hash } from 'bcryptjs';
import { db } from '@/lib/prisma';
import { ValidationError } from '@/server/errors';
import { emailService } from '@/server/services/email.service';

const TOKEN_TTL_MS = 6 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export class PasswordResetService {
  /** Always resolves the same way whether or not the email is registered, so the
   * response never reveals account existence. Returns the raw link only when the
   * DEV_EXPOSE_RESET_LINK dev bypass is on (SMTP isn't configured yet). */
  async requestReset(email: string): Promise<{ devResetLink?: string }> {
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return {};
    }

    // Invalidate any still-outstanding links so only the newest one works.
    await db.passwordResetToken.updateMany({
      where: { user_id: user.id, used_at: null },
      data: { used_at: new Date() },
    });

    const rawToken = crypto.randomBytes(32).toString('hex');
    await db.passwordResetToken.create({
      data: {
        user_id: user.id,
        token_hash: hashToken(rawToken),
        expires_at: new Date(Date.now() + TOKEN_TTL_MS),
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3007';
    const resetLink = `${baseUrl}/reset-password?token=${rawToken}`;

    await emailService.send(
      user.email,
      'Reset your Code Campus password',
      `<p>We received a request to reset your password. This link expires in 6 hours.</p>
       <p><a href="${resetLink}">${resetLink}</a></p>
       <p>If you didn't request this, you can safely ignore this email.</p>`,
    );

    const devBypassEnabled = process.env.NODE_ENV !== 'production' && process.env.DEV_EXPOSE_RESET_LINK === 'true';
    return devBypassEnabled ? { devResetLink: resetLink } : {};
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const resetToken = await db.passwordResetToken.findUnique({ where: { token_hash: hashToken(token) } });

    if (!resetToken || resetToken.used_at || resetToken.expires_at < new Date()) {
      throw new ValidationError('This password reset link is invalid or has expired');
    }

    const password_hash = await hash(newPassword, 10);
    await db.$transaction([
      db.user.update({ where: { id: resetToken.user_id }, data: { password_hash } }),
      db.passwordResetToken.update({ where: { id: resetToken.id }, data: { used_at: new Date() } }),
    ]);
  }
}

export const passwordResetService = new PasswordResetService();
