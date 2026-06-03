import express, { Express, Request, Response, NextFunction } from 'express';
import { errorHandler, notFoundHandler } from '../../middleware/errorHandler';

// UUID for test users
export const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';
export const TEST_ADMIN_ID = '00000000-0000-0000-0000-000000000002';
export const TEST_USERNAME = 'testuser';
export const TEST_PASSWORD = 'testPass123';
export const TEST_ADMIN_USERNAME = 'admin';

export interface MockSession {
  userId?: string;
  username?: string;
  role?: string;
  regenerate: (cb: (err?: Error) => void) => void;
  destroy: (cb: (err?: Error) => void) => void;
  cookie?: Record<string, unknown>;
}

// Mock session middleware factory
export function mockSession(sessionData?: Partial<MockSession>): (req: Request, _res: Response, next: NextFunction) => void {
  return (req: Request, _res: Response, next: NextFunction) => {
    (req as any).sessionID = 'test-session-id';
    (req as any).session = {
      userId: sessionData?.userId || undefined,
      username: sessionData?.username || undefined,
      role: sessionData?.role || undefined,
      regenerate: (cb: (err?: Error) => void) => cb(),
      destroy: (cb: (err?: Error) => void) => cb(),
      cookie: { maxAge: 86400000 },
    } as MockSession;
    next();
  };
}

// Mock authenticated admin session
export function adminSession(): ReturnType<typeof mockSession> {
  return mockSession({
    userId: TEST_ADMIN_ID,
    username: TEST_ADMIN_USERNAME,
    role: 'admin',
  });
}

// Mock authenticated user session
export function userSession(): ReturnType<typeof mockSession> {
  return mockSession({
    userId: TEST_USER_ID,
    username: TEST_USERNAME,
    role: 'user',
  });
}

// Create a minimal test Express app with a router and optional session middleware
export function createTestApp(
  router: express.Router,
  sessionMiddleware?: ReturnType<typeof mockSession>
): Express {
  const app = express();
  app.use(express.json());
  if (sessionMiddleware) {
    app.use(sessionMiddleware);
  }
  app.use(router);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

// Mock Prisma response builder helpers
export function mockUserAccount(overrides?: Record<string, unknown>) {
  return {
    id: TEST_USER_ID,
    name: 'Test User',
    username: TEST_USERNAME,
    password: `hashed_${TEST_PASSWORD}`,
    role: 'user',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function mockAdminAccount(overrides?: Record<string, unknown>) {
  return mockUserAccount({
    id: TEST_ADMIN_ID,
    name: 'Admin User',
    username: TEST_ADMIN_USERNAME,
    role: 'admin',
    ...overrides,
  });
}

export function mockSample(overrides?: Record<string, unknown>) {
  return {
    id: 'sample-1111-1111-1111-111111111111',
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
    locationId: 'loc-1111-1111-1111-111111111111',
    location: {
      id: 'loc-1111-1111-1111-111111111111',
      latitude: -7.3059612,
      longitude: 112.8443053,
      address: 'Test address',
    },
    photos: [],
    ...overrides,
  };
}
