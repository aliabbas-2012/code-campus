import { db } from '@/lib/prisma';

export class GuidelinesService {
  async getForInstructor(instructorId: string) {
    return db.guidelines.findUnique({ where: { instructor_id: instructorId } });
  }

  async upsertForInstructor(instructorId: string, content: string) {
    return db.guidelines.upsert({
      where: { instructor_id: instructorId },
      create: { instructor_id: instructorId, content },
      update: { content },
    });
  }

  /**
   * A student reads guidelines via their roster link(s). A student can have more
   * than one instructor, so this returns the most recently updated guidelines
   * among all of them, rather than assuming a single instructor.
   */
  async getForStudent(studentId: string) {
    const links = await db.instructorStudents.findMany({ where: { student_id: studentId } });
    if (links.length === 0) {
      return null;
    }
    return db.guidelines.findFirst({
      where: { instructor_id: { in: links.map((l) => l.instructor_id) } },
      orderBy: { updated_at: 'desc' },
    });
  }
}

export const guidelinesService = new GuidelinesService();
