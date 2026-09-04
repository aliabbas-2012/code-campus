import { db } from '@/lib/prisma';
import { NotFoundError, ValidationError, AuthorizationError } from '@/server/errors';

export class SubmissionService {
  async startAssignment(
    assignmentId: string,
    studentId: string,
    workspaceId: string,
  ): Promise<{ project_id: string }> {
    const link = await db.assignmentStudent.findUnique({
      where: { assignment_id_student_id: { assignment_id: assignmentId, student_id: studentId } },
    });
    if (!link) {
      throw new NotFoundError('Assignment not found');
    }

    const existing = await db.project.findFirst({
      where: { assignment_id: assignmentId, workspace_id: workspaceId },
      select: { id: true },
    });
    if (existing) {
      return { project_id: existing.id };
    }

    const assignment = await db.assignment.findUniqueOrThrow({ where: { id: assignmentId } });

    const nameTaken = await db.project.findUnique({
      where: { workspace_id_name: { workspace_id: workspaceId, name: assignment.title } },
    });
    const projectName = nameTaken ? `${assignment.title} (assignment)` : assignment.title;

    const project = await db.project.create({
      data: {
        workspace_id: workspaceId,
        assignment_id: assignmentId,
        name: projectName,
        submission: {
          create: {
            assignment_id: assignmentId,
            student_id: studentId,
            status: 'IN_PROGRESS',
          },
        },
      },
      select: { id: true },
    });

    return { project_id: project.id };
  }

  async getSubmission(projectId: string) {
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { assignment_id: true },
    });
    if (!project?.assignment_id) {
      return null;
    }

    const submission = await db.submission.findUnique({
      where: { project_id: projectId },
      include: {
        assignment: { select: { id: true, title: true, max_score: true, pass_threshold: true } },
        events: { orderBy: { created_at: 'asc' }, include: { actor: { select: { name: true } } } },
      },
    });

    return submission;
  }

  async submit(projectId: string, studentId: string): Promise<void> {
    const submission = await db.submission.findUnique({ where: { project_id: projectId } });
    if (!submission) {
      throw new NotFoundError('This project is not part of an assignment');
    }
    if (submission.status !== 'IN_PROGRESS' && submission.status !== 'REVISION_REQUESTED') {
      throw new ValidationError('This submission cannot be submitted from its current state');
    }

    await db.$transaction([
      db.submission.update({
        where: { id: submission.id },
        data: { status: 'SUBMITTED', submitted_at: new Date() },
      }),
      db.submissionEvent.create({
        data: { submission_id: submission.id, type: 'SUBMITTED', actor_id: studentId },
      }),
    ]);
  }

  async requestRevision(projectId: string, instructorId: string, feedback: string): Promise<void> {
    const submission = await this.loadForInstructor(projectId, instructorId);
    if (submission.status !== 'SUBMITTED') {
      throw new ValidationError('Only a submitted project can be sent back for revision');
    }

    await db.$transaction([
      db.submission.update({
        where: { id: submission.id },
        data: { status: 'REVISION_REQUESTED' },
      }),
      db.submissionEvent.create({
        data: {
          submission_id: submission.id,
          type: 'REVISION_REQUESTED',
          actor_id: instructorId,
          feedback,
        },
      }),
    ]);
  }

  async grade(projectId: string, instructorId: string, score: number): Promise<void> {
    const submission = await this.loadForInstructor(projectId, instructorId);
    if (submission.status !== 'SUBMITTED') {
      throw new ValidationError('Only a submitted project can be graded');
    }

    const assignment = await db.assignment.findUniqueOrThrow({
      where: { id: submission.assignment_id },
    });
    const passed = score >= assignment.pass_threshold;

    await db.$transaction([
      db.submission.update({
        where: { id: submission.id },
        data: { status: 'GRADED', score, passed, graded_at: new Date(), graded_by_id: instructorId },
      }),
      db.submissionEvent.create({
        data: { submission_id: submission.id, type: 'GRADED', actor_id: instructorId, score },
      }),
    ]);
  }

  private async loadForInstructor(projectId: string, instructorId: string) {
    const submission = await db.submission.findUnique({ where: { project_id: projectId } });
    if (!submission) {
      throw new NotFoundError('This project is not part of an assignment');
    }
    if (submission.assignment_id) {
      const assignment = await db.assignment.findUnique({ where: { id: submission.assignment_id } });
      if (!assignment || assignment.instructor_id !== instructorId) {
        throw new AuthorizationError('This is not your assignment', 'FORBIDDEN');
      }
    }
    return submission;
  }
}

export const submissionService = new SubmissionService();
