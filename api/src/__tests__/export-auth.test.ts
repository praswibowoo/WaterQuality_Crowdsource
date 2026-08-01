import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler.js';
import { mockSession } from './helpers/setup.js';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';
const TEST_ADMIN_ID = '00000000-0000-0000-0000-000000000002';

const mockPrisma = {
  sample: {
    findMany: jest.fn<any>(),
    count: jest.fn<any>(),
  },
  userAccount: {
    findUnique: jest.fn<any>(),
  },
};

jest.mock('../db/prisma', () => ({
  __esModule: true,
  default: mockPrisma,
}));

let exportRouter: express.Router;

function createApp(sessionData?: Record<string, unknown>) {
  const app = express();
  app.use(express.json());
  app.use(mockSession(sessionData));
  app.use('/api/v1/samples', exportRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

beforeEach(async () => {
  jest.clearAllMocks();
  mockPrisma.sample.count.mockResolvedValue(0);
  exportRouter = (await import('../routes/export')).default;
});

describe('Export API — Auth & Filtering (EA1-EA4)', () => {
  it('EA1: GET /export requires auth', async () => {
    const app = createApp({});
    const res = await request(app).get('/api/v1/samples/export');

    expect(res.status).toBe(401);
  });

  it('EA2: non-admin export returns only approved samples', async () => {
    mockPrisma.userAccount.findUnique.mockResolvedValue({
      id: TEST_USER_ID, username: 'testuser', role: 'user', active: true,
    });
    mockPrisma.sample.findMany.mockResolvedValue([]);

    const app = createApp({ userId: TEST_USER_ID, username: 'testuser', role: 'user' });
    await request(app).get('/api/v1/samples/export');

    expect(mockPrisma.sample.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'approved' }),
      })
    );
  });

  it('EA3: admin can filter by status', async () => {
    mockPrisma.userAccount.findUnique.mockResolvedValue({
      id: TEST_ADMIN_ID, username: 'admin', role: 'admin', active: true,
    });
    mockPrisma.sample.findMany.mockResolvedValue([]);

    const app = createApp({ userId: TEST_ADMIN_ID, username: 'admin', role: 'admin' });
    await request(app).get('/api/v1/samples/export?status=pending');

    expect(mockPrisma.sample.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'pending' }),
      })
    );
  });

  it('EA4: export returns valid CSV format', async () => {
    mockPrisma.userAccount.findUnique.mockResolvedValue({
      id: TEST_ADMIN_ID, username: 'admin', role: 'admin', active: true,
    });
    mockPrisma.sample.findMany.mockResolvedValue([
      {
        id: 'sample-1',
        authorName: 'Test User',
        status: 'approved',
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
        gpsAccuracy: null,
        qualityScore: 0.85,
        notes: 'Test',
        createdAt: new Date(),
        updatedAt: new Date(),
        location: { latitude: -7.3, longitude: 112.8, address: 'Wonorejo' },
      },
    ]);

    const app = createApp({ userId: TEST_ADMIN_ID, username: 'admin', role: 'admin' });
    const res = await request(app).get('/api/v1/samples/export');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('csv');
    expect(res.text).toContain('ID,Author,Latitude,Longitude');
    expect(res.text).toContain('Test User');
  });
});
