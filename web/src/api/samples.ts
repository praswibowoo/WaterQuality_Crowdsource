import axios from 'axios';
import type {
  Sample,
  CreateSampleInput,
  UpdateSampleInput,
  Photo,
  PaginatedResponse,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
  withCredentials: true,
});

// Intercept timeout errors for user-friendly messages
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      const enhancedError = new Error(
        'Request timed out. Please check your connection and try again.'
      );
      enhancedError.name = 'TimeoutError';
      return Promise.reject(enhancedError);
    }
    return Promise.reject(error);
  }
);

// Samples API
export const samplesApi = {
  async getAll(filters?: {
    status?: string;
    authorName?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    sortOrder?: string;
    cursor?: string;
    limit?: number;
    qualityScoreFilter?: string;
  }): Promise<PaginatedResponse<Sample>> {
    const params: Record<string, string | number> = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.authorName) params.authorName = filters.authorName;
    if (filters?.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters?.dateTo) params.dateTo = filters.dateTo;
    if (filters?.sortBy) params.sortBy = filters.sortBy;
    if (filters?.sortOrder) params.sortOrder = filters.sortOrder;
    if (filters?.cursor) params.cursor = filters.cursor;
    if (filters?.limit) params.limit = filters.limit;
    if (filters?.qualityScoreFilter) params.qualityScoreFilter = filters.qualityScoreFilter;
    const response = await apiClient.get<PaginatedResponse<Sample>>('/samples', { params });
    return response.data;
  },

  async getById(id: string): Promise<Sample> {
    const response = await apiClient.get<Sample>(`/samples/${id}`);
    return response.data;
  },

  async getByLocation(locationId: string): Promise<Sample[]> {
    const response = await apiClient.get<Sample[]>(`/locations/${locationId}/samples`);
    return response.data;
  },

  async create(data: CreateSampleInput): Promise<Sample> {
    const response = await apiClient.post<Sample>('/samples', data);
    return response.data;
  },

  async update(id: string, data: UpdateSampleInput): Promise<Sample> {
    const response = await apiClient.put<Sample>(`/samples/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/samples/${id}`);
  },

  async exportCsv(status?: string): Promise<Blob> {
    const params: Record<string, string> = { format: 'csv' };
    if (status) params.status = status;
    const response = await apiClient.get('/samples/export', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  async uploadPhotos(sampleId: string, files: File[]): Promise<Photo[]> {
    const formData = new FormData();
    files.forEach((file) => formData.append('photos', file));
    const response = await apiClient.post<Photo[]>(`/samples/${sampleId}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    });
    return response.data;
  },

  async getPhotos(sampleId: string): Promise<Photo[]> {
    const response = await apiClient.get<Photo[]>(`/samples/${sampleId}/photos`);
    return response.data;
  },

  async deletePhoto(photoId: string): Promise<void> {
    await apiClient.delete(`/photos/${photoId}`);
  },

  async getMapMarkers(): Promise<SampleMapMarker[]> {
    const response = await apiClient.get<SampleMapMarker[]>('/samples/markers');
    return response.data;
  },

  async getQualityScore(sampleId: string): Promise<QualityScoreResponse> {
    const response = await apiClient.get<QualityScoreResponse>(`/samples/${sampleId}/quality-score`);
    return response.data;
  },
};

export interface FactorScore {
  score: number;
  weight: number;
  rawValue?: unknown;
  description: string;
}

export interface ScoreBreakdown {
  gpsAccuracy: FactorScore;
  rangeValidity: FactorScore;
  spatialOutlier: FactorScore;
  metadataCompleteness: FactorScore;
  temporalConsistency: FactorScore;
  photoPresence: FactorScore;
}

export interface QualityScoreResponse {
  success: boolean;
  data: {
    sampleId: string;
    qualityScore: number;
    computedAt: string;
    breakdown: ScoreBreakdown;
  };
}

export interface SampleMapMarker {
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
  gpsAccuracy: number | null;
  qualityScore: number | null;
  notes: string | null;
  status: string;
  createdAt: string;
  location: {
    latitude: number;
    longitude: number;
  };
}
