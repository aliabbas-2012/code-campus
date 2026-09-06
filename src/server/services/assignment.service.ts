import { db } from '@/lib/prisma';
import { NotFoundError, ValidationError } from '@/server/errors';
import { CreateAssignmentInput } from '@/server/validation/schemas';

export class AssignmentService {
  private async assertAllOnRoster(instructorId: string, studentIds: string[]): Promise<void> {
    const rosterCount = await db.instructorStudents.count({
      where: { instructor_id: instructorId, student_id: { in: studentIds } },
    });
    if (rosterCount !== studentIds.length) {
      throw new ValidationError('One or more students are not on your roster');
    }
  }

  async createAssignment(
    instructorId: string,
    input: CreateAssignmentInput,
  ): Promise<{ id: string; title: string }> {
    await this.assertAllOnRoster(instructorId, input.student_ids);

    const assignment = await db.assignment.create({
      data: {
        instructor_id: instructorId,
        title: input.title,
        description: input.description,
        max_score: input.max_score,
        pass_threshold: input.pass_threshold,
        starter_code: input.starter_code,
        assigned_students: {
          createMany: {
            data: input.student_ids.map((student_id) => ({ student_id })),
          },
        },
      },
      select: { id: true, title: true },
    });

    return assignment;
  }

  async listForInstructor(instructorId: string): Promise<
    Array<{
      id: string;
      title: string;
      max_score: number;
      pass_threshold: number;
      created_at: Date;
      _count: { assigned_students: number };
    }>
  > {
    return db.assignment.findMany({
      where: { instructor_id: instructorId },
      select: {
        id: true,
        title: true,
        max_score: true,
        pass_threshold: true,
        created_at: true,
        _count: { select: { assigned_students: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getAssignmentDetail(assignmentId: string, instructorId: string) {
    const assignment = await db.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        assigned_students: {
          include: {
            student: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!assignment || assignment.instructor_id !== instructorId) {
      throw new NotFoundError('Assignment not found');
    }

    const submissions = await db.submission.findMany({
      where: { assignment_id: assignmentId },
      select: { student_id: true, status: true, score: true, passed: true, project_id: true },
    });
    const submissionByStudent = new Map(submissions.map((s) => [s.student_id, s]));

    return {
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      max_score: assignment.max_score,
      pass_threshold: assignment.pass_threshold,
      starter_code: assignment.starter_code,
      created_at: assignment.created_at,
      students: assignment.assigned_students.map((row) => ({
        student: row.student,
        submission: submissionByStudent.get(row.student.id) ?? null,
      })),
    };
  }

  async addStudents(assignmentId: string, instructorId: string, studentIds: string[]): Promise<void> {
    const assignment = await db.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment || assignment.instructor_id !== instructorId) {
      throw new NotFoundError('Assignment not found');
    }

    await this.assertAllOnRoster(instructorId, studentIds);

    const existing = await db.assignmentStudent.findMany({
      where: { assignment_id: assignmentId, student_id: { in: studentIds } },
      select: { student_id: true },
    });
    const existingIds = new Set(existing.map((e) => e.student_id));
    const toAdd = studentIds.filter((id) => !existingIds.has(id));

    if (toAdd.length > 0) {
      await db.assignmentStudent.createMany({
        data: toAdd.map((student_id) => ({ assignment_id: assignmentId, student_id })),
      });
    }
  }

  async listForStudent(studentId: string): Promise<
    Array<{
      id: string;
      title: string;
      max_score: number;
      pass_threshold: number;
      instructor: { name: string };
      submission: { status: string; score: number | null; passed: boolean | null; project_id: string } | null;
    }>
  > {
    const links = await db.assignmentStudent.findMany({
      where: { student_id: studentId },
      include: {
        assignment: {
          include: {
            instructor: { select: { name: true } },
            projects: {
              where: { workspace: { user_id: studentId } },
              include: { submission: true },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return links.map(({ assignment }) => {
      const project = assignment.projects[0];
      return {
        id: assignment.id,
        title: assignment.title,
        max_score: assignment.max_score,
        pass_threshold: assignment.pass_threshold,
        instructor: assignment.instructor,
        submission: project?.submission
          ? {
              status: project.submission.status,
              score: project.submission.score,
              passed: project.submission.passed,
              project_id: project.id,
            }
          : null,
      };
    });
  }

  async getReportForInstructor(instructorId: string): Promise<
    Array<{
      assignment_id: string;
      assignment_title: string;
      max_score: number;
      pass_threshold: number;
      student_id: string;
      student_name: string;
      status: string;
      score: number | null;
      passed: boolean | null;
    }>
  > {
    const assignments = await db.assignment.findMany({
      where: { instructor_id: instructorId },
      include: {
        assigned_students: { include: { student: { select: { id: true, name: true } } } },
      },
      orderBy: { created_at: 'desc' },
    });

    const submissions = await db.submission.findMany({
      where: { assignment_id: { in: assignments.map((a) => a.id) } },
      select: { assignment_id: true, student_id: true, status: true, score: true, passed: true },
    });
    const subByKey = new Map(submissions.map((s) => [`${s.assignment_id}:${s.student_id}`, s]));

    const rows: Array<{
      assignment_id: string;
      assignment_title: string;
      max_score: number;
      pass_threshold: number;
      student_id: string;
      student_name: string;
      status: string;
      score: number | null;
      passed: boolean | null;
    }> = [];

    for (const a of assignments) {
      for (const link of a.assigned_students) {
        const sub = subByKey.get(`${a.id}:${link.student.id}`);
        rows.push({
          assignment_id: a.id,
          assignment_title: a.title,
          max_score: a.max_score,
          pass_threshold: a.pass_threshold,
          student_id: link.student.id,
          student_name: link.student.name,
          status: sub?.status ?? 'IN_PROGRESS',
          score: sub?.score ?? null,
          passed: sub?.passed ?? null,
        });
      }
    }

    return rows;
  }

  async listForInstructorAndStudent(instructorId: string, studentId: string): Promise<
    Array<{
      id: string;
      title: string;
      max_score: number;
      pass_threshold: number;
      submission: { status: string; score: number | null; passed: boolean | null; project_id: string } | null;
    }>
  > {
    const roster = await db.instructorStudents.findUnique({
      where: { instructor_id_student_id: { instructor_id: instructorId, student_id: studentId } },
    });
    if (!roster) {
      throw new NotFoundError('This student is not on your roster');
    }

    const links = await db.assignmentStudent.findMany({
      where: { student_id: studentId, assignment: { instructor_id: instructorId } },
      include: {
        assignment: {
          include: {
            projects: {
              where: { workspace: { user_id: studentId } },
              include: { submission: true },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return links.map(({ assignment }) => {
      const project = assignment.projects[0];
      return {
        id: assignment.id,
        title: assignment.title,
        max_score: assignment.max_score,
        pass_threshold: assignment.pass_threshold,
        submission: project?.submission
          ? {
              status: project.submission.status,
              score: project.submission.score,
              passed: project.submission.passed,
              project_id: project.id,
            }
          : null,
      };
    });
  }

  async getAssignmentForStudent(assignmentId: string, studentId: string) {
    const link = await db.assignmentStudent.findUnique({
      where: { assignment_id_student_id: { assignment_id: assignmentId, student_id: studentId } },
      include: {
        assignment: {
          include: {
            instructor: { select: { name: true } },
            projects: {
              where: { workspace: { user_id: studentId } },
              include: {
                submission: {
                  include: { events: { orderBy: { created_at: 'asc' }, include: { actor: { select: { name: true } } } } },
                },
              },
            },
          },
        },
      },
    });

    if (!link) {
      throw new NotFoundError('Assignment not found');
    }

    const project = link.assignment.projects[0];

    return {
      id: link.assignment.id,
      title: link.assignment.title,
      description: link.assignment.description,
      max_score: link.assignment.max_score,
      pass_threshold: link.assignment.pass_threshold,
      instructor: link.assignment.instructor,
      project_id: project?.id ?? null,
      submission: project?.submission ?? null,
    };
  }
}

export const assignmentService = new AssignmentService();
