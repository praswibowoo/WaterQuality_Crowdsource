import { useQuery } from '@tanstack/react-query';
import { usersApi, type UsersFilters } from '../api/users';

export function useUsersCount(filters?: Omit<UsersFilters, 'cursor' | 'limit'>) {
  return useQuery({
    queryKey: ['users', 'count', filters],
    queryFn: () => usersApi.count(filters),
    staleTime: 30000,
  });
}
