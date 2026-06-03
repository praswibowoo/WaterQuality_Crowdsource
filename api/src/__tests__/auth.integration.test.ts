import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler';

// Mock Prisma
const mockPrisma = {
  userAccount: {
    findUnique: jest.fn<any>(),
    create: jest.fn<any>(),
    update: jest.fn<any>(),
  },
  loginLog: {
    create: jest.fn<any>(),
    findMany: jest.fn<any>(),
  },
  $executeRaw: jest.fn<any>(),
};

jest.mock('../db/prisma', () => ({
  __esModule: true,
  default: mockPrisma,
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockImplementation((pw: unknown) => Promise.resolve(`hashed_${String(pw)}`)),
  compare: jest.fn().mockImplementation((pw: unknown, hash: unknown) => Promise.resolve(String(hash) === `hashed_${String(pw)}`)),
}));

let authRouter: express.Router;

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
  app.use('/api/v1/auth', authRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

beforeEach(async () => {
  jest.clearAllMocks();
  authRouter = (await import('../routes/auth')).default;
});

describe('Auth Routes — Integration (A1-A16)', () => {
  // ─── A1: Registration creates session ───
  describe('POST /api/v1/auth/register', () => {
    it('A1: should create user and set session on registration', async () => {
      mockPrisma.userAccount.findUnique.mockResolvedValue(null);
      mockPrisma.userAccount.create.mockResolvedValue({
        id: 'new-user-id',
        name: 'New User',
        username: 'newuser',
        password: 'hashed_testPass123',
        role: 'user',
      });
      mockPrisma.loginLog.create.mockResolvedValue({});

      const app = createApp();
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'New User', username: 'newuser', password: 'testPass123' });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.username).toBe('newuser');
      expect(res.body.user.role).toBe('user');
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('A2: should reject duplicate username with 409', async () => {
      mockPrisma.userAccount.findUnique.mockResolvedValue({ id: 'existing', username: 'newuser' });

      const app = createApp();
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'New User', username: 'newuser', password: 'testPass123' });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('Username already taken');
    });

    it('A3: should log registration event', async () => {
      mockPrisma.userAccount.findUnique.mockResolvedValue(null);
      mockPrisma.userAccount.create.mockResolvedValue({
        id: 'new-user-id',
        name: 'New User',
        username: 'newuser',
        password: 'hashed_testPass123',
        role: 'user',
      });
      mockPrisma.loginLog.create.mockResolvedValue({});

      const app = createApp();
      await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'New User', username: 'newuser', password: 'testPass123' });

      expect(mockPrisma.loginLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'registration', userId: 'new-user-id' }),
        })
      );
    });
  });

  // ─── A4-A8: Login ───
  describe('POST /api/v1/auth/login', () => {
    it('A4: should login with valid credentials and return user', async () => {
      mockPrisma.userAccount.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        username: 'testuser',
        password: 'hashed_testPass123',
        role: 'user',
        active: true,
      });
      mockPrisma.loginLog.create.mockResolvedValue({});
      mockPrisma.$executeRaw.mockResolvedValue([]);

      const app = createApp();
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'testuser', password: 'testPass123' });

      expect(res.status).toBe(200);
      expect(res.body.user.username).toBe('testuser');
      expect(res.body.user.role).toBe('user');
    });

    it('A5: should reject wrong password with 401', async () => {
      mockPrisma.userAccount.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'testuser',
        password: 'hashed_testPass123',
        role: 'user',
        active: true,
      });

      const app = createApp();
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'testuser', password: 'wrongPassword' });

      expect(res.status).toBe(401);
    });

    it('A6: should reject deactivated user with 401', async () => {
      mockPrisma.userAccount.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'testuser',
        password: 'hashed_testPass123',
        role: 'user',
        active: false,
      });

      const app = createApp();
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'testuser', password: 'testPass123' });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('deactivated');
    });

    it('A8: should kill other sessions on login', async () => {
      mockPrisma.userAccount.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        username: 'testuser',
        password: 'hashed_testPass123',
        role: 'user',
        active: true,
      });
      mockPrisma.loginLog.create.mockResolvedValue({});
      mockPrisma.$executeRaw.mockResolvedValue([]);

      const app = createApp();
      await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'testuser', password: 'testPass123' });

      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });
  });

  // ─── A9-A11: GET /me ───
  describe('GET /api/v1/auth/me', () => {
    it('A9: should return user with valid session', async () => {
      mockPrisma.userAccount.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        username: 'testuser',
        role: 'user',
        active: true,
      });

      const app = createApp({ userId: 'user-1', username: 'testuser', role: 'user' });
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(200);
      expect(res.body.user.username).toBe('testuser');
    });

    it('A10: should return 401 without session', async () => {
      const app = createApp({});
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
    });

    it('A11: should return 401 for deactivated user', async () => {
      mockPrisma.userAccount.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        username: 'testuser',
        role: 'user',
        active: false,
      });

      const app = createApp({ userId: 'user-1', username: 'testuser', role: 'user' });
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
    });
  });

  // ─── A12: Logout ───
  describe('POST /api/v1/auth/logout', () => {
    it('A12: should logout successfully with valid session', async () => {
      mockPrisma.userAccount.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        username: 'testuser',
        role: 'user',
        active: true,
      });
      mockPrisma.loginLog.create.mockResolvedValue({});

      const app = createApp({ userId: 'user-1', username: 'testuser', role: 'user' });
      const res = await request(app).post('/api/v1/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Logged out');
    });
  });

  // ─── A13-A15: Change Password ───
  describe('POST /api/v1/auth/change-password', () => {
    it('A13: should reject same password with 400', async () => {
      mockPrisma.userAccount.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        username: 'testuser',
        role: 'user',
        active: true,
      });

      const app = createApp({ userId: 'user-1', username: 'testuser', role: 'user' });
      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .send({ currentPassword: 'samePass', newPassword: 'samePass' });

      expect(res.status).toBe(400);
    });

    it('A14: should reject wrong current password with 401', async () => {
      mockPrisma.userAccount.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        username: 'testuser',
        password: 'hashed_correctPass',
        role: 'user',
        active: true,
      });

      const app = createApp({ userId: 'user-1', username: 'testuser', role: 'user' });
      const res = await request(app)
        .post('/api/v1/auth/change-password')
        .send({ currentPassword: 'wrongPass', newPassword: 'newPass123' });

      expect(res.status).toBe(401);
    });
  });

  // ─── A16: Login History ───
  describe('GET /api/v1/auth/login-history', () => {
    it('A16: should return login history for authenticated user', async () => {
      mockPrisma.userAccount.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Test User',
        username: 'testuser',
        role: 'user',
        active: true,
      });
      mockPrisma.loginLog.findMany.mockResolvedValue([
        { id: 'log-1', action: 'login', ipAddress: '127.0.0.1', userAgent: 'test', createdAt: new Date() },
      ]);

      const app = createApp({ userId: 'user-1', username: 'testuser', role: 'user' });
      const res = await request(app).get('/api/v1/auth/login-history');

      expect(res.status).toBe(200);
      expect(res.body.logs).toHaveLength(1);
      expect(res.body.logs[0].action).toBe('login');
    });
  });
});
