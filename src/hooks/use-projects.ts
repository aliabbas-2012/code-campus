import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { CreateProjectInput, Project, UpdateProjectInput } from '@/types/api';

export function useProjects(): UseQueryResult<Project[]> {
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: api.projects.list,
  });
}

export function useProject(id: string): UseQueryResult<Project> {
  return useQuery({
    queryKey: queryKeys.project(id),
    queryFn: () => api.projects.get(id),
    enabled: !!id,
  });
}

export function useCreateProject(): UseMutationResult<Project, Error, CreateProjectInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) => api.projects.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
}

export function useUpdateProject(): UseMutationResult<
  Project,
  Error,
  { id: string; input: UpdateProjectInput }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProjectInput }) =>
      api.projects.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
}

export function useDeleteProject(): UseMutationResult<{ success: true }, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.projects.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
}
