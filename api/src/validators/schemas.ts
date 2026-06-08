import { z } from 'zod';

// Sample validation schemas
export const createSampleSchema = z.object({
  authorName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .optional(), // Now optional — will be auto-filled from authenticated user
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    address: z.string().optional(),
  }),
  ph: z.number().min(0, 'pH must be at least 0').max(14, 'pH must be at most 14').optional().nullable(),
  temperature: z.number().min(-100, 'Temperature must be at least -100°C').max(100, 'Temperature must be at most 100°C').optional().nullable(),
   // Laquatwin fields
   conductivity: z.number().min(0, 'Conductivity must be at least 0 µS/cm').max(199900, 'Conductivity must be at most 199,900 µS/cm').optional().nullable(),
   salinity: z.number().min(0, 'Salinity must be at least 0 ‰').max(100, 'Salinity must be at most 100 ‰').optional().nullable(),
  // LAQUAtwin ISE fields
  nitrate: z.number().min(0, 'Nitrate must be at least 0 mg/L').max(6200, 'Nitrate must be at most 6,200 mg/L').optional().nullable(),
  calcium: z.number().min(0, 'Calcium must be at least 0 mg/L').max(4000, 'Calcium must be at most 4,000 mg/L').optional().nullable(),
  potassium: z.number().min(0, 'Potassium must be at least 0 mg/L').max(2000, 'Potassium must be at most 2,000 mg/L').optional().nullable(),
  sodium: z.number().min(0, 'Sodium must be at least 0 mg/L').max(2000, 'Sodium must be at most 2,000 mg/L').optional().nullable(),
  waterBodyType: z.string().min(1, 'Water body type is required'),
  landUse: z.string().min(1, 'Land use is required'),
  gpsAccuracy: z.number().min(0).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const updateSampleSchema = z.object({
  authorName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .optional(),
  ph: z.number().min(0, 'pH must be at least 0').max(14, 'pH must be at most 14').optional().nullable(),
  temperature: z.number().min(-100, 'Temperature must be at least -100°C').max(100, 'Temperature must be at most 100°C').optional().nullable(),
   // Laquatwin fields
   conductivity: z.number().min(0, 'Conductivity must be at least 0 µS/cm').max(199900, 'Conductivity must be at most 199,900 µS/cm').optional().nullable(),
   salinity: z.number().min(0, 'Salinity must be at least 0 ‰').max(100, 'Salinity must be at most 100 ‰').optional().nullable(),
  // LAQUAtwin ISE fields
  nitrate: z.number().min(0, 'Nitrate must be at least 0 mg/L').max(6200, 'Nitrate must be at most 6,200 mg/L').optional().nullable(),
  calcium: z.number().min(0, 'Calcium must be at least 0 mg/L').max(4000, 'Calcium must be at most 4,000 mg/L').optional().nullable(),
  potassium: z.number().min(0, 'Potassium must be at least 0 mg/L').max(2000, 'Potassium must be at most 2,000 mg/L').optional().nullable(),
  sodium: z.number().min(0, 'Sodium must be at least 0 mg/L').max(2000, 'Sodium must be at most 2,000 mg/L').optional().nullable(),
  waterBodyType: z.string().optional().nullable(),
  landUse: z.string().optional().nullable(),
  gpsAccuracy: z.number().min(0).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
});

export const getSamplesQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  authorName: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  qualityScoreFilter: z.enum(['high', 'moderate', 'low', 'none']).optional(),
});

export const markersQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(1000).optional().default(500),
});

// Location validation schemas
export const createLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().optional(),
});

// Auth validation schemas
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required').max(30, 'Username too long'),
  password: z.string().min(1, 'Password is required').max(128, 'Password too long'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username too long')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password too long'),
});

export const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username too long')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password too long').optional(),
  role: z.enum(['user', 'admin']).optional().default('user'),
});

export const updateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long').optional(),
  active: z.boolean().optional(),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password too long'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required').max(128, 'Password too long'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(128, 'Password too long'),
});

// Type exports
export type CreateSampleInput = z.infer<typeof createSampleSchema>;
export type UpdateSampleInput = z.infer<typeof updateSampleSchema>;
export type CreateLocationInput = z.infer<typeof createLocationSchema>;

// Spatial query validation schemas
export const nearbyLocationsSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusMeters: z.coerce.number().min(1).max(10000).default(1000),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

export const nearbySamplesSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusMeters: z.coerce.number().min(1).max(10000).default(1000),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

export type NearbyLocationsInput = z.infer<typeof nearbyLocationsSchema>;
export type NearbySamplesInput = z.infer<typeof nearbySamplesSchema>;

// Reusable UUID param validator for all /:id routes
export const uuidParam = z.string().uuid('Invalid ID format — must be a valid UUID');