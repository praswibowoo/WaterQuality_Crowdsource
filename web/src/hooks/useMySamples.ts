import { useInfiniteQuery } from '@tanstack/react-query';
import { samplesApi } from '../api/samples';

export function useMySamples(filters?: {
  status?: string;
  sortBy?: string;
  sortOrder?: string;
}) {
  return useInfiniteQuery({
    queryKey: ['my-samples', filters],
    queryFn: ({ pageParam }) =>
      samplesApi.getMySamples({ ...filters, cursor: pageParam as string | undefined, limit: 20 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30000,
  });
}
