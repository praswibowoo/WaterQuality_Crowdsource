// Mock prisma before any imports
jest.mock('../../db/prisma', () => {
  const mockFindUnique = jest.fn();
  const mockUpdate = jest.fn();
  const mockQueryRaw = jest.fn();

  return {
    __esModule: true,
    default: {
      sample: {
        findUnique: mockFindUnique,
        update: mockUpdate,
      },
      $queryRaw: mockQueryRaw,
    },
  };
});

import { calculateQualityScore } from '../qualityScoring.js';
import prisma from '../../db/prisma.js';

const mockFindUnique = prisma.sample.findUnique as jest.Mock;
const mockQueryRaw = prisma.$queryRaw as jest.Mock;

describe('Quality Scoring Engine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateQualityScore', () => {
    it('throws error when sample is not found', async () => {
      mockFindUnique.mockResolvedValue(null);
      await expect(calculateQualityScore('nonexistent')).rejects.toThrow('Sample not found');
    });

    it('calculates a score for a sample with all data', async () => {
      const mockSample = {
        id: 'sample-1',
        authorName: 'Test User',
        locationId: 'loc-1',
        ph: 7.2,
        temperature: 28.5,
        conductivity: 15000,
        salinity: 25.5,
        nitrate: 5.0,
        calcium: 50,
        potassium: 10,
        sodium: 100,
        waterBodyType: 'estuary',
        landUse: 'mangrove',
        gpsAccuracy: 8,
        notes: 'Test sample notes',
        status: 'pending',
        qualityScore: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        location: {
          id: 'loc-1',
          latitude: -7.305,
          longitude: 112.844,
          geog: null,
          address: 'Wonorejo, Surabaya',
          createdAt: new Date(),
        },
        photos: [{ id: 'photo-1' }],
      };

      mockFindUnique.mockResolvedValue(mockSample);

      // Spatial query for first param (ph)
      mockQueryRaw.mockResolvedValue([
        { cnt: BigInt(5), mean_val: 7.0, stddev_val: 0.3 },
      ]);

      const result = await calculateQualityScore('sample-1');

      expect(result.qualityScore).toBeGreaterThanOrEqual(0);
      expect(result.qualityScore).toBeLessThanOrEqual(1);
      expect(result.breakdown.gpsAccuracy).toBeDefined();
      expect(result.breakdown.rangeValidity).toBeDefined();
      expect(result.breakdown.spatialOutlier).toBeDefined();
      expect(result.breakdown.metadataCompleteness).toBeDefined();
      expect(result.breakdown.temporalConsistency).toBeDefined();
      expect(result.breakdown.photoPresence).toBeDefined();
      expect(result.computedAt).toBeInstanceOf(Date);

      // GPS accuracy with 8m
      expect(result.breakdown.gpsAccuracy.score).toBeCloseTo(0.92, 2);
      expect(result.breakdown.gpsAccuracy.rawValue).toBe('8m');

      // All 8 fields in range
      expect(result.breakdown.rangeValidity.score).toBe(1);

      // All 4 metadata present
      expect(result.breakdown.metadataCompleteness.score).toBe(1);

      // Photo present
      expect(result.breakdown.photoPresence.score).toBe(1);
    });

    it('handles sample with no measurements gracefully', async () => {
      const mockSample = {
        id: 'sample-2',
        authorName: 'Empty',
        locationId: 'loc-2',
        ph: null,
        temperature: null,
        conductivity: null,
        salinity: null,
        nitrate: null,
        calcium: null,
        potassium: null,
        sodium: null,
        waterBodyType: null,
        landUse: null,
        gpsAccuracy: null,
        notes: null,
        status: 'pending',
        qualityScore: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        location: {
          id: 'loc-2',
          latitude: -7.305,
          longitude: 112.844,
          geog: null,
          address: null,
          createdAt: new Date(),
        },
        photos: [],
      };

      mockFindUnique.mockResolvedValue(mockSample);

      const result = await calculateQualityScore('sample-2');

      // 0.20*0.5 + 0.20*0 + 0.20*0.5 + 0.15*0 + 0.15*0.5 + 0.10*0
      // = 0.10 + 0 + 0.10 + 0 + 0.075 + 0 = 0.275
      expect(result.qualityScore).toBeCloseTo(0.275, 3);
      expect(result.breakdown.gpsAccuracy.score).toBe(0.5);
      expect(result.breakdown.rangeValidity.score).toBe(0);
      expect(result.breakdown.metadataCompleteness.score).toBe(0);
      expect(result.breakdown.photoPresence.score).toBe(0);
      expect(result.breakdown.spatialOutlier.score).toBe(0.5);
      expect(result.breakdown.temporalConsistency.score).toBe(0.5);
    });

    it('scores GPS accuracy factor correctly for high accuracy', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'sample-gps', authorName: 'Test', locationId: 'loc-1',
        ph: null, temperature: null, conductivity: null, salinity: null,
        nitrate: null, calcium: null, potassium: null, sodium: null,
        waterBodyType: 'river', landUse: 'urban', gpsAccuracy: 5, notes: 'Test',
        status: 'pending', qualityScore: null,
        createdAt: new Date(), updatedAt: new Date(),
        location: { id: 'loc-1', latitude: -7.3, longitude: 112.8, geog: null, address: null, createdAt: new Date() },
        photos: [],
      });
      const result = await calculateQualityScore('sample-gps');
      expect(result.breakdown.gpsAccuracy.score).toBeCloseTo(0.95, 2);
      expect(result.breakdown.gpsAccuracy.rawValue).toBe('5m');
    });

    it('scores range validity factor correctly — out of range values', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'sample-range', authorName: 'Test', locationId: 'loc-1',
        ph: 14.5, temperature: 110, conductivity: 500000, salinity: 150,
        nitrate: null, calcium: null, potassium: null, sodium: null,
        waterBodyType: 'river', landUse: 'urban', gpsAccuracy: 10, notes: null,
        status: 'pending', qualityScore: null,
        createdAt: new Date(), updatedAt: new Date(),
        location: { id: 'loc-1', latitude: -7.3, longitude: 112.8, geog: null, address: null, createdAt: new Date() },
        photos: [],
      });
      const result = await calculateQualityScore('sample-range');
      expect(result.breakdown.rangeValidity.score).toBe(0);
      expect(result.breakdown.rangeValidity.rawValue).toBe('0/4 in range');
    });

    it('scores metadata completeness — partial metadata', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'sample-meta', authorName: 'Test', locationId: 'loc-1',
        ph: null, temperature: null, conductivity: null, salinity: null,
        nitrate: null, calcium: null, potassium: null, sodium: null,
        waterBodyType: 'river', landUse: '', gpsAccuracy: null, notes: null,
        status: 'pending', qualityScore: null,
        createdAt: new Date(), updatedAt: new Date(),
        location: { id: 'loc-1', latitude: -7.3, longitude: 112.8, geog: null, address: null, createdAt: new Date() },
        photos: [],
      });
      const result = await calculateQualityScore('sample-meta');
      expect(result.breakdown.metadataCompleteness.score).toBe(0.25);
      expect(result.breakdown.metadataCompleteness.rawValue).toBe('1/4');
    });

    it('scores photo presence — no photos', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'sample-photo', authorName: 'Test', locationId: 'loc-1',
        ph: 7.0, temperature: null, conductivity: null, salinity: null,
        nitrate: null, calcium: null, potassium: null, sodium: null,
        waterBodyType: 'river', landUse: 'urban', gpsAccuracy: 10, notes: 'Test',
        status: 'pending', qualityScore: null,
        createdAt: new Date(), updatedAt: new Date(),
        location: { id: 'loc-1', latitude: -7.3, longitude: 112.8, geog: null, address: null, createdAt: new Date() },
        photos: [],
      });
      const result = await calculateQualityScore('sample-photo');
      expect(result.breakdown.photoPresence.score).toBe(0);
      expect(result.breakdown.photoPresence.rawValue).toBe(0);
    });

    it('scores photo presence — has photos', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'sample-photo2', authorName: 'Test', locationId: 'loc-1',
        ph: 7.0, temperature: null, conductivity: null, salinity: null,
        nitrate: null, calcium: null, potassium: null, sodium: null,
        waterBodyType: 'river', landUse: 'urban', gpsAccuracy: 10, notes: 'Test',
        status: 'pending', qualityScore: null,
        createdAt: new Date(), updatedAt: new Date(),
        location: { id: 'loc-1', latitude: -7.3, longitude: 112.8, geog: null, address: null, createdAt: new Date() },
        photos: [{ id: 'photo-1' }, { id: 'photo-2' }],
      });
      const result = await calculateQualityScore('sample-photo2');
      expect(result.breakdown.photoPresence.score).toBe(1);
      expect(result.breakdown.photoPresence.rawValue).toBe(2);
    });

    it('produces consistent scores for varying GPS accuracy', async () => {
      const scores: number[] = [];

      for (const gpsValue of [5, 50, 150]) {
        jest.clearAllMocks();

        const mockSample = {
          id: `sample-gps-${gpsValue}`,
          authorName: 'GPS Test',
          locationId: 'loc-gps',
          ph: 7.0,
          temperature: null,
          conductivity: null,
          salinity: null,
          nitrate: null,
          calcium: null,
          potassium: null,
          sodium: null,
          waterBodyType: 'river',
          landUse: 'urban',
          gpsAccuracy: gpsValue,
          notes: 'Test',
          status: 'pending',
          qualityScore: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          location: {
            id: 'loc-gps',
            latitude: -7.3,
            longitude: 112.8,
            geog: null,
            address: null,
            createdAt: new Date(),
          },
          photos: [],
        };

        mockFindUnique.mockResolvedValue(mockSample);
        // Spatial query for ph
        mockQueryRaw.mockResolvedValue([
          { cnt: BigInt(3), mean_val: 7.0, stddev_val: 0.2 },
        ]);

        const result = await calculateQualityScore(`sample-gps-${gpsValue}`);
        scores.push(result.qualityScore);
      }

      // Higher GPS accuracy should give higher score
      expect(scores[0]).toBeGreaterThan(scores[1]);
      expect(scores[1]).toBeGreaterThan(scores[2]);
    });
  });
});
