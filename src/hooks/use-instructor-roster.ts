import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { RosterLink } from '@/types/api';

export function useInstructorRoster(): UseQueryResult<RosterLink[]> {
  return useQuery({
    queryKey: queryKeys.instructorRoster,
    queryFn: api.instructor.roster.list,
  });
}
