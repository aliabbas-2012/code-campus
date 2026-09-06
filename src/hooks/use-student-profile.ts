'use client';

import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { StudentProfileData, PublicStudentProfile, UpdateStudentProfileInput } from '@/types/api';

export function useStudentProfile(): UseQueryResult<StudentProfileData> {
  return useQuery({ queryKey: queryKeys.studentProfile, queryFn: api.student.profile.get });
}

export function useUpdateStudentProfile(): UseMutationResult<StudentProfileData, Error, UpdateStudentProfileInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateStudentProfileInput) => api.student.profile.update(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.studentProfile }),
  });
}

export function useInstructorViewOfStudentProfile(studentId: string | null): UseQueryResult<PublicStudentProfile> {
  return useQuery({
    queryKey: queryKeys.instructorStudentProfile(studentId ?? ''),
    queryFn: () => api.instructor.roster.studentProfile(studentId as string),
    enabled: !!studentId,
  });
}
