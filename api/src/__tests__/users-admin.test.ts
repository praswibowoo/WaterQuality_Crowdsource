import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { errorHandler, notFoundHandler } from '../middleware/errorHandler';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';
const TEST_ADMIN_ID = '00000000-0000-0000-0000-000000000002';
const TEST_TARGET_ID = '00000000-0000-0000-0000-000000000003';

const mockPrisma = {
  userAccount: {
    findMany: jest.fn<any>(),
    findUnique: jest.fn<any>(),
    create: jest.fn<any>(),
    update: jest.fn<any>(),
    count: jest.fn<any>(),
  },
  loginLog: {
    create: jest.fn<any>(),
  },
  $executeRaw: jest.fn<any>(),
  $transaction: jest.fn<any>().mockImplementation(async (fn: any) => fn(mockPrisma)),
};

jest.mock('../db/prisma', () => ({
  __esModule: true,
  default: mockPrisma,
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockImplementation((pw: unknown) => Promise.resolve(`hashed_${String(pw)}`)),
  compare: jest.fn().mockImplementation((pw: unknown, hash: unknown) => Promise.resolve(String(hash) === `hashed_${String(pw)}`)),
}));

let usersRouter: express.Router;

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
  app.use('/api/v1/users', usersRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

beforeEach(async () => {
  jest.clearAllMocks();
  usersRouter = (await import('../routes/users')).default;
});

describe('Users Admin API — (UA1-UA8)', () => {
  it('UA4: GET / returns paginated users for admin', async () => {
    mockPrisma.userAccount.findUnique.mockResolvedValue(
      { id: TEST_ADMIN_ID, username: 'admin', role: 'admin', active: true }
    );
    mockPrisma.userAccount.findMany.mockResolvedValue([
      { id: TEST_USER_ID, name: 'Test User', username: 'testuser', role: 'user', active: true, createdAt: new Date(), _count: { samples: 0, loginLogs: 0 } },
    ]);
    mockPrisma.userAccount.count.mockResolvedValue(1);

    const app = createApp({ userId: TEST_ADMIN_ID, username: 'admin', role: 'admin' });
    const res = await request(app).get('/api/v1/users');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.totalCount).toBe(1);
    expect(res.body.nextCursor).toBeNull();
  });

  it('UA5: GET / returns 403 for non-admin', async () => {
    mockPrisma.userAccount.findUnique.mockResolvedValue(
      { id: TEST_USER_ID, username: 'testuser', role: 'user', active: true }
    );

    const app = createApp({ userId: TEST_USER_ID, username: 'testuser', role: 'user' });
    const res = await request(app).get('/api/v1/users');

    expect(res.status).toBe(403);
  });

  it('UA6: POST / creates user with temp password when no password given', async () => {
    mockPrisma.userAccount.findUnique
      .mockResolvedValueOnce({ id: TEST_ADMIN_ID, username: 'admin', role: 'admin', active: true }) // admin check
      .mockResolvedValueOnce(null); // unique username check
    mockPrisma.userAccount.create.mockResolvedValue({
      id: 'new-user-id',
      name: 'New User',
      username: 'newuser',
      role: 'user',
      active: true,
      createdAt: new Date(),
    });

    const app = createApp({ userId: TEST_ADMIN_ID, username: 'admin', role: 'admin' });
    const res = await request(app)
      .post('/api/v1/users')
      .send({ name: 'New User', username: 'newuser' });

    expect(res.status).toBe(201);
    expect(res.body.tempPassword).toBeDefined();
  });

  it('UA7: POST / returns user without tempPassword when password is provided', async () => {
    mockPrisma.userAccount.findUnique
      .mockResolvedValueOnce({ id: TEST_ADMIN_ID, username: 'admin', role: 'admin', active: true })
      .mockResolvedValueOnce(null);
    mockPrisma.userAccount.create.mockResolvedValue({
      id: 'new-user-id',
      name: 'New User',
      username: 'newuser',
      role: 'user',
      active: true,
      createdAt: new Date(),
    });

    const app = createApp({ userId: TEST_ADMIN_ID, username: 'admin', role: 'admin' });
    const res = await request(app)
      .post('/api/v1/users')
      .send({ name: 'New User', username: 'newuser', password: 'myPass123' });

    expect(res.status).toBe(201);
    expect(res.body.tempPassword).toBeUndefined();
  });

  it('UA8: POST / returns 409 for duplicate username', async () => {
    mockPrisma.userAccount.findUnique
      .mockResolvedValueOnce({ id: TEST_ADMIN_ID, username: 'admin', role: 'admin', active: true })
      .mockResolvedValueOnce({ id: 'existing', username: 'newuser' });

    const app = createApp({ userId: TEST_ADMIN_ID, username: 'admin', role: 'admin' });
    const res = await request(app)
      .post('/api/v1/users')
      .send({ name: 'New User', username: 'newuser' });

    expect(res.status).toBe(409);
  });

  it('UA1: PUT /:id deactivation kills sessions', async () => {
    mockPrisma.userAccount.findUnique
      .mockResolvedValueOnce({ id: TEST_ADMIN_ID, username: 'admin', role: 'admin', active: true })
      .mockResolvedValueOnce({ id: TEST_TARGET_ID, name: 'Target', username: 'target', role: 'user', active: true });
    mockPrisma.userAccount.update.mockResolvedValue({
      id: TEST_TARGET_ID, name: 'Target', username: 'target', role: 'user', active: false,
    });

    const app = createApp({ userId: TEST_ADMIN_ID, username: 'admin', role: 'admin' });
    await request(app)
      .put(`/api/v1/users/${TEST_TARGET_ID}`)
      .send({ active: false });

    expect(mockPrisma.$executeRaw).toHaveBeenCalled();
  });

  it('UA3: PUT /:id self-deactivation returns 400', async () => {
    mockPrisma.userAccount.findUnique
      .mockResolvedValueOnce({ id: TEST_ADMIN_ID, username: 'admin', role: 'admin', active: true })
      .mockResolvedValueOnce({ id: TEST_ADMIN_ID, name: 'Admin', username: 'admin', role: 'admin', active: true });

    const app = createApp({ userId: TEST_ADMIN_ID, username: 'admin', role: 'admin' });
    const res = await request(app)
      .put('/api/v1/users')
      .send({ active: false });

    expect(res.status).toBe(404);
  });

  it('UA2: PUT /:id/reset-password creates audit log', async () => {
    mockPrisma.userAccount.findUnique
      .mockResolvedValueOnce({ id: TEST_ADMIN_ID, username: 'admin', role: 'admin', active: true })
      .mockResolvedValueOnce({ id: TEST_TARGET_ID, name: 'Target', username: 'target', role: 'user', active: true });
    mockPrisma.userAccount.update.mockResolvedValue({});
    mockPrisma.$executeRaw.mockResolvedValue([]);
    mockPrisma.loginLog.create.mockResolvedValue({});

    const app = createApp({ userId: TEST_ADMIN_ID, username: 'admin', role: 'admin' });
    const res = await request(app)
      .put(`/api/v1/users/${TEST_TARGET_ID}/reset-password`)
      .send({ newPassword: 'newPass123' });

    expect(res.status).toBe(200);
    expect(mockPrisma.loginLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'password_change', userId: TEST_TARGET_ID }),
      })
    );
  });
});
