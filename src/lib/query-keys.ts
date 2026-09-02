export const queryKeys = {
  projects: ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
  files: (projectId: string) => ['projects', projectId, 'files'] as const,
  file: (fileId: string) => ['files', fileId] as const,
  storage: ['workspace', 'storage'] as const,
};
