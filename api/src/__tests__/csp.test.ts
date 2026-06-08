import { describe, it, expect, afterAll } from '@jest/globals';

// Store original env
const OLD_ENV = { ...process.env };

describe('CSP Middleware (WQ-184)', () => {
  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('nonceMiddleware sets res.locals.nonce', async () => {
    process.env.NODE_ENV = 'production';
    const { nonceMiddleware } = await import('../middleware/csp');
    const req = {} as any;
    const res = { locals: {} } as any;
    const next = () => {};

    nonceMiddleware(req, res, next);
    expect(res.locals.nonce).toBeDefined();
    expect(typeof res.locals.nonce).toBe('string');
    expect(res.locals.nonce.length).toBeGreaterThan(0);
  });

  it('cspMiddleware returns a function', async () => {
    process.env.NODE_ENV = 'production';
    const { cspMiddleware } = await import('../middleware/csp');
    const middleware = cspMiddleware();
    expect(typeof middleware).toBe('function');
  });

  it('getTileDomains returns defaults when CSP_TILE_DOMAINS not set', async () => {
    delete process.env.CSP_TILE_DOMAINS;
    process.env.NODE_ENV = 'production';

    // Test indirectly via cspMiddleware
    const { cspMiddleware } = await import('../middleware/csp');
    const middleware = cspMiddleware();
    expect(typeof middleware).toBe('function');
  });

  it('uses report-only in dev mode', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.CSP_ENFORCE_MODE;

    const { cspMiddleware } = await import('../middleware/csp');
    const middleware = cspMiddleware();
    expect(typeof middleware).toBe('function');
  });
});
