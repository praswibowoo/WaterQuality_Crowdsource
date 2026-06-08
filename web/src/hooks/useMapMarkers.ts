import { useQuery } from '@tanstack/react-query';
import { samplesApi, type SampleMapMarker } from '../api/samples';

const MAX_MARKER_PAGES = 10;

export function useMapMarkers() {
  return useQuery({
    queryKey: ['samples', 'map-markers'],
    queryFn: async (): Promise<SampleMapMarker[]> => {
      const allMarkers: SampleMapMarker[] = [];
      let cursor: string | undefined;
      let pages = 0;
      let hasMore = true;
      while (hasMore && pages < MAX_MARKER_PAGES) {
        const page = await samplesApi.getMapMarkers(cursor);
        allMarkers.push(...page.data);
        cursor = page.nextCursor ?? undefined;
        hasMore = !!page.nextCursor;
        pages++;
      }
      return allMarkers;
    },
    staleTime: 30000,
  });
}

export type { SampleMapMarker };
