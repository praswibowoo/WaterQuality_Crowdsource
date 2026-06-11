import { useInfiniteQuery } from '@tanstack/react-query';
import { usersApi, type UsersFilters } from '../api/users';

export function useUsers(filters?: UsersFilters) {
  return useInfiniteQuery({
    queryKey: ['users', filters],
    queryFn: ({ pageParam }) => usersApi.list({ ...filters, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30000,
  });
}
