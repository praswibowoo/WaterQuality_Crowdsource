import { describe, it, expect } from '@jest/globals';
import {
  createSampleSchema,
  updateSampleSchema,
  getSamplesQuerySchema,
} from '../validators/schemas';

describe('Zod Validation Schemas', () => {
  describe('createSampleSchema', () => {
    it('should validate a valid sample input', () => {
      const validInput = {
        authorName: 'Test User',
        location: {
          latitude: -7.3059612,
          longitude: 112.8443053,
          address: 'Wonorejo Mangrove',
        },
        ph: 7.2,
        temperature: 28.5,
        conductivity: 10500,
        salinity: 15.5,
        nitrate: 100,
        calcium: 200,
        potassium: 50,
        sodium: 150,
        waterBodyType: 'estuary',
        landUse: 'mangrove_forest',
        notes: 'Sample from mangrove area',
      };

      const result = createSampleSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate minimal input with only required fields', () => {
      const minimalInput = {
        authorName: 'Test User',
        location: {
          latitude: -7.3059612,
          longitude: 112.8443053,
        },
        waterBodyType: 'estuary',
        landUse: 'mangrove_forest',
      };

      const result = createSampleSchema.safeParse(minimalInput);
      expect(result.success).toBe(true);
    });

    it('should reject input without waterBodyType', () => {
      const invalidInput = {
        authorName: 'Test User',
        location: {
          latitude: -7.3059612,
          longitude: 112.8443053,
        },
        landUse: 'mangrove_forest',
      };

      const result = createSampleSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject input without landUse', () => {
      const invalidInput = {
        authorName: 'Test User',
        location: {
          latitude: -7.3059612,
          longitude: 112.8443053,
        },
        waterBodyType: 'estuary',
      };

      const result = createSampleSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject invalid authorName (too short)', () => {
      const invalidInput = {
        authorName: 'T',
        location: {
          latitude: -7.3059612,
          longitude: 112.8443053,
        },
        waterBodyType: 'estuary',
        landUse: 'mangrove_forest',
      };

      const result = createSampleSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject invalid latitude (> 90)', () => {
      const invalidInput = {
        authorName: 'Test User',
        location: {
          latitude: 91,
          longitude: 112.8443053,
        },
        waterBodyType: 'estuary',
        landUse: 'mangrove_forest',
      };

      const result = createSampleSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject invalid latitude (< -90)', () => {
      const invalidInput = {
        authorName: 'Test User',
        location: {
          latitude: -91,
          longitude: 112.8443053,
        },
        waterBodyType: 'estuary',
        landUse: 'mangrove_forest',
      };

      const result = createSampleSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject invalid longitude (> 180)', () => {
      const invalidInput = {
        authorName: 'Test User',
        location: {
          latitude: -7.3059612,
          longitude: 181,
        },
        waterBodyType: 'estuary',
        landUse: 'mangrove_forest',
      };

      const result = createSampleSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject pH outside 0-14 range', () => {
      const invalidLow = {
        authorName: 'Test User',
        location: { latitude: -7.3059612, longitude: 112.8443053 },
        ph: -1,
      };

      const invalidHigh = {
        authorName: 'Test User',
        location: { latitude: -7.3059612, longitude: 112.8443053 },
        ph: 15,
      };

      expect(createSampleSchema.safeParse(invalidLow).success).toBe(false);
      expect(createSampleSchema.safeParse(invalidHigh).success).toBe(false);
    });

    it('should accept pH at boundaries (0 and 14)', () => {
      const boundaryLow = {
        authorName: 'Test User',
        location: { latitude: -7.3059612, longitude: 112.8443053 },
        waterBodyType: 'estuary',
        landUse: 'mangrove_forest',
        ph: 0,
      };

      const boundaryHigh = {
        authorName: 'Test User',
        location: { latitude: -7.3059612, longitude: 112.8443053 },
        waterBodyType: 'estuary',
        landUse: 'mangrove_forest',
        ph: 14,
      };

      expect(createSampleSchema.safeParse(boundaryLow).success).toBe(true);
      expect(createSampleSchema.safeParse(boundaryHigh).success).toBe(true);
    });

    it('should reject conductivity outside 0-199900 µS/cm range', () => {
      const invalidInput = {
        authorName: 'Test User',
        location: { latitude: -7.3059612, longitude: 112.8443053 },
        conductivity: 200000,
      };

      const result = createSampleSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject salinity outside 0-100 ‰ range', () => {
      const invalidInput = {
        authorName: 'Test User',
        location: { latitude: -7.3059612, longitude: 112.8443053 },
        salinity: 105,
      };

      const result = createSampleSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject nitrate outside 0-6200 mg/L range', () => {
      const invalidInput = {
        authorName: 'Test User',
        location: { latitude: -7.3059612, longitude: 112.8443053 },
        nitrate: 6201,
      };

      const result = createSampleSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject calcium outside 0-4000 mg/L range', () => {
      const invalidInput = {
        authorName: 'Test User',
        location: { latitude: -7.3059612, longitude: 112.8443053 },
        calcium: 4001,
      };

      const result = createSampleSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject potassium outside 0-2000 mg/L range', () => {
      const invalidInput = {
        authorName: 'Test User',
        location: { latitude: -7.3059612, longitude: 112.8443053 },
        potassium: 2001,
      };

      const result = createSampleSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject sodium outside 0-2000 mg/L range', () => {
      const invalidInput = {
        authorName: 'Test User',
        location: { latitude: -7.3059612, longitude: 112.8443053 },
        sodium: 2001,
      };

      const result = createSampleSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject temperature outside -100 to +100°C range', () => {
      const invalidLow = {
        authorName: 'Test User',
        location: { latitude: -7.3059612, longitude: 112.8443053 },
        temperature: -101,
      };

      const invalidHigh = {
        authorName: 'Test User',
        location: { latitude: -7.3059612, longitude: 112.8443053 },
        temperature: 101,
      };

      expect(createSampleSchema.safeParse(invalidLow).success).toBe(false);
      expect(createSampleSchema.safeParse(invalidHigh).success).toBe(false);
    });

    it('should accept null values for optional fields', () => {
      const inputWithNulls = {
        authorName: 'Test User',
        location: { latitude: -7.3059612, longitude: 112.8443053 },
        waterBodyType: 'estuary',
        landUse: 'mangrove_forest',
        ph: null,
        temperature: null,
        conductivity: null,
        salinity: null,
        nitrate: null,
        calcium: null,
        potassium: null,
        sodium: null,
        notes: null,
      };

      const result = createSampleSchema.safeParse(inputWithNulls);
      expect(result.success).toBe(true);
    });

    it('should reject notes longer than 1000 characters', () => {
      const longNotes = {
        authorName: 'Test User',
        location: { latitude: -7.3059612, longitude: 112.8443053 },
        waterBodyType: 'estuary',
        landUse: 'mangrove_forest',
        notes: 'A'.repeat(1001),
      };

      const result = createSampleSchema.safeParse(longNotes);
      expect(result.success).toBe(false);
    });
  });

  describe('updateSampleSchema', () => {
    it('should validate partial update with only status', () => {
      const updateInput = {
        status: 'approved',
      };

      const result = updateSampleSchema.safeParse(updateInput);
      expect(result.success).toBe(true);
    });

    it('should validate partial update with only ph', () => {
      const updateInput = {
        ph: 7.5,
      };

      const result = updateSampleSchema.safeParse(updateInput);
      expect(result.success).toBe(true);
    });

    it('should allow setting fields to null explicitly', () => {
      const updateInput = {
        ph: null,
        conductivity: null,
      };

      const result = updateSampleSchema.safeParse(updateInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid status value', () => {
      const invalidInput = {
        status: 'invalid',
      };

      const result = updateSampleSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should accept valid status values', () => {
      const pendingInput = { status: 'pending' };
      const approvedInput = { status: 'approved' };
      const rejectedInput = { status: 'rejected' };

      expect(updateSampleSchema.safeParse(pendingInput).success).toBe(true);
      expect(updateSampleSchema.safeParse(approvedInput).success).toBe(true);
      expect(updateSampleSchema.safeParse(rejectedInput).success).toBe(true);
    });
  });

  describe('getSamplesQuerySchema', () => {
    it('should accept valid status values', () => {
      const pendingQuery = { status: 'pending' };
      const approvedQuery = { status: 'approved' };
      const rejectedQuery = { status: 'rejected' };

      expect(getSamplesQuerySchema.safeParse(pendingQuery).success).toBe(true);
      expect(getSamplesQuerySchema.safeParse(approvedQuery).success).toBe(true);
      expect(getSamplesQuerySchema.safeParse(rejectedQuery).success).toBe(true);
    });

    it('should reject invalid status values', () => {
      const invalidQuery = { status: 'invalid' };

      const result = getSamplesQuerySchema.safeParse(invalidQuery);
      expect(result.success).toBe(false);
    });

    it('should accept empty object', () => {
      const result = getSamplesQuerySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept authorName parameter', () => {
      const queryWithAuthor = { authorName: 'Ahmad' };

      const result = getSamplesQuerySchema.safeParse(queryWithAuthor);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.authorName).toBe('Ahmad');
      }
    });

    it('should accept date range and sort params', () => {
      const query = {
        authorName: 'Budi',
        dateFrom: '2024-01-01T00:00:00Z',
        dateTo: '2024-12-31T23:59:59Z',
        sortBy: 'ph',
        sortOrder: 'asc' as const,
      };

      const result = getSamplesQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
    });
  });
});
