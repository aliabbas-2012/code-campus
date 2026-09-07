import type {
  Project,
  FileNode,
  FileWithContent,
  StorageInfo,
  CreateProjectInput,
  UpdateProjectInput,
  CreateFileInput,
  CreateFolderInput,
  UpdateFileInput,
  UpdateFileResult,
  CreatedFile,
  ImportFilesResult,
  AdminUser,
  CreateUserInput,
  RosterLink,
  CreateInstructorStudentInput,
  AssignmentSummary,
  AssignmentDetail,
  CreateAssignmentInput,
  AddAssignmentStudentsInput,
  StudentAssignmentSummary,
  StudentAssignmentDetail,
  StartAssignmentResult,
  SubmissionDetail,
  SubmissionActionInput,
  UserRole,
  LineComment,
  CreateLineCommentInput,
  NotificationsResponse,
  Guidelines,
  SmtpSettings,
  InstructorStudentAssignment,
  InstructorReportRow,
  AdminReopenRequest,
  AdminUserListResult,
  AdminUserListParams,
  AdminUserDetail,
  UserAggregates,
  InstructorProfileData,
  UpdateInstructorProfileInput,
  PublicInstructorProfile,
  StudentProfileData,
  UpdateStudentProfileInput,
  PublicStudentProfile,
  ChangePasswordInput,
  ForgotPasswordInput,
  ForgotPasswordResult,
  ResetPasswordInput,
} from '@/types/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Request failed', code: 'UNKNOWN' }));
    throw new ApiError(res.status, body.code ?? 'UNKNOWN', body.message ?? 'Request failed');
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

/** For multipart uploads — the browser must set its own Content-Type (with boundary), so
 * this deliberately skips the JSON header apiFetch always adds. */
async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(path, { method: 'POST', body: formData });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Request failed', code: 'UNKNOWN' }));
    throw new ApiError(res.status, body.code ?? 'UNKNOWN', body.message ?? 'Request failed');
  }

  return res.json();
}

