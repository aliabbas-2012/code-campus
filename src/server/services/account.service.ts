import { compare, hash } from 'bcryptjs';
import { db } from '@/lib/prisma';
import { NotFoundError, ValidationError } from '@/server/errors';
import { ChangePasswordInput } from '@/server/validation/schemas';

export class AccountService {
  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User not found');
    }
    if (!user.password_hash) {
      throw new ValidationError('This account has no password set');
    }

    const matches = await compare(input.current_password, user.password_hash);
    if (!matches) {
      throw new ValidationError('Current password is incorrect');
    }

    const password_hash = await hash(input.new_password, 10);
    await db.user.update({ where: { id: userId }, data: { password_hash } });
  }
}

export const accountService = new AccountService();
