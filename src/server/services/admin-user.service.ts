import { hash } from 'bcryptjs';
import { db } from '@/lib/prisma';
import { ValidationError } from '@/server/errors';
import { CreateUserInput } from '@/server/validation/schemas';
import { Role } from '@prisma/client';

export class AdminUserService {
  async createUser(input: CreateUserInput): Promise<{
    id: string;
    email: string;
    name: string;
    role: Role;
    status: string;
  }> {
    const existing = await db.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ValidationError('A user with this email already exists');
    }

    const password_hash = await hash(input.password, 10);

    return db.user.create({
      data: {
        email: input.email,
        name: input.name,
        role: input.role,
        password_hash,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    });
  }

  async listUsers(role?: Role): Promise<
    Array<{ id: string; email: string; name: string; role: Role; status: string; created_at: Date }>
  > {
    return db.user.findMany({
      where: role ? { role } : undefined,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }
}

export const adminUserService = new AdminUserService();
