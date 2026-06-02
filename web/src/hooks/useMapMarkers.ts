import { useQuery } from '@tanstack/react-query';
import { samplesApi, type SampleMapMarker } from '../api/samples';

export function useMapMarkers() {
  return useQuery({
    queryKey: ['samples', 'map-markers'],
    queryFn: () => samplesApi.getMapMarkers(),
    staleTime: 30000,
  });
}

export type { SampleMapMarker };
