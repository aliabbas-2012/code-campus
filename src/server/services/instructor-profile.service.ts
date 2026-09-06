import { db } from '@/lib/prisma';
import { NotFoundError } from '@/server/errors';

export interface UpdateInstructorProfileInput {
  title?: string;
  bio?: string;
  specializations: string[];
}

export class InstructorProfileService {
  async getOwn(instructorId: string) {
    const profile = await db.instructorProfile.findUnique({ where: { user_id: instructorId } });
    return profile ?? { title: null, bio: null, specializations: [] };
  }

  async upsertOwn(instructorId: string, input: UpdateInstructorProfileInput) {
    return db.instructorProfile.upsert({
      where: { user_id: instructorId },
      create: { user_id: instructorId, ...input },
      update: input,
    });
  }

  /** A student viewing an instructor's public profile — must be one of their own instructors. */
  async getForStudent(instructorId: string, studentId: string) {
    const link = await db.instructorStudents.findUnique({
      where: { instructor_id_student_id: { instructor_id: instructorId, student_id: studentId } },
    });
    if (!link) {
      throw new NotFoundError('This instructor is not on your roster');
    }

    const instructor = await db.user.findUnique({
      where: { id: instructorId },
      select: { id: true, name: true, email: true, instructor_profile: true },
    });
    if (!instructor) {
      throw new NotFoundError('Instructor not found');
    }

    return {
      id: instructor.id,
      name: instructor.name,
      email: instructor.email,
      title: instructor.instructor_profile?.title ?? null,
      bio: instructor.instructor_profile?.bio ?? null,
      specializations: instructor.instructor_profile?.specializations ?? [],
    };
  }
}

export const instructorProfileService = new InstructorProfileService();
