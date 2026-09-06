import { db } from '@/lib/prisma';
import { NotFoundError, ValidationError, AuthorizationError } from '@/server/errors';
import { fileService } from '@/server/services/file.service';
import { notificationService } from '@/server/services/notification.service';

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

    if (assignment.starter_code) {
      await fileService.createFile(project.id, workspaceId, {
        name: 'solution.py',
        content: assignment.starter_code,
      });
    }

    return { project_id: project.id };
  }

  async getSubmission(projectId: string, viewerRole?: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN') {
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
        reopen_requests: { orderBy: { created_at: 'desc' }, take: 1 },
      },
    });

    if (!submission) return null;

    if (viewerRole === 'STUDENT' && submission.on_hold) {
      return { ...submission, status: 'SUBMITTED' as const, score: null, passed: null };
    }

    return submission;
  }

  async submit(projectId: string, studentId: string, remarks?: string): Promise<void> {
    const submission = await db.submission.findUnique({ where: { project_id: projectId } });
    if (!submission) {
      throw new NotFoundError('This project is not part of an assignment');
    }
    if (submission.status !== 'IN_PROGRESS' && submission.status !== 'REVISION_REQUESTED') {
      throw new ValidationError('This submission cannot be submitted from its current state');
    }

    const [, , assignment, student] = await db.$transaction([
      db.submission.update({
        where: { id: submission.id },
        data: { status: 'SUBMITTED', submitted_at: new Date() },
      }),
      db.submissionEvent.create({
        data: { submission_id: submission.id, type: 'SUBMITTED', actor_id: studentId, feedback: remarks },
      }),
      db.assignment.findUniqueOrThrow({ where: { id: submission.assignment_id } }),
      db.user.findUniqueOrThrow({ where: { id: studentId } }),
    ]);

    await notificationService.create(
      assignment.instructor_id,
      'SUBMISSION_RECEIVED',
      'New submission to review',
      `${student.name} submitted "${assignment.title}" for review.`,
      `/review/${projectId}`,
    );
  }

  async cancel(projectId: string, studentId: string): Promise<void> {
    const submission = await db.submission.findUnique({ where: { project_id: projectId } });
    if (!submission) {
      throw new NotFoundError('This project is not part of an assignment');
    }
    if (submission.student_id !== studentId) {
      throw new AuthorizationError('Access denied', 'FORBIDDEN');
    }
    if (submission.status !== 'SUBMITTED') {
      throw new ValidationError('Only a submission that is still awaiting review can be cancelled');
    }

    await db.$transaction([
      db.submission.update({
        where: { id: submission.id },
        data: { status: 'IN_PROGRESS', submitted_at: null },
      }),
      db.submissionEvent.create({
        data: { submission_id: submission.id, type: 'CANCELLED', actor_id: studentId },
      }),
    ]);
  }

  async requestRevision(projectId: string, instructorId: string, feedback: string): Promise<void> {
    const submission = await this.loadForInstructor(projectId, instructorId);
    if (submission.status !== 'SUBMITTED') {
      throw new ValidationError('Only a submitted project can be sent back for revision');
    }

    const [, , assignment] = await db.$transaction([
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
      db.assignment.findUniqueOrThrow({ where: { id: submission.assignment_id } }),
    ]);

    await notificationService.create(
      submission.student_id,
      'REVISION_REQUESTED',
      'Revision requested',
      `Your instructor asked for changes on "${assignment.title}".`,
      `/dashboard/assignments/${assignment.id}`,
    );
  }

  async grade(projectId: string, instructorId: string, score: number, summary?: string): Promise<void> {
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
        data: { submission_id: submission.id, type: 'GRADED', actor_id: instructorId, score, feedback: summary },
      }),
    ]);

    await notificationService.create(
      submission.student_id,
      'GRADED',
      'Assignment graded',
      `"${assignment.title}" was graded: ${score}/${assignment.max_score} (${passed ? 'Pass' : 'Fail'}).`,
      `/dashboard/assignments/${assignment.id}`,
    );
  }

  /** Instructor asks an admin to reopen a graded submission — the grade is hidden from the student while pending. */
  async requestReopen(projectId: string, instructorId: string, reason?: string): Promise<void> {
    const submission = await this.loadForInstructor(projectId, instructorId);
    if (submission.status !== 'GRADED') {
      throw new ValidationError('Only a graded submission can have a reopen requested');
    }
    const existing = await db.reopenRequest.findFirst({
      where: { submission_id: submission.id, status: 'PENDING' },
    });
    if (existing) {
      throw new ValidationError('A reopen request is already pending for this submission');
    }

    const assignment = await db.assignment.findUniqueOrThrow({ where: { id: submission.assignment_id } });

    await db.$transaction([
      db.submission.update({ where: { id: submission.id }, data: { on_hold: true } }),
      db.reopenRequest.create({
        data: { submission_id: submission.id, requested_by_id: instructorId, reason },
      }),
    ]);

    const admins = await db.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    await Promise.all(
      admins.map((admin) =>
        notificationService.create(
          admin.id,
          'REOPEN_REQUESTED',
          'Reopen request',
          `An instructor requested to reopen "${assignment.title}" for a student.`,
          `/admin/reopen-requests`,
        ),
      ),
    );
  }

  async listPendingReopenRequests() {
    return db.reopenRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { created_at: 'asc' },
      include: {
        requested_by: { select: { name: true, email: true } },
        submission: {
          include: {
            assignment: { select: { title: true } },
            student: { select: { name: true, email: true } },
          },
        },
      },
    });
  }

  async resolveReopenRequest(requestId: string, adminId: string, approve: boolean): Promise<void> {
    const request = await db.reopenRequest.findUnique({
      where: { id: requestId },
      include: { submission: { include: { assignment: true } } },
    });
    if (!request) {
      throw new NotFoundError('Reopen request not found');
    }
    if (request.status !== 'PENDING') {
      throw new ValidationError('This reopen request has already been resolved');
    }

    const newStatus = approve ? 'APPROVED' : 'DECLINED';

    await db.$transaction([
      db.reopenRequest.update({
        where: { id: requestId },
        data: { status: newStatus, resolved_by_id: adminId, resolved_at: new Date() },
      }),
      db.submission.update({
        where: { id: request.submission_id },
        data: approve
          ? { on_hold: false, status: 'IN_PROGRESS', score: null, passed: null, graded_at: null, graded_by_id: null }
          : { on_hold: false },
      }),
      db.submissionEvent.create({
        data: {
          submission_id: request.submission_id,
          type: 'REOPENED',
          actor_id: adminId,
          feedback: approve ? 'Reopen request approved by admin.' : 'Reopen request declined by admin.',
        },
      }),
    ]);

    await notificationService.create(
      request.requested_by_id,
      approve ? 'REOPEN_APPROVED' : 'REOPEN_DECLINED',
      approve ? 'Reopen approved' : 'Reopen declined',
      approve
        ? `Admin approved reopening "${request.submission.assignment.title}" — the student can edit and resubmit.`
        : `Admin declined reopening "${request.submission.assignment.title}" — the grade stands.`,
      `/review/${request.submission.project_id}`,
    );
  }

  async listLineComments(fileId: string) {
    const file = await db.projectFile.findUnique({ where: { id: fileId }, select: { project_id: true } });
    if (!file) {
      throw new NotFoundError('File not found');
    }

    const submission = await db.submission.findUnique({ where: { project_id: file.project_id } });
    if (!submission) {
      return [];
    }

    return db.lineComment.findMany({
      where: { file_id: fileId },
      orderBy: { line_number: 'asc' },
      include: { author: { select: { name: true } }, resolved_by: { select: { name: true } } },
    });
  }

  async addLineComment(fileId: string, instructorId: string, lineNumber: number, comment: string) {
    const file = await db.projectFile.findUnique({ where: { id: fileId }, select: { project_id: true } });
    if (!file) {
      throw new NotFoundError('File not found');
    }

    const submission = await db.submission.findUnique({ where: { project_id: file.project_id } });
    if (!submission) {
      throw new ValidationError('This file is not part of an assignment submission');
    }

    if (submission.assignment_id) {
      const assignment = await db.assignment.findUnique({ where: { id: submission.assignment_id } });
      if (!assignment || assignment.instructor_id !== instructorId) {
        throw new AuthorizationError('This is not your assignment', 'FORBIDDEN');
      }
    }

    return db.lineComment.create({
      data: {
        submission_id: submission.id,
        file_id: fileId,
        line_number: lineNumber,
        comment,
        author_id: instructorId,
      },
      include: { author: { select: { name: true } }, resolved_by: { select: { name: true } } },
    });
  }

  /**
   * Resolving is the student marking a comment addressed (GitHub-PR style); reopening
   * is the instructor disagreeing and putting it back to open. Each direction is
   * restricted to the role that's allowed to make that call.
   */
  async setLineCommentResolved(
    commentId: string,
    actorId: string,
    actorRole: 'STUDENT' | 'INSTRUCTOR',
    resolved: boolean,
  ) {
    const comment = await db.lineComment.findUnique({
      where: { id: commentId },
      include: { submission: { include: { assignment: true } } },
    });
    if (!comment) {
      throw new NotFoundError('Comment not found');
    }

    if (actorRole === 'STUDENT') {
      if (comment.submission.student_id !== actorId) {
        throw new AuthorizationError('Access denied', 'FORBIDDEN');
      }
      if (!resolved) {
        throw new AuthorizationError('Only the instructor can reopen a resolved comment', 'FORBIDDEN');
      }
    } else {
      if (comment.submission.assignment.instructor_id !== actorId) {
        throw new AuthorizationError('This is not your assignment', 'FORBIDDEN');
      }
    }

    return db.lineComment.update({
      where: { id: commentId },
      data: resolved
        ? { resolved: true, resolved_by_id: actorId, resolved_at: new Date() }
        : { resolved: false, resolved_by_id: null, resolved_at: null },
      include: { author: { select: { name: true } }, resolved_by: { select: { name: true } } },
    });
  }

  /** Only the reviewing instructor can delete a comment outright — students can only resolve it. */
  async deleteLineComment(commentId: string, instructorId: string): Promise<void> {
    const comment = await db.lineComment.findUnique({
      where: { id: commentId },
      include: { submission: { include: { assignment: true } } },
    });
    if (!comment) {
      throw new NotFoundError('Comment not found');
    }
    if (comment.submission.assignment.instructor_id !== instructorId) {
      throw new AuthorizationError('This is not your assignment', 'FORBIDDEN');
    }

    await db.lineComment.delete({ where: { id: commentId } });
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
