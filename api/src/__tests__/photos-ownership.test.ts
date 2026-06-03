import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';
const TEST_ADMIN_ID = '00000000-0000-0000-0000-000000000002';
const TEST_SAMPLE_ID = '00000000-0000-0000-0000-000000000010';
const TEST_PHOTO_ID = '00000000-0000-0000-0000-000000000030';

const mockPrisma = {
  sample: {
    findUnique: jest.fn<any>(),
  },
  photo: {
    findUnique: jest.fn<any>(),
    findMany: jest.fn<any>(),
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
  location: {
    deleteMany: jest.fn<any>(),
  },
  $executeRaw: jest.fn<any>(),
};

jest.mock('../db/prisma', () => ({
  __esModule: true,
  default: mockPrisma,
}));

jest.mock('../services/qualityScoring', () => ({
  recalculateScore: jest.fn(),
}));

jest.mock('multer', () => {
  const multer = () => ({
    array: () => (req: any, _res: any, next: any) => {
      req.files = [{ filename: 'test.jpg', path: '/tmp/test.jpg', mimetype: 'image/jpeg', size: 1000, originalname: 'test.jpg' }];
      next();
    },
  });
  multer.diskStorage = () => ({});
  return multer;
});

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  unlinkSync: jest.fn(),
}));

let photosRouter: express.Router;

function createApp(sessionData?: Record<string, unknown>) {
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
  app.use('/api/v1', photosRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

beforeEach(async () => {
  jest.clearAllMocks();
  photosRouter = (await import('../routes/photos')).default;
});

describe('Photos API — Ownership Checks (PO1-PO6)', () => {
  describe('Photo upload ownership', () => {
    it('PO2: owner can upload photos to own sample', async () => {
      mockPrisma.userAccount.findUnique.mockResolvedValue({
        id: TEST_USER_ID, username: 'testuser', role: 'user', active: true,
      });
      mockPrisma.sample.findUnique.mockResolvedValue({
        id: TEST_SAMPLE_ID,
        userId: TEST_USER_ID,
      });
      mockPrisma.photo.count.mockResolvedValue(0);
      mockPrisma.photo.create.mockResolvedValue({
        id: TEST_PHOTO_ID,
        filename: 'test.jpg',
        path: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1000,
        sampleId: TEST_SAMPLE_ID,
      });

      const app = createApp({ userId: TEST_USER_ID, username: 'testuser', role: 'user' });
      const res = await request(app).post(`/api/v1/samples/${TEST_SAMPLE_ID}/photos`);

      expect(res.status).toBe(201);
    });

    it('PO1: non-owner gets 403 on photo upload', async () => {
      mockPrisma.userAccount.findUnique.mockResolvedValue({
        id: 'other-user-id', username: 'other', role: 'user', active: true,
      });
      mockPrisma.sample.findUnique.mockResolvedValue({
        id: TEST_SAMPLE_ID,
        userId: TEST_USER_ID,
      });

      const app = createApp({ userId: 'other-user-id', username: 'other', role: 'user' });
      const res = await request(app).post(`/api/v1/samples/${TEST_SAMPLE_ID}/photos`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('only add photos');
    });

    it('PO3: admin can upload to any sample', async () => {
      mockPrisma.userAccount.findUnique.mockResolvedValue({
        id: TEST_ADMIN_ID, username: 'admin', role: 'admin', active: true,
      });
      mockPrisma.sample.findUnique.mockResolvedValue({
        id: TEST_SAMPLE_ID,
        userId: TEST_USER_ID,
      });
      mockPrisma.photo.count.mockResolvedValue(0);
      mockPrisma.photo.create.mockResolvedValue({
        id: TEST_PHOTO_ID,
        path: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1000,
        sampleId: TEST_SAMPLE_ID,
      });

      const app = createApp({ userId: TEST_ADMIN_ID, username: 'admin', role: 'admin' });
      const res = await request(app).post(`/api/v1/samples/${TEST_SAMPLE_ID}/photos`);

      expect(res.status).toBe(201);
    });
  });

  describe('Photo delete ownership', () => {
    it('PO5: owner can delete own photo', async () => {
      // authMiddleware user lookup — same as session data
      mockPrisma.userAccount.findUnique.mockResolvedValue({
        id: TEST_USER_ID, username: 'testuser', role: 'user', active: true,
      });
      // Find photo with sample ownership
      mockPrisma.photo.findUnique.mockResolvedValue({
        id: TEST_PHOTO_ID,
        sampleId: TEST_SAMPLE_ID,
        path: 'test.jpg',
        sample: { userId: TEST_USER_ID },
      });
      mockPrisma.photo.delete.mockResolvedValue({});

      const app = createApp({ userId: TEST_USER_ID, username: 'testuser', role: 'user' });
      const res = await request(app).delete(`/api/v1/photos/${TEST_PHOTO_ID}`);

      expect(res.status).toBe(204);
    });

    it('PO4: non-owner gets 403 on photo delete', async () => {
      mockPrisma.userAccount.findUnique.mockResolvedValue({
        id: TEST_USER_ID, username: 'testuser', role: 'user', active: true,
      });
      mockPrisma.photo.findUnique.mockResolvedValue({
        id: TEST_PHOTO_ID,
        sampleId: TEST_SAMPLE_ID,
        path: 'test.jpg',
        sample: { userId: 'other-user-id' },
      });

      const app = createApp({ userId: TEST_USER_ID, username: 'testuser', role: 'user' });
      const res = await request(app).delete(`/api/v1/photos/${TEST_PHOTO_ID}`);

      expect(res.status).toBe(403);
    });

    it('PO6: admin can delete any photo', async () => {
      mockPrisma.userAccount.findUnique.mockResolvedValue({
        id: TEST_ADMIN_ID, username: 'admin', role: 'admin', active: true,
      });
      mockPrisma.photo.findUnique.mockResolvedValue({
        id: TEST_PHOTO_ID,
        sampleId: TEST_SAMPLE_ID,
        path: 'test.jpg',
        sample: { userId: TEST_USER_ID },
      });
      mockPrisma.photo.delete.mockResolvedValue({});

      const app = createApp({ userId: TEST_ADMIN_ID, username: 'admin', role: 'admin' });
      const res = await request(app).delete(`/api/v1/photos/${TEST_PHOTO_ID}`);

      expect(res.status).toBe(204);
    });
  });
});
