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
  },
  workspace: {
    storage: (): Promise<StorageInfo> => apiFetch('/api/workspace/storage'),
  },
};
