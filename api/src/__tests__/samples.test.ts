import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';
const TEST_ADMIN_ID = '00000000-0000-0000-0000-000000000002';
const TEST_SAMPLE_ID = '00000000-0000-0000-0000-000000000010';
const TEST_LOCATION_ID = '00000000-0000-0000-0000-000000000020';

const mockPrisma = {
  sample: {
    findMany: jest.fn<any>(),
    findUnique: jest.fn<any>(),
    create: jest.fn<any>(),
    update: jest.fn<any>(),
    delete: jest.fn<any>(),
    count: jest.fn<any>(),
  },
  location: {
    findUnique: jest.fn<any>(),
    create: jest.fn<any>(),
    deleteMany: jest.fn<any>(),
  },
  photo: {
    findMany: jest.fn<any>(),
    findUnique: jest.fn<any>(),
    create: jest.fn<any>(),
    delete: jest.fn<any>(),
    count: jest.fn<any>(),
  },
  userAccount: {
    findUnique: jest.fn<any>(),
  },
  loginLog: {
    create: jest.fn<any>(),
  },
  $executeRaw: jest.fn<any>(),
  $queryRaw: jest.fn<any>(),
};

jest.mock('../db/prisma', () => ({
  __esModule: true,
  default: mockPrisma,
}));

jest.mock('../services/qualityScoring', () => ({
  recalculateScore: jest.fn(),
}));

let samplesRouter: express.Router;

interface SessionData {
  userId: string;
  username: string;
  role: string;
}

