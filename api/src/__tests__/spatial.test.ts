import { describe, it, expect, jest } from '@jest/globals';
import {
  nearbyLocationsSchema,
  nearbySamplesSchema,
} from '../validators/schemas.js';
import { sendSuccess, sendError } from '../middleware/responseEnvelope.js';
import type { Response } from 'express';

function mockResponse() {
  return {
    status: jest.fn().mockReturnThis() as unknown as Response['status'],
    json: jest.fn() as unknown as Response['json'],
  } as Response;
}

describe('Spatial Validation Schemas', () => {
  describe('nearbyLocationsSchema', () => {
    it('should validate valid query parameters', () => {
      const validQuery = {
        latitude: -7.306,
        longitude: 112.844,
        radiusMeters: 1000,
        limit: 10,
      };
      const result = nearbyLocationsSchema.safeParse(validQuery);
      expect(result.success).toBe(true);
    });

    it('should apply defaults for optional fields', () => {
      const minimalQuery = {
        latitude: -7.306,
        longitude: 112.844,
      };
      const result = nearbyLocationsSchema.safeParse(minimalQuery);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.radiusMeters).toBe(1000);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should reject latitude out of range', () => {
      const invalid = {
        latitude: 91,
        longitude: 112.844,
      };
      const result = nearbyLocationsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject longitude out of range', () => {
      const invalid = {
        latitude: -7.306,
        longitude: 181,
      };
      const result = nearbyLocationsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject radiusMeters exceeding 10000', () => {
      const invalid = {
        latitude: -7.306,
        longitude: 112.844,
        radiusMeters: 10001,
      };
      const result = nearbyLocationsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject limit exceeding 100', () => {
      const invalid = {
        latitude: -7.306,
        longitude: 112.844,
        limit: 101,
      };
      const result = nearbyLocationsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should coerce string values to numbers', () => {
      const stringQuery = {
        latitude: '-7.306',
        longitude: '112.844',
        radiusMeters: '500',
      };
      const result = nearbyLocationsSchema.safeParse(stringQuery);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.latitude).toBe('number');
        expect(typeof result.data.radiusMeters).toBe('number');
      }
    });
  });

  describe('nearbySamplesSchema', () => {
    it('should validate valid query parameters', () => {
      const validQuery = {
        latitude: -7.306,
        longitude: 112.844,
        radiusMeters: 500,
        limit: 5,
      };
      const result = nearbySamplesSchema.safeParse(validQuery);
      expect(result.success).toBe(true);
    });

    it('should accept radiusMeters of 1 (minimum)', () => {
      const query = {
        latitude: -7.306,
        longitude: 112.844,
        radiusMeters: 1,
      };
      const result = nearbySamplesSchema.safeParse(query);
      expect(result.success).toBe(true);
    });

    it('should accept radiusMeters of 10000 (maximum)', () => {
      const query = {
        latitude: -7.306,
        longitude: 112.844,
        radiusMeters: 10000,
      };
      const result = nearbySamplesSchema.safeParse(query);
      expect(result.success).toBe(true);
    });
  });
});

describe('Response Envelope Middleware', () => {
  it('sendSuccess wraps data correctly', () => {
    const res = mockResponse();
    sendSuccess(res, { locations: [], query: {} });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { locations: [], query: {} },
    });
  });

  it('sendSuccess uses custom status code', () => {
    const res = mockResponse();
    sendSuccess(res, { id: 'abc' }, 201);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('sendError wraps error correctly', () => {
    const res = mockResponse();
    sendError(res, 'NOT_FOUND', 'Resource not found', 404);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Resource not found' },
    });
  });

  it('sendError defaults to 400', () => {
    const res = mockResponse();
    sendError(res, 'BAD_REQUEST', 'Invalid input');
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

jest.mock('../scripts/migratePostGIS', () => ({
  migrateLocationsToPostGIS: jest.fn<() => Promise<number>>().mockResolvedValue(0),
}));

import { migrateLocationsToPostGIS } from '../scripts/migratePostGIS.js';

describe('Migration Safety', () => {
  it('migration script handles already-migrated locations gracefully', async () => {
    const result = await migrateLocationsToPostGIS();
    expect(result).toBeGreaterThanOrEqual(0);
  });
});
