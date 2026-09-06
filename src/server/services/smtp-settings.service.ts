import { db } from '@/lib/prisma';

const SINGLETON_ID = 'singleton';

export interface SmtpSettingsInput {
  host: string;
  port: number;
  secure: boolean;
  username?: string;
  password?: string;
  from_email: string;
  from_name: string;
  enabled: boolean;
}

export class SmtpSettingsService {
  async get() {
    return db.smtpSettings.findUnique({ where: { id: SINGLETON_ID } });
  }

  async upsert(input: SmtpSettingsInput) {
    return db.smtpSettings.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, ...input },
      update: { ...input },
    });
  }
}

export const smtpSettingsService = new SmtpSettingsService();
