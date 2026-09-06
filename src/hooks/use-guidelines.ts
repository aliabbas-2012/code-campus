'use client';

import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { Guidelines } from '@/types/api';

export function useInstructorGuidelines(): UseQueryResult<Guidelines> {
  return useQuery({ queryKey: queryKeys.instructorGuidelines, queryFn: api.instructor.guidelines.get });
}

export function useUpdateInstructorGuidelines(): UseMutationResult<Guidelines, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => api.instructor.guidelines.update(content),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.instructorGuidelines }),
  });
}

export function useStudentGuidelines(): UseQueryResult<Guidelines> {
  return useQuery({ queryKey: queryKeys.studentGuidelines, queryFn: api.student.guidelines.get });
}
