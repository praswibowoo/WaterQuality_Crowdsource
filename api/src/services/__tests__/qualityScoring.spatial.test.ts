// Spatial Outlier Scoring — Regression Tests (C1 fix)
// Verifies that the SQL query correctly JOINs the Location table

jest.mock('../../db/prisma', () => {
  const mockFindUnique = jest.fn();
  const mockUpdate = jest.fn();
  const mockQueryRawUnsafe = jest.fn();

  return {
    __esModule: true,
    default: {
      sample: {
        findUnique: mockFindUnique,
        update: mockUpdate,
      },
      $queryRawUnsafe: mockQueryRawUnsafe,
    },
  };
});

import { calculateQualityScore } from '../qualityScoring.js';
import prisma from '../../db/prisma.js';

const mockFindUnique = prisma.sample.findUnique as jest.Mock;
const mockQueryRawUnsafe = prisma.$queryRawUnsafe as jest.Mock;

describe('Spatial Outlier Scoring (C1 fix)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('spatial query JOINs Location table (C1 regression)', async () => {
    const mockSample = {
      id: 'sample-1',
      authorName: 'Test',
      locationId: 'loc-1',
      ph: 7.2,
      temperature: null,
      conductivity: null,
      salinity: null,
      nitrate: null,
      calcium: null,
      potassium: null,
      sodium: null,
      waterBodyType: 'estuary',
      landUse: 'mangrove',
      gpsAccuracy: 8,
      notes: 'Test',
      status: 'pending',
      qualityScore: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      location: {
        id: 'loc-1',
        latitude: -7.305,
        longitude: 112.844,
        geog: null,
        address: 'Test location',
        createdAt: new Date(),
      },
      photos: [],
    };

    mockFindUnique.mockResolvedValue(mockSample);
    mockQueryRawUnsafe.mockResolvedValue([
      { cnt: BigInt(5), mean_val: 7.0, stddev_val: 0.3 },
    ]);

    await calculateQualityScore('sample-1');

    // Verify the SQL contains the Location JOIN
    const sqlCall = mockQueryRawUnsafe.mock.calls.find((call: unknown[]) =>
      typeof call[0] === 'string' && call[0].includes('INNER JOIN "Location"')
    );
    expect(sqlCall).toBeDefined();
    expect(sqlCall[0]).toContain('INNER JOIN "Location" l ON s."locationId" = l.id');
  });

  it('spatial query includes IS NOT NULL check for geog (C1 regression)', async () => {
    const mockSample = {
      id: 'sample-2',
      authorName: 'Test',
      locationId: 'loc-2',
      ph: 7.2,
      temperature: null,
      conductivity: null,
      salinity: null,
      nitrate: null,
      calcium: null,
      potassium: null,
      sodium: null,
      waterBodyType: 'estuary',
      landUse: 'mangrove',
      gpsAccuracy: 8,
      notes: 'Test',
      status: 'pending',
      qualityScore: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      location: {
        id: 'loc-2',
        latitude: -7.305,
        longitude: 112.844,
        geog: null,
        address: 'Test location',
        createdAt: new Date(),
      },
      photos: [],
    };

    mockFindUnique.mockResolvedValue(mockSample);
    mockQueryRawUnsafe.mockResolvedValue([
      { cnt: BigInt(5), mean_val: 7.0, stddev_val: 0.3 },
    ]);

    await calculateQualityScore('sample-2');

    // Verify the SQL includes the IS NOT NULL check
    const sqlCall = mockQueryRawUnsafe.mock.calls.find((call: unknown[]) =>
      typeof call[0] === 'string' && call[0].includes('l.geog IS NOT NULL')
    );
    expect(sqlCall).toBeDefined();
  });

  it('returns correct spatial score when neighbors exist', async () => {
    const mockSample = {
      id: 'sample-spatial',
      authorName: 'Test',
      locationId: 'loc-3',
      ph: 7.0,
      temperature: null,
      conductivity: null,
      salinity: null,
      nitrate: null,
      calcium: null,
      potassium: null,
      sodium: null,
      waterBodyType: 'estuary',
      landUse: 'mangrove',
      gpsAccuracy: 5,
      notes: 'Test',
      status: 'pending',
      qualityScore: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      location: {
        id: 'loc-3',
        latitude: -7.305,
        longitude: 112.844,
        geog: null,
        address: 'Test location',
        createdAt: new Date(),
      },
      photos: [],
    };

    mockFindUnique.mockResolvedValue(mockSample);

    // Neighbors have mean=7.0, stddev=0.3, count=5
    // Sample pH=7.0, deviation=0 (within 2σ) → score=1.0
    mockQueryRawUnsafe.mockResolvedValue([
      { cnt: BigInt(5), mean_val: 7.0, stddev_val: 0.3 },
    ]);

    const result = await calculateQualityScore('sample-spatial');

    // Spatial outlier should score 1.0 (sample is within 2σ of neighbor mean)
    expect(result.breakdown.spatialOutlier.score).toBe(1.0);
    expect(result.breakdown.spatialOutlier.rawValue).toBe('0.00 σ');
  });

  it('detects spatial outlier (pH > 2σ from neighbor mean)', async () => {
    const mockSample = {
      id: 'sample-outlier',
      authorName: 'Test',
      locationId: 'loc-4',
      ph: 9.0,
      temperature: null,
      conductivity: null,
      salinity: null,
      nitrate: null,
      calcium: null,
      potassium: null,
      sodium: null,
      waterBodyType: 'estuary',
      landUse: 'mangrove',
      gpsAccuracy: 5,
      notes: 'Test',
      status: 'pending',
      qualityScore: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      location: {
        id: 'loc-4',
        latitude: -7.305,
        longitude: 112.844,
        geog: null,
        address: 'Test location',
        createdAt: new Date(),
      },
      photos: [],
    };

    mockFindUnique.mockResolvedValue(mockSample);

    // Neighbors have mean=7.0, stddev=0.3, count=5
    // Sample pH=9.0, deviation=(9-7)/0.3=6.67σ (>3σ) → score=0.0
    mockQueryRawUnsafe.mockResolvedValue([
      { cnt: BigInt(5), mean_val: 7.0, stddev_val: 0.3 },
    ]);

    const result = await calculateQualityScore('sample-outlier');

    expect(result.breakdown.spatialOutlier.score).toBe(0.0);
    expect(result.breakdown.spatialOutlier.rawValue).toBe('6.67 σ');
  });

  it('returns neutral score when no neighbors exist', async () => {
    const mockSample = {
      id: 'sample-no-neighbors',
      authorName: 'Test',
      locationId: 'loc-5',
      ph: 7.0,
      temperature: null,
      conductivity: null,
      salinity: null,
      nitrate: null,
      calcium: null,
      potassium: null,
      sodium: null,
      waterBodyType: 'estuary',
      landUse: 'mangrove',
      gpsAccuracy: 5,
      notes: 'Test',
      status: 'pending',
      qualityScore: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      location: {
        id: 'loc-5',
        latitude: -7.305,
        longitude: 112.844,
        geog: null,
        address: 'Test location',
        createdAt: new Date(),
      },
      photos: [],
    };

    mockFindUnique.mockResolvedValue(mockSample);

    // No neighbors
    mockQueryRawUnsafe.mockResolvedValue([
      { cnt: BigInt(0), mean_val: null, stddev_val: null },
    ]);

    const result = await calculateQualityScore('sample-no-neighbors');

    // Should return neutral 0.5 score
    expect(result.breakdown.spatialOutlier.score).toBe(0.5);
  });

  it('handles database error gracefully (returns 0.5)', async () => {
    const mockSample = {
      id: 'sample-db-error',
      authorName: 'Test',
      locationId: 'loc-6',
      ph: 7.0,
      temperature: null,
      conductivity: null,
      salinity: null,
      nitrate: null,
      calcium: null,
      potassium: null,
      sodium: null,
      waterBodyType: 'estuary',
      landUse: 'mangrove',
      gpsAccuracy: 5,
      notes: 'Test',
      status: 'pending',
      qualityScore: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      location: {
        id: 'loc-6',
        latitude: -7.305,
        longitude: 112.844,
        geog: null,
        address: 'Test location',
        createdAt: new Date(),
      },
      photos: [],
    };

    mockFindUnique.mockResolvedValue(mockSample);

    // Simulate SQL error
    mockQueryRawUnsafe.mockRejectedValue(new Error('SQL error: invalid reference to FROM-clause'));

    const result = await calculateQualityScore('sample-db-error');

    // Should return neutral 0.5 on error (catch block)
    expect(result.breakdown.spatialOutlier.score).toBe(0.5);
  });
});
