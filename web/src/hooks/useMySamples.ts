import { useQuery } from '@tanstack/react-query';
import { samplesApi } from '../api/samples';

export function useMySamples(filters?: {
  status?: string;
  sortBy?: string;
  sortOrder?: string;
}) {
  return useQuery({
    queryKey: ['my-samples', filters],
    queryFn: () => samplesApi.getMySamples({ ...filters, limit: 100 }),
    staleTime: 30000,
  });
}
