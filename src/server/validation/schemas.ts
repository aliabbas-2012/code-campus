import { z } from 'zod';

// Auth schemas
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const SignupSchema = LoginSchema.extend({
  name: z.string().min(1, 'Name is required').max(255),
});

// Project schemas
export const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(255),
  description: z.string().max(4000).optional(),
});

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(4000).optional(),
});

// File schemas
export const CreateFileSchema = z.object({
  name: z.string().min(1, 'File name is required').max(255),
  parent_id: z.string().uuid().nullable().optional(),
  content: z.string().optional(),
});

export const UpdateFileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
  updated_at: z.string().datetime().optional(), // For optimistic concurrency
});

export const CreateFolderSchema = z.object({
  name: z.string().min(1, 'Folder name is required').max(255),
  parent_id: z.string().uuid().nullable().optional(),
});

// Workspace schemas
export const WorkspaceQuotaSchema = z.object({
  storage_quota_bytes: z.bigint().positive(),
});

// Admin: user management
export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(255),
  role: z.enum(['ADMIN', 'INSTRUCTOR', 'STUDENT']),
});

// Admin: instructor roster
export const CreateInstructorStudentSchema = z.object({
  instructor_id: z.string().uuid(),
  student_id: z.string().uuid(),
});

// Instructor: assignments
export const CreateAssignmentSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(255),
    description: z.string().max(8000).optional(),
    max_score: z.number().int().positive().default(100),
    pass_threshold: z.number().int().nonnegative().default(60),
    student_ids: z.array(z.string().uuid()).min(1, 'Assign at least one student'),
    starter_code: z
      .string()
      .max(50000, 'Starter code is too large')
      .refine((code) => !code.includes('\u0000'), 'Starter code file looks like a binary file, not Python source')
      .optional(),
  })
  .refine((data) => data.pass_threshold <= data.max_score, {
    message: 'Pass threshold cannot exceed the maximum score',
    path: ['pass_threshold'],
  });

export const AddAssignmentStudentsSchema = z.object({
  student_ids: z.array(z.string().uuid()).min(1, 'Select at least one student'),
});

// Submission actions
export const SubmissionActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('submit'), remarks: z.string().max(5000).optional() }),
  z.object({ action: z.literal('cancel') }),
  z.object({
    action: z.literal('request_revision'),
    feedback: z.string().min(1, 'Feedback is required').max(5000),
  }),
  z.object({
    action: z.literal('grade'),
    score: z.number().int().nonnegative(),
    summary: z.string().max(5000).optional(),
  }),
  z.object({
    action: z.literal('request_reopen'),
    reason: z.string().max(2000).optional(),
  }),
]);

export const ResolveReopenRequestSchema = z.object({
  approve: z.boolean(),
});

export const ResolveLineCommentSchema = z.object({
  resolved: z.boolean(),
});

// Line comments
export const CreateLineCommentSchema = z.object({
  line_number: z.number().int().positive(),
  comment: z.string().min(1, 'Comment is required').max(2000),
});

// Guidelines
export const UpdateGuidelinesSchema = z.object({
  content: z.string().max(20000),
});

// SMTP settings
export const SmtpSettingsSchema = z.object({
  host: z.string().min(1, 'Host is required').max(255),
  port: z.number().int().positive().max(65535),
  secure: z.boolean(),
  username: z.string().max(255).optional(),
  password: z.string().max(255).optional(),
  from_email: z.string().email('Must be a valid email address'),
  from_name: z.string().min(1).max(255),
  enabled: z.boolean(),
});

export const UpdateInstructorProfileSchema = z.object({
  title: z.string().max(255).optional(),
  bio: z.string().max(5000).optional(),
  specializations: z.array(z.string().min(1).max(50)).max(20),
});

export const UpdateStudentProfileSchema = z.object({
  bio: z.string().max(5000).optional(),
  interests: z.array(z.string().min(1).max(50)).max(20),
});

export const ChangePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(8, 'New password must be at least 8 characters'),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  new_password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const SendTestSmtpEmailSchema = z.object({
  host: z.string().min(1, 'Host is required').max(255),
  port: z.number().int().positive().max(65535),
  secure: z.boolean(),
  username: z.string().max(255).optional(),
  password: z.string().max(255).optional(),
  from_email: z.string().email('Must be a valid email address'),
  from_name: z.string().min(1).max(255),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type SignupInput = z.infer<typeof SignupSchema>;
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
export type CreateFileInput = z.infer<typeof CreateFileSchema>;
export type UpdateFileInput = z.infer<typeof UpdateFileSchema>;
export type CreateLineCommentInput = z.infer<typeof CreateLineCommentSchema>;
export type UpdateGuidelinesInput = z.infer<typeof UpdateGuidelinesSchema>;
export type SmtpSettingsInput = z.infer<typeof SmtpSettingsSchema>;
export type UpdateInstructorProfileInput = z.infer<typeof UpdateInstructorProfileSchema>;
export type UpdateStudentProfileInput = z.infer<typeof UpdateStudentProfileSchema>;
export type SendTestSmtpEmailInput = z.infer<typeof SendTestSmtpEmailSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type CreateFolderInput = z.infer<typeof CreateFolderSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type CreateInstructorStudentInput = z.infer<typeof CreateInstructorStudentSchema>;
export type CreateAssignmentInput = z.infer<typeof CreateAssignmentSchema>;
export type AddAssignmentStudentsInput = z.infer<typeof AddAssignmentStudentsSchema>;
export type SubmissionActionInput = z.infer<typeof SubmissionActionSchema>;
export type ResolveReopenRequestInput = z.infer<typeof ResolveReopenRequestSchema>;
export type ResolveLineCommentInput = z.infer<typeof ResolveLineCommentSchema>;
