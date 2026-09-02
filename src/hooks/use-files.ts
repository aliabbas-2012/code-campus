import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type {
  CreateFileInput,
  CreateFolderInput,
  CreatedFile,
  FileNode,
  FileWithContent,
  UpdateFileResult,
} from '@/types/api';

/**
 * The files API only lists one parent_id level at a time. Since Phase 1 projects
 * are small, fetch the whole tree by walking folders breadth-first and flatten
 * it into a single cached list, rather than building lazy per-folder pagination.
 */
async function fetchProjectFileTree(projectId: string): Promise<FileNode[]> {
  const root = await api.files.list(projectId);
  const all: FileNode[] = [...root];
  let frontier = root.filter((f) => f.type === 'FOLDER');

  while (frontier.length > 0) {
    const batches = await Promise.all(
      frontier.map((folder) => api.files.list(projectId, folder.id)),
    );
    const children = batches.flat();
    all.push(...children);
    frontier = children.filter((f) => f.type === 'FOLDER');
  }

  return all;
}

export function useProjectFiles(projectId: string): UseQueryResult<FileNode[]> {
  return useQuery({
    queryKey: queryKeys.files(projectId),
    queryFn: () => fetchProjectFileTree(projectId),
    enabled: !!projectId,
  });
}

export function useFile(fileId: string | null): UseQueryResult<FileWithContent> {
  return useQuery({
    queryKey: queryKeys.file(fileId ?? ''),
    queryFn: () => api.files.get(fileId as string),
    enabled: !!fileId,
  });
}

export function useCreateFile(projectId: string): UseMutationResult<CreatedFile, Error, CreateFileInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFileInput) => api.files.create(projectId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.files(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.storage });
    },
  });
}

export function useCreateFolder(projectId: string): UseMutationResult<CreatedFile, Error, CreateFolderInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFolderInput) => api.files.createFolder(projectId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.files(projectId) });
    },
  });
}

export function useRenameFile(
  projectId: string,
): UseMutationResult<UpdateFileResult, Error, { fileId: string; name: string }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ fileId, name }: { fileId: string; name: string }) =>
      api.files.update(fileId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.files(projectId) });
    },
  });
}

export function useDeleteFile(projectId: string): UseMutationResult<{ success: true }, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fileId: string) => api.files.remove(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.files(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.storage });
    },
  });
}
