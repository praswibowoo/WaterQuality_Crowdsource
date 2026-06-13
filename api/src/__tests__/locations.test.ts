import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler';
import { mockSession, TEST_USER_ID } from './helpers/setup';

const TEST_LOCATION_ID = '00000000-0000-0000-0000-000000000099';

const mockFindOrCreateLocation = jest.fn<any>();

jest.mock('../services/locationService', () => ({
  findOrCreateLocation: (...args: unknown[]) => mockFindOrCreateLocation(...args),
}));

const mockPrisma = {
  userAccount: {
    findUnique: jest.fn<any>(),
  },
  location: {
    findMany: jest.fn<any>(),
    findUnique: jest.fn<any>(),
  },
};

jest.mock('../db/prisma', () => ({
  __esModule: true,
  default: mockPrisma,
}));

let locationsRouter: express.Router;

function createApp(sessionData?: Record<string, unknown>) {
  const app = express();
  app.use(express.json());
  app.use(mockSession(sessionData));
  app.use('/api/v1/locations', locationsRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

beforeEach(async () => {
  jest.clearAllMocks();
  mockPrisma.location.findMany.mockResolvedValue([]);
  mockPrisma.location.findUnique.mockResolvedValue(null);
  locationsRouter = (await import('../routes/locations')).default;
});

describe('POST /api/v1/locations — Auth & Dedup (LOC1-LOC3)', () => {
  it('LOC1: POST / requires authentication', async () => {
    const app = createApp({});
    const res = await request(app)
      .post('/api/v1/locations')
      .send({ latitude: -7.305, longitude: 112.844, address: 'Wonorejo' });

    expect(res.status).toBe(401);
  });

  it('LOC2: POST / creates new location returns 201 with created=true', async () => {
    mockPrisma.userAccount.findUnique.mockResolvedValue({
      id: TEST_USER_ID, username: 'testuser', role: 'user', active: true,
    });
    mockFindOrCreateLocation.mockResolvedValue({
      location: {
        id: TEST_LOCATION_ID,
        latitude: -7.305,
        longitude: 112.844,
        address: 'Wonorejo',
        createdAt: new Date(),
      },
      created: true,
    });

    const app = createApp({ userId: TEST_USER_ID, username: 'testuser', role: 'user' });
    const res = await request(app)
      .post('/api/v1/locations')
      .send({ latitude: -7.305, longitude: 112.844, address: 'Wonorejo' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('created', true);
    expect(res.body.location).toHaveProperty('id');
    expect(res.body.location).toHaveProperty('latitude');
    expect(res.body.location).toHaveProperty('longitude');
    expect(mockFindOrCreateLocation).toHaveBeenCalledWith(-7.305, 112.844, 'Wonorejo');
  });

  it('LOC3: POST / deduplicates existing location returns 200 with created=false', async () => {
    mockPrisma.userAccount.findUnique.mockResolvedValue({
      id: TEST_USER_ID, username: 'testuser', role: 'user', active: true,
    });
    mockFindOrCreateLocation.mockResolvedValue({
      location: {
        id: TEST_LOCATION_ID,
        latitude: -7.305,
        longitude: 112.844,
        address: 'Wonorejo',
        createdAt: new Date(),
      },
      created: false,
    });

    const app = createApp({ userId: TEST_USER_ID, username: 'testuser', role: 'user' });
    const res = await request(app)
      .post('/api/v1/locations')
      .send({ latitude: -7.305, longitude: 112.844, address: 'Wonorejo' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('created', false);
    expect(res.body.location).toHaveProperty('id', TEST_LOCATION_ID);
  });
});
