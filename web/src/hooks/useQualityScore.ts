import { useQuery } from '@tanstack/react-query';
import { samplesApi } from '../api/samples';

export function useQualityScore(sampleId: string) {
  return useQuery({
    queryKey: ['samples', sampleId, 'quality-score'],
    queryFn: () => samplesApi.getQualityScore(sampleId),
    staleTime: 60000,
    retry: false,
  });
}