function createApp(sessionData?: SessionData) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).sessionID = 'test-session-id';
    (req as any).session = {
      userId: sessionData?.userId || undefined,
      username: sessionData?.username || undefined,
      role: sessionData?.role || undefined,
      regenerate: (cb: (err?: Error) => void) => cb(),
      destroy: (cb: (err?: Error) => void) => cb(),
      cookie: {},
    };
    next();
  });
  app.use('/api/v1/samples', samplesRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

function mockDbUser(overrides?: Record<string, unknown>) {
  return {
    id: TEST_USER_ID,
    username: 'testuser',
    name: 'Test User',
    role: 'user',
    active: true,
    ...overrides,
  };
}

function mockSample(overrides?: Record<string, unknown>) {
  return {
    id: TEST_SAMPLE_ID,
    authorName: 'Test User',
    userId: TEST_USER_ID,
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
    status: 'pending',
    qualityScore: null,
    notes: 'Test sample',
    createdAt: new Date(),
    updatedAt: new Date(),
    locationId: TEST_LOCATION_ID,
    location: {
      id: TEST_LOCATION_ID,
      latitude: -7.3059612,
      longitude: 112.8443053,
      address: 'Test address',
    },
    photos: [],
    ...overrides,
  };
}

beforeEach(async () => {
  jest.clearAllMocks();
  samplesRouter = (await import('../routes/samples')).default;
});

describe('Samples API — Ownership & Status Guard (SP1-SP12)', () => {
  // ─── SP1-SP6: Ownership checks ───
  describe('Ownership checks', () => {
    it('SP3: owner can edit own sample via PUT', async () => {
      mockPrisma.userAccount.findUnique.mockResolvedValue(mockDbUser({ id: TEST_USER_ID }));
      mockPrisma.sample.findUnique.mockResolvedValue(mockSample({ userId: TEST_USER_ID }));
      mockPrisma.sample.update.mockResolvedValue(mockSample({ ph: 8.0 }));

      const app = createApp({ userId: TEST_USER_ID, username: 'testuser', role: 'user' });
      const res = await request(app)
        .put(`/api/v1/samples/${TEST_SAMPLE_ID}`)
        .send({ ph: 8.0 });

      expect(res.status).toBe(200);
    });

    it('SP1: non-owner gets 403 on PUT', async () => {
      const OTHER_USER_ID = 'other-0000-0000-0000-000000000000';
      mockPrisma.userAccount.findUnique.mockResolvedValue(mockDbUser({ id: OTHER_USER_ID, username: 'other', role: 'user' }));
      mockPrisma.sample.findUnique.mockResolvedValue(mockSample({ userId: TEST_USER_ID }));

      const app = createApp({ userId: OTHER_USER_ID, username: 'other', role: 'user' });
      const res = await request(app)
        .put(`/api/v1/samples/${TEST_SAMPLE_ID}`)
        .send({ ph: 8.0 });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('only edit your own');
    });

    it('SP5: admin bypass — admin can edit any sample', async () => {
      mockPrisma.userAccount.findUnique.mockResolvedValue(mockDbUser({ id: TEST_ADMIN_ID, username: 'admin', role: 'admin' }));
      mockPrisma.sample.findUnique.mockResolvedValue(mockSample({ userId: TEST_USER_ID }));
      mockPrisma.sample.update.mockResolvedValue(mockSample({ ph: 8.0 }));

      const app = createApp({ userId: TEST_ADMIN_ID, username: 'admin', role: 'admin' });
      const res = await request(app)
        .put(`/api/v1/samples/${TEST_SAMPLE_ID}`)
        .send({ ph: 8.0 });

      expect(res.status).toBe(200);
    });

    it('SP6: owner can delete own sample', async () => {
      mockPrisma.userAccount.findUnique.mockResolvedValue(mockDbUser({ id: TEST_USER_ID }));
      mockPrisma.sample.findUnique.mockResolvedValue(
        mockSample({ userId: TEST_USER_ID, photos: [{ id: 'photo-1', path: 'test.jpg' }] })
      );
      mockPrisma.sample.delete.mockResolvedValue(mockSample());
      mockPrisma.location.deleteMany.mockResolvedValue({ count: 1 });

      const app = createApp({ userId: TEST_USER_ID, username: 'testuser', role: 'user' });
      const res = await request(app).delete(`/api/v1/samples/${TEST_SAMPLE_ID}`);

      expect(res.status).toBe(204);
    });

    it('SP2: non-owner gets 403 on DELETE', async () => {
      const OTHER_USER_ID = 'other-0000-0000-0000-000000000000';
      mockPrisma.userAccount.findUnique.mockResolvedValue(mockDbUser({ id: OTHER_USER_ID, username: 'other', role: 'user' }));
      mockPrisma.sample.findUnique.mockResolvedValue(mockSample({ userId: TEST_USER_ID }));

      const app = createApp({ userId: OTHER_USER_ID, username: 'other', role: 'user' });
      const res = await request(app).delete(`/api/v1/samples/${TEST_SAMPLE_ID}`);

      expect(res.status).toBe(403);
    });
  });

  // ─── SP7-SP8: Status guard ───
  describe('Status guard', () => {
    it('SP7: non-admin cannot set status to approved', async () => {
      mockPrisma.userAccount.findUnique.mockResolvedValue(mockDbUser({ id: TEST_USER_ID }));
      mockPrisma.sample.findUnique.mockResolvedValue(mockSample({ userId: TEST_USER_ID }));
      mockPrisma.sample.update.mockResolvedValue(mockSample());

      const app = createApp({ userId: TEST_USER_ID, username: 'testuser', role: 'user' });
      const res = await request(app)
        .put(`/api/v1/samples/${TEST_SAMPLE_ID}`)
        .send({ status: 'approved' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Only admins');
    });

    it('SP8: admin can change status', async () => {
      mockPrisma.userAccount.findUnique.mockResolvedValue(mockDbUser({ id: TEST_ADMIN_ID, username: 'admin', role: 'admin' }));
      mockPrisma.sample.findUnique.mockResolvedValue(mockSample({ userId: TEST_USER_ID }));
      mockPrisma.sample.update.mockResolvedValue(mockSample({ status: 'approved' }));

      const app = createApp({ userId: TEST_ADMIN_ID, username: 'admin', role: 'admin' });
      const res = await request(app)
        .put(`/api/v1/samples/${TEST_SAMPLE_ID}`)
        .send({ status: 'approved' });

      expect(res.status).toBe(200);
    });
  });

  // ─── SP9-SP12: Auth requirements ───
  describe('Auth requirements', () => {
    it('SP9: POST / auto-sets userId from auth', async () => {
      mockPrisma.userAccount.findUnique.mockResolvedValue(mockDbUser({ id: TEST_USER_ID, username: 'testuser' }));
      mockPrisma.$queryRaw.mockResolvedValue([]);
      mockPrisma.location.create.mockResolvedValue({ id: TEST_LOCATION_ID, latitude: -7.3, longitude: 112.8 });
      mockPrisma.sample.create.mockResolvedValue(mockSample({ userId: TEST_USER_ID }));

      const app = createApp({ userId: TEST_USER_ID, username: 'testuser', role: 'user' });
      const res = await request(app)
        .post('/api/v1/samples')
        .send({
          location: { latitude: -7.3, longitude: 112.8 },
          waterBodyType: 'estuary',
          landUse: 'mangrove_forest',
        });

      expect(res.status).toBe(201);
      expect(mockPrisma.sample.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: TEST_USER_ID }),
        })
      );
    });

    it('SP10: POST / requires auth', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/v1/samples')
        .send({ location: { latitude: -7.3, longitude: 112.8 }, waterBodyType: 'estuary', landUse: 'mangrove_forest' });

      expect(res.status).toBe(401);
    });

    it('SP11: PUT /:id requires auth', async () => {
      const app = createApp();
      const res = await request(app)
        .put(`/api/v1/samples/${TEST_SAMPLE_ID}`)
        .send({ ph: 8.0 });

      expect(res.status).toBe(401);
    });

    it('SP12: DELETE /:id requires auth', async () => {
      const app = createApp();
      const res = await request(app).delete(`/api/v1/samples/${TEST_SAMPLE_ID}`);

      expect(res.status).toBe(401);
    });
  });
});
