import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { samplesApi } from '../api/samples';
import type { UpdateSampleInput } from '../types';

export interface SampleFilters {
  status?: string;
  authorName?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: string;
  qualityScoreFilter?: string;
}

export function useSamples(filters?: SampleFilters) {
  return useInfiniteQuery({
    queryKey: ['samples', filters],
    queryFn: ({ pageParam }) =>
      samplesApi.getAll({
        ...filters,
        cursor: pageParam as string | undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30000,
  });
}

export function usePendingCount() {
  return useQuery({
    queryKey: ['samples', 'pending-count'],
    queryFn: async () => {
      const result = await samplesApi.getAll({ status: 'pending', limit: 1 });
      return result.totalCount;
    },
    refetchInterval: 30000,
  });
}

export interface SamplesStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export function useSamplesStats() {
  return useQuery({
    queryKey: ['samples', 'stats'],
    queryFn: async (): Promise<SamplesStats> => {
      const data = await samplesApi.getStats();
      return data;
    },
    staleTime: 30000,
  });
}

export function useSample(id: string) {
  return useQuery({
    queryKey: ['sample', id],
    queryFn: () => samplesApi.getById(id),
    enabled: !!id,
  });
}

export function useLocationSamples(locationId: string) {
  return useQuery({
    queryKey: ['location-samples', locationId],
    queryFn: () => samplesApi.getByLocation(locationId),
    enabled: !!locationId,
  });
}

export function useUpdateSample() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSampleInput }) =>
      samplesApi.update(id, data),
    onSuccess: (updatedSample) => {
      queryClient.invalidateQueries({ queryKey: ['samples'] });
      queryClient.setQueryData(['sample', updatedSample.id], updatedSample);
    },
  });
}

export function useDeleteSample() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => samplesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['samples'] });
    },
  });
}