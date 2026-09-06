import { hash } from 'bcryptjs';
import { db } from '@/lib/prisma';
import { ValidationError, AuthorizationError, NotFoundError } from '@/server/errors';
import { CreateUserInput } from '@/server/validation/schemas';
import { assignmentService } from '@/server/services/assignment.service';
import { Role, Prisma } from '@prisma/client';

export interface ListUsersParams {
  role?: Role;
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: 'name' | 'email' | 'role' | 'created_at';
  sortDir?: 'asc' | 'desc';
}

export interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: string;
  is_super_admin: boolean;
  created_at: Date;
}

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

  async listUsers(params: ListUsersParams = {}): Promise<{ items: AdminUserRow[]; total: number }> {
    const { role, page = 1, pageSize = 100, search, sortBy = 'created_at', sortDir = 'desc' } = params;

    const where: Prisma.UserWhereInput = {
      ...(role ? { role } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          is_super_admin: true,
          created_at: true,
        },
        orderBy: { [sortBy]: sortDir },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.user.count({ where }),
    ]);

    return { items, total };
  }

  /** Aggregate counts shown lazily per-row in the admin users table, not part of the main list query. */
  async getUserAggregates(userId: string): Promise<{ studentCount?: number; assignmentCount?: number }> {
    const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.role === 'INSTRUCTOR') {
      const [studentCount, assignmentCount] = await Promise.all([
        db.instructorStudents.count({ where: { instructor_id: userId } }),
        db.assignment.count({ where: { instructor_id: userId } }),
      ]);
      return { studentCount, assignmentCount };
    }

    if (user.role === 'STUDENT') {
      const assignmentCount = await db.assignmentStudent.count({ where: { student_id: userId } });
      return { assignmentCount };
    }

    return {};
  }

  async getUserDetail(userId: string) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        is_super_admin: true,
        created_at: true,
        instructor_profile: true,
        student_profile: true,
      },
    });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.role === 'INSTRUCTOR') {
      const [roster, assignments] = await Promise.all([
        db.instructorStudents.findMany({
          where: { instructor_id: userId },
          include: { student: { select: { id: true, name: true, email: true } } },
          orderBy: { created_at: 'desc' },
        }),
        db.assignment.findMany({
          where: { instructor_id: userId },
          select: { id: true, title: true, max_score: true, pass_threshold: true, created_at: true },
          orderBy: { created_at: 'desc' },
        }),
      ]);
      return {
        user,
        students: roster.map((r) => r.student),
        assignments,
        instructors: [],
        studentAssignments: [],
      };
    }

    if (user.role === 'STUDENT') {
      const [roster, studentAssignments] = await Promise.all([
        db.instructorStudents.findMany({
          where: { student_id: userId },
          include: { instructor: { select: { id: true, name: true, email: true } } },
          orderBy: { created_at: 'desc' },
        }),
        assignmentService.listForStudent(userId),
      ]);
      return {
        user,
        instructors: roster.map((r) => r.instructor),
        students: [],
        assignments: [],
        studentAssignments,
      };
    }

    return { user, students: [], instructors: [], assignments: [], studentAssignments: [] };
  }

  /** Scoped to admin accounts only — deleting instructors/students cascades their assignments and
   * submissions, which isn't part of this flow; use roster/assignment management for that instead. */
  async deleteAdmin(targetUserId: string, actorUserId: string): Promise<void> {
    const target = await db.user.findUnique({ where: { id: targetUserId } });
    if (!target) {
      throw new NotFoundError('User not found');
    }
    if (target.role !== 'ADMIN') {
      throw new ValidationError('Only admin accounts can be removed here');
    }
    if (target.is_super_admin) {
      throw new AuthorizationError('The super admin account cannot be deleted', 'FORBIDDEN');
    }
    if (target.id === actorUserId) {
      throw new ValidationError('You cannot delete your own account');
    }

    await db.user.delete({ where: { id: targetUserId } });
  }
}

export const adminUserService = new AdminUserService();
