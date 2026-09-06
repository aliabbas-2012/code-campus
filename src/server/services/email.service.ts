import nodemailer from 'nodemailer';
import { smtpSettingsService } from '@/server/services/smtp-settings.service';
import { ValidationError } from '@/server/errors';

export interface TestEmailSettings {
  host: string;
  port: number;
  secure: boolean;
  username?: string;
  password?: string;
  from_email: string;
  from_name: string;
}

export class EmailService {
  /** Unlike `send`, this is used interactively from the SMTP settings form — it must
   * actually surface connection/auth failures instead of swallowing them. */
  async sendTest(settings: TestEmailSettings, to: string): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: settings.username ? { user: settings.username, pass: settings.password ?? undefined } : undefined,
    });

    try {
      await transporter.verify();
      await transporter.sendMail({
        from: `"${settings.from_name}" <${settings.from_email}>`,
        to,
        subject: 'Code Campus SMTP test',
        html: '<p>This is a test email from Code Campus — your SMTP settings are working.</p>',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send test email';
      throw new ValidationError(message);
    }
  }

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
