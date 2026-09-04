import { db } from '@/lib/prisma';
import { NotFoundError, ValidationError } from '@/server/errors';

export class RosterService {
  async createLink(instructorId: string, studentId: string): Promise<{ id: string }> {
    const [instructor, student] = await Promise.all([
      db.user.findUnique({ where: { id: instructorId } }),
      db.user.findUnique({ where: { id: studentId } }),
    ]);

    if (!instructor || instructor.role !== 'INSTRUCTOR') {
      throw new ValidationError('Instructor not found');
    }
    if (!student || student.role !== 'STUDENT') {
      throw new ValidationError('Student not found');
    }

    const existing = await db.instructorStudents.findUnique({
      where: {
        instructor_id_student_id: { instructor_id: instructorId, student_id: studentId },
      },
    });
    if (existing) {
      throw new ValidationError('This student is already assigned to this instructor');
    }

    return db.instructorStudents.create({
      data: { instructor_id: instructorId, student_id: studentId },
      select: { id: true },
    });
  }

  async listAll(): Promise<
    Array<{
      id: string;
      instructor: { id: string; name: string; email: string };
      student: { id: string; name: string; email: string };
    }>
  > {
    return db.instructorStudents.findMany({
      select: {
        id: true,
        instructor: { select: { id: true, name: true, email: true } },
        student: { select: { id: true, name: true, email: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async listForInstructor(
    instructorId: string,
  ): Promise<Array<{ id: string; student: { id: string; name: string; email: string } }>> {
    return db.instructorStudents.findMany({
      where: { instructor_id: instructorId },
      select: {
        id: true,
        student: { select: { id: true, name: true, email: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async removeLink(id: string): Promise<void> {
    const existing = await db.instructorStudents.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Roster link not found');
    }
    await db.instructorStudents.delete({ where: { id } });
  }
}

export const rosterService = new RosterService();
