export interface Project {
  id: string;
  name: string;
  description: string | null;
  assignment_id?: string | null;
}

export interface FileNode {
  id: string;
  name: string;
  type: 'FILE' | 'FOLDER';
  parent_id: string | null;
  size_bytes: number;
  updated_at: string;
}

export interface FileWithContent {
  id: string;
  name: string;
  type: 'FILE' | 'FOLDER';
  content?: string;
  size_bytes: number;
  updated_at: string;
}

export interface StorageInfo {
  quota_bytes: number;
  used_bytes: number;
  available_bytes: number;
  percent_used: number;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
}

export interface CreateFileInput {
  name: string;
  parent_id?: string | null;
  content?: string;
}

export interface CreateFolderInput {
  name: string;
  parent_id?: string | null;
}

export interface UpdateFileInput {
  name?: string;
  content?: string;
  updated_at?: string;
}

export interface UpdateFileResult {
  id: string;
  name: string;
  updated_at: string;
}

export interface CreatedFile {
  id: string;
  name: string;
  type: 'FILE' | 'FOLDER';
}

// ---------- Roles: admin ----------

export type UserRole = 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: string;
  created_at?: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  role: 'INSTRUCTOR' | 'STUDENT';
}

export interface RosterPerson {
  id: string;
  name: string;
  email: string;
}

export interface RosterLink {
  id: string;
  instructor?: RosterPerson;
  student: RosterPerson;
}

export interface CreateInstructorStudentInput {
  instructor_id: string;
  student_id: string;
}

// ---------- Roles: assignments & submissions ----------

export type SubmissionStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'REVISION_REQUESTED' | 'GRADED';

export interface SubmissionSummary {
  status: SubmissionStatus;
  score: number | null;
  passed: boolean | null;
  project_id: string;
}

export interface AssignmentSummary {
  id: string;
  title: string;
  max_score: number;
  pass_threshold: number;
  created_at: string;
  _count: { assigned_students: number };
}

export interface AssignmentStudentStatus {
  student: RosterPerson;
  submission: SubmissionSummary | null;
}

export interface AssignmentDetail {
  id: string;
  title: string;
  description: string | null;
  max_score: number;
  pass_threshold: number;
  starter_code: string | null;
  created_at: string;
  students: AssignmentStudentStatus[];
}

export interface CreateAssignmentInput {
  title: string;
  description?: string;
  max_score?: number;
  pass_threshold?: number;
  student_ids: string[];
  starter_code?: string;
}

export interface AddAssignmentStudentsInput {
  student_ids: string[];
}

export interface StudentAssignmentSummary {
  id: string;
  title: string;
  max_score: number;
  pass_threshold: number;
  instructor: { name: string };
  submission: SubmissionSummary | null;
}

export interface SubmissionEvent {
  id: string;
  type: 'SUBMITTED' | 'REVISION_REQUESTED' | 'GRADED' | 'CANCELLED';
  feedback: string | null;
  score: number | null;
  created_at: string;
  actor: { name: string };
}

export interface SubmissionDetail {
  id: string;
  status: SubmissionStatus;
  score: number | null;
  passed: boolean | null;
  submitted_at: string | null;
  graded_at: string | null;
  assignment: { id: string; title: string; max_score: number; pass_threshold: number };
  events: SubmissionEvent[];
}

export interface StudentAssignmentDetail {
  id: string;
  title: string;
  description: string | null;
  max_score: number;
  pass_threshold: number;
  instructor: { name: string };
  project_id: string | null;
  submission: SubmissionDetail | null;
}

export type SubmissionActionInput =
  | { action: 'submit'; remarks?: string }
  | { action: 'cancel' }
  | { action: 'request_revision'; feedback: string }
  | { action: 'grade'; score: number };

export interface StartAssignmentResult {
  project_id: string;
}

export interface LineComment {
  id: string;
  line_number: number;
  comment: string;
  created_at: string;
  author: { name: string };
}

export interface CreateLineCommentInput {
  line_number: number;
  comment: string;
}

export interface Notification {
  id: string;
  type: 'SUBMISSION_RECEIVED' | 'REVISION_REQUESTED' | 'GRADED' | 'SUBMISSION_CANCELLED';
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

export interface Guidelines {
  content: string;
}

export interface InstructorReportRow {
  assignment_id: string;
  assignment_title: string;
  max_score: number;
  pass_threshold: number;
  student_id: string;
  student_name: string;
  status: string;
  score: number | null;
  passed: boolean | null;
}

export interface InstructorStudentAssignment {
  id: string;
  title: string;
  max_score: number;
  pass_threshold: number;
  submission: { status: string; score: number | null; passed: boolean | null; project_id: string } | null;
}

export interface SmtpSettings {
  host: string;
  port: number;
  secure: boolean;
  username?: string;
  password?: string;
  from_email: string;
  from_name: string;
  enabled: boolean;
}
