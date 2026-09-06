'use client';

import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { InstructorProfileData, PublicInstructorProfile, UpdateInstructorProfileInput } from '@/types/api';

export function useInstructorProfile(): UseQueryResult<InstructorProfileData> {
  return useQuery({ queryKey: queryKeys.instructorProfile, queryFn: api.instructor.profile.get });
}

export function useUpdateInstructorProfile(): UseMutationResult<InstructorProfileData, Error, UpdateInstructorProfileInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateInstructorProfileInput) => api.instructor.profile.update(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.instructorProfile }),
  });
}

export function useStudentViewOfInstructorProfile(instructorId: string | null): UseQueryResult<PublicInstructorProfile> {
  return useQuery({
    queryKey: queryKeys.studentInstructorProfile(instructorId ?? ''),
    queryFn: () => api.student.instructorProfile(instructorId as string),
    enabled: !!instructorId,
  });
}
