import nodemailer from 'nodemailer';
import { smtpSettingsService } from '@/server/services/smtp-settings.service';

export class EmailService {
  async send(to: string, subject: string, html: string): Promise<void> {
    const settings = await smtpSettingsService.get();
    if (!settings || !settings.enabled) {
      return; // SMTP not configured — silently skip, notifications still land in-app.
    }

    try {
      const transporter = nodemailer.createTransport({
        host: settings.host,
        port: settings.port,
        secure: settings.secure,
        auth: settings.username ? { user: settings.username, pass: settings.password ?? undefined } : undefined,
      });

      await transporter.sendMail({
        from: `"${settings.from_name}" <${settings.from_email}>`,
        to,
        subject,
        html,
      });
    } catch (error) {
      // Email delivery is best-effort — never let an SMTP failure break the app flow that triggered it.
      console.error('Failed to send notification email:', error);
    }
  }
}

export const emailService = new EmailService();
