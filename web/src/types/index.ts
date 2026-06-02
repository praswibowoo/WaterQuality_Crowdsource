// Type definitions for Water Quality Crowdsource

export interface Location {
  id: string;
  latitude: number;
  longitude: number;
  address?: string | null;
  createdAt: Date;
}

export interface Sample {
  id: string;
  authorName: string;
  locationId: string;
  location: Location;
  ph?: number | null;
  temperature?: number | null;
  // Laquatwin params
  conductivity?: number | null;  // µS/cm
  salinity?: number | null;       // ‰
  // LAQUAtwin ISE params
  nitrate?: number | null;    // mg/L
  calcium?: number | null;    // mg/L
  potassium?: number | null;  // mg/L
  sodium?: number | null;     // mg/L
  waterBodyType?: string | null;
  landUse?: string | null;
  gpsAccuracy?: number | null;
  qualityScore?: number | null;
  notes?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
  photos?: Photo[];
}

export interface Photo {
  id: string;
  filename: string;
  path: string;
  mimeType: string;
  size: number;
  caption?: string | null;
  sampleId: string;
  createdAt: Date;
}

export interface CreateSampleInput {
  authorName: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  ph?: number;
  temperature?: number;
  // Laquatwin params
  conductivity?: number;
  salinity?: number;
  // LAQUAtwin ISE params
  nitrate?: number;
  calcium?: number;
  potassium?: number;
  sodium?: number;
  waterBodyType: string;
  landUse: string;
  gpsAccuracy?: number;
  notes?: string;
}

export interface UpdateSampleInput {
  authorName?: string;
  ph?: number | null;
  temperature?: number | null;
  // Laquatwin params
  conductivity?: number | null;
  salinity?: number | null;
  // LAQUAtwin ISE params
  nitrate?: number | null;
  calcium?: number | null;
  potassium?: number | null;
  sodium?: number | null;
  waterBodyType?: string | null;
  landUse?: string | null;
  gpsAccuracy?: number | null;
  notes?: string | null;
  status?: 'pending' | 'approved' | 'rejected';
}

export interface CreateLocationInput {
  latitude: number;
  longitude: number;
  address?: string;
}

// Offline sync types
export interface PendingSubmission {
  id: string;
  data: CreateSampleInput;
  timestamp: number;
  retryCount: number;
}

// API Response types
export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

// Paginated response type
export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  totalCount: number;
}

export * from './offline';