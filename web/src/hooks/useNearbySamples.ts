import { useState, useCallback } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export interface NearbySample {
  id: string;
  authorName: string;
  ph: number | null;
  temperature: number | null;
  conductivity: number | null;
  salinity: number | null;
  nitrate: number | null;
  calcium: number | null;
  potassium: number | null;
  sodium: number | null;
  waterBodyType: string | null;
  landUse: string | null;
  status: string;
  createdAt: string;
  latitude: number;
  longitude: number;
  address: string | null;
  distance_meters: number;
}

interface UseNearbySamplesReturn {
  samples: NearbySample[];
  isLoading: boolean;
  error: string | null;
  radius: number;
  setRadius: (r: number) => void;
  search: (lat: number, lng: number) => Promise<void>;
}

export function useNearbySamples(): UseNearbySamplesReturn {
  const [samples, setSamples] = useState<NearbySample[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [radius, setRadius] = useState(500);

  const search = useCallback(async (lat: number, lng: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: response } = await axios.get(`${API_BASE}/samples/nearby`, {
        params: { latitude: lat, longitude: lng, radiusMeters: radius, limit: 50 },
      });
      setSamples(response?.data?.samples || []);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      setError(axiosErr?.response?.data?.error?.message || 'Failed to search nearby samples');
      setSamples([]);
    } finally {
      setIsLoading(false);
    }
  }, [radius]);

  return { samples, isLoading, error, radius, setRadius, search };
}