export const api = {
  projects: {
    list: (): Promise<Project[]> => apiFetch('/api/projects'),
    get: (id: string): Promise<Project> => apiFetch(`/api/projects/${id}`),
    create: (input: CreateProjectInput): Promise<Project> =>
      apiFetch('/api/projects', { method: 'POST', body: JSON.stringify(input) }),
    update: (id: string, input: UpdateProjectInput): Promise<Project> =>
      apiFetch(`/api/projects/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
    remove: (id: string): Promise<{ success: true }> =>
      apiFetch(`/api/projects/${id}`, { method: 'DELETE' }),
  },
  files: {
    list: (projectId: string, parentId?: string | null): Promise<FileNode[]> =>
      apiFetch(
        `/api/projects/${projectId}/files${parentId ? `?parent_id=${parentId}` : ''}`,
      ),
    create: (projectId: string, input: CreateFileInput): Promise<CreatedFile> =>
      apiFetch(`/api/projects/${projectId}/files`, {
        method: 'POST',
        body: JSON.stringify({ ...input, type: 'file' }),
      }),
    createFolder: (projectId: string, input: CreateFolderInput): Promise<CreatedFile> =>
      apiFetch(`/api/projects/${projectId}/files`, {
        method: 'POST',
        body: JSON.stringify({ ...input, type: 'folder' }),
      }),
    get: (fileId: string): Promise<FileWithContent> => apiFetch(`/api/files/${fileId}`),
    update: (fileId: string, input: UpdateFileInput): Promise<UpdateFileResult> =>
      apiFetch(`/api/files/${fileId}`, { method: 'PATCH', body: JSON.stringify(input) }),
    remove: (fileId: string): Promise<{ success: true }> =>
      apiFetch(`/api/files/${fileId}`, { method: 'DELETE' }),
    import: (projectId: string, file: File, parentId?: string | null): Promise<ImportFilesResult> => {
      const formData = new FormData();
      formData.set('file', file);
      if (parentId) formData.set('parent_id', parentId);
      return apiUpload(`/api/projects/${projectId}/files/import`, formData);
    },
  },
  lineComments: {
    list: (fileId: string): Promise<LineComment[]> => apiFetch(`/api/files/${fileId}/comments`),
    create: (fileId: string, input: CreateLineCommentInput): Promise<LineComment> =>
      apiFetch(`/api/files/${fileId}/comments`, { method: 'POST', body: JSON.stringify(input) }),
    setResolved: (commentId: string, resolved: boolean): Promise<LineComment> =>
      apiFetch(`/api/line-comments/${commentId}`, { method: 'PATCH', body: JSON.stringify({ resolved }) }),
    delete: (commentId: string): Promise<{ success: true }> =>
      apiFetch(`/api/line-comments/${commentId}`, { method: 'DELETE' }),
  },
  workspace: {
    storage: (): Promise<StorageInfo> => apiFetch('/api/workspace/storage'),
  },
  admin: {
    users: {
      // Full, unpaginated list — for populating pickers (roster assignment, etc), not the admin table.
      list: (role?: UserRole): Promise<AdminUser[]> =>
        apiFetch<AdminUserListResult>(`/api/admin/users?pageSize=1000${role ? `&role=${role}` : ''}`).then((r) => r.items),
      listPaged: (params: AdminUserListParams = {}): Promise<AdminUserListResult> => {
        const query = new URLSearchParams();
        if (params.role) query.set('role', params.role);
        if (params.page) query.set('page', String(params.page));
        if (params.pageSize) query.set('pageSize', String(params.pageSize));
        if (params.search) query.set('search', params.search);
        if (params.sortBy) query.set('sortBy', params.sortBy);
        if (params.sortDir) query.set('sortDir', params.sortDir);
        return apiFetch(`/api/admin/users?${query.toString()}`);
      },
      get: (id: string): Promise<AdminUserDetail> => apiFetch(`/api/admin/users/${id}`),
      aggregates: (id: string): Promise<UserAggregates> => apiFetch(`/api/admin/users/${id}/aggregates`),
      create: (input: CreateUserInput): Promise<AdminUser> =>
        apiFetch('/api/admin/users', { method: 'POST', body: JSON.stringify(input) }),
      deleteAdmin: (id: string): Promise<{ success: true }> =>
        apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' }),
    },
    roster: {
      list: (): Promise<RosterLink[]> => apiFetch('/api/admin/instructor-students'),
      create: (input: CreateInstructorStudentInput): Promise<{ id: string }> =>
        apiFetch('/api/admin/instructor-students', { method: 'POST', body: JSON.stringify(input) }),
      remove: (id: string): Promise<{ success: true }> =>
        apiFetch(`/api/admin/instructor-students/${id}`, { method: 'DELETE' }),
    },
    smtpSettings: {
      get: (): Promise<SmtpSettings | null> => apiFetch('/api/admin/smtp-settings'),
      update: (input: SmtpSettings): Promise<SmtpSettings> =>
        apiFetch('/api/admin/smtp-settings', { method: 'PUT', body: JSON.stringify(input) }),
      sendTest: (input: SmtpSettings): Promise<{ success: true }> =>
        apiFetch('/api/admin/smtp-settings/test', { method: 'POST', body: JSON.stringify(input) }),
    },
    reopenRequests: {
      list: (): Promise<AdminReopenRequest[]> => apiFetch('/api/admin/reopen-requests'),
      resolve: (id: string, approve: boolean): Promise<{ success: true }> =>
        apiFetch(`/api/admin/reopen-requests/${id}/resolve`, { method: 'POST', body: JSON.stringify({ approve }) }),
    },
  },
  instructor: {
    roster: {
      list: (): Promise<RosterLink[]> => apiFetch('/api/instructor/students'),
      search: (query: string): Promise<RosterLink[]> =>
        apiFetch(`/api/instructor/students?q=${encodeURIComponent(query)}`),
      studentAssignments: (studentId: string): Promise<InstructorStudentAssignment[]> =>
        apiFetch(`/api/instructor/students/${studentId}/assignments`),
      studentProfile: (studentId: string): Promise<PublicStudentProfile> =>
        apiFetch(`/api/instructor/students/${studentId}/profile`),
    },
    assignments: {
      list: (): Promise<AssignmentSummary[]> => apiFetch('/api/instructor/assignments'),
      create: (input: CreateAssignmentInput): Promise<{ id: string; title: string }> =>
        apiFetch('/api/instructor/assignments', { method: 'POST', body: JSON.stringify(input) }),
      get: (id: string): Promise<AssignmentDetail> => apiFetch(`/api/instructor/assignments/${id}`),
      addStudents: (id: string, input: AddAssignmentStudentsInput): Promise<{ success: true }> =>
        apiFetch(`/api/instructor/assignments/${id}/students`, {
          method: 'POST',
          body: JSON.stringify(input),
        }),
    },
    guidelines: {
      get: (): Promise<Guidelines> => apiFetch('/api/instructor/guidelines'),
      update: (content: string): Promise<Guidelines> =>
        apiFetch('/api/instructor/guidelines', { method: 'PUT', body: JSON.stringify({ content }) }),
    },
    report: (): Promise<InstructorReportRow[]> => apiFetch('/api/instructor/report'),
    profile: {
      get: (): Promise<InstructorProfileData> => apiFetch('/api/instructor/profile'),
      update: (input: UpdateInstructorProfileInput): Promise<InstructorProfileData> =>
        apiFetch('/api/instructor/profile', { method: 'PUT', body: JSON.stringify(input) }),
    },
  },
  student: {
    assignments: {
      list: (): Promise<StudentAssignmentSummary[]> => apiFetch('/api/student/assignments'),
      get: (id: string): Promise<StudentAssignmentDetail> => apiFetch(`/api/student/assignments/${id}`),
      start: (id: string): Promise<StartAssignmentResult> =>
        apiFetch(`/api/student/assignments/${id}/start`, { method: 'POST' }),
    },
    guidelines: {
      get: (): Promise<Guidelines> => apiFetch('/api/student/guidelines'),
    },
    instructorProfile: (id: string): Promise<PublicInstructorProfile> =>
      apiFetch(`/api/student/instructors/${id}/profile`),
    profile: {
      get: (): Promise<StudentProfileData> => apiFetch('/api/student/profile'),
      update: (input: UpdateStudentProfileInput): Promise<StudentProfileData> =>
        apiFetch('/api/student/profile', { method: 'PUT', body: JSON.stringify(input) }),
    },
  },
  submissions: {
    get: (projectId: string): Promise<SubmissionDetail | null> =>
      apiFetch(`/api/projects/${projectId}/submission`),
    act: (projectId: string, input: SubmissionActionInput): Promise<SubmissionDetail> =>
      apiFetch(`/api/projects/${projectId}/submission`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
  },
  notifications: {
    list: (): Promise<NotificationsResponse> => apiFetch('/api/notifications'),
    markRead: (id: string): Promise<{ success: true }> =>
      apiFetch(`/api/notifications/${id}/read`, { method: 'POST' }),
    markAllRead: (): Promise<{ success: true }> =>
      apiFetch('/api/notifications/mark-all-read', { method: 'POST' }),
  },
  presence: {
    ping: (): Promise<{ success: true }> => apiFetch('/api/presence/ping', { method: 'POST' }),
  },
  account: {
    changePassword: (input: ChangePasswordInput): Promise<{ success: true }> =>
      apiFetch('/api/account/password', { method: 'PUT', body: JSON.stringify(input) }),
  },
  auth: {
    forgotPassword: (input: ForgotPasswordInput): Promise<ForgotPasswordResult> =>
      apiFetch('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify(input) }),
    resetPassword: (input: ResetPasswordInput): Promise<{ success: true }> =>
      apiFetch('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(input) }),
  },
};
