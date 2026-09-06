import { db } from '@/lib/prisma';
import { NotFoundError } from '@/server/errors';

export interface UpdateStudentProfileInput {
  bio?: string;
  interests: string[];
}

export class StudentProfileService {
  async getOwn(studentId: string) {
    const profile = await db.studentProfile.findUnique({ where: { user_id: studentId } });
    return profile ?? { bio: null, interests: [] };
  }

  async upsertOwn(studentId: string, input: UpdateStudentProfileInput) {
    return db.studentProfile.upsert({
      where: { user_id: studentId },
      create: { user_id: studentId, ...input },
      update: input,
    });
  }

  /** An instructor viewing one of their own roster students' profile. */
  async getForInstructor(instructorId: string, studentId: string) {
    const link = await db.instructorStudents.findUnique({
      where: { instructor_id_student_id: { instructor_id: instructorId, student_id: studentId } },
    });
    if (!link) {
      throw new NotFoundError('This student is not on your roster');
    }

    const student = await db.user.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, email: true, student_profile: true },
    });
    if (!student) {
      throw new NotFoundError('Student not found');
    }

    return {
      id: student.id,
      name: student.name,
      email: student.email,
      bio: student.student_profile?.bio ?? null,
      interests: student.student_profile?.interests ?? [],
    };
  }
}

export const studentProfileService = new StudentProfileService();
