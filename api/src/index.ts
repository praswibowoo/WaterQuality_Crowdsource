import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// Rate limiting disabled for testing
import path from 'path';
import fs from 'fs';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
import pg from 'pg';
import samplesRouter from './routes/samples.js';
import locationsRouter from './routes/locations.js';
import photosRouter from './routes/photos.js';
import exportRouter from './routes/export.js';
import authRouter from './routes/auth.js';
import healthRouter from './routes/health.js';
import docsRouter from './routes/docs.js';
import spatialRouter from './routes/spatial.js';
import qualityRouter from './routes/quality.js';
import usersRouter from './routes/users.js';
import { requestLogger } from './middleware/requestLogger.js';
import helmet from 'helmet';
import { cspMiddleware, nonceMiddleware } from './middleware/csp.js';
import { migrateLocationsToPostGIS } from './scripts/migratePostGIS.js';
import addSessionIndex from './scripts/addSessionIndex.js';
import prisma from './db/prisma.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

// Fail-fast startup validation for required env vars (WQ-193)
const REQUIRED_ENV_VARS = ['DATABASE_URL', 'SESSION_SECRET', 'ADMIN_PASSWORD'];
for (const varName of REQUIRED_ENV_VARS) {
  if (!process.env[varName]) {
    console.error(`FATAL: Environment variable ${varName} is required.`);
    process.exit(1);
  }
}

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Ensure uploads directory exists for multer
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Trust proxy — required for correct IP behind reverse proxy (rate limiting, logs)
// Set TRUST_PROXY=true only when deploying behind nginx/Cloudflare/AWS ALB
const trustProxyEnabled = process.env.TRUST_PROXY === 'true';
if (trustProxyEnabled) {
  app.set('trust proxy', 1);
} else if (process.env.NODE_ENV === 'production') {
  console.warn('WARNING: TRUST_PROXY is not set to "true". LoginLog.ipAddress will show the raw socket peer instead of the real client IP behind the reverse proxy. Set TRUST_PROXY=true in production.');
  if (process.env.CSP_ENFORCE_MODE !== 'true') {
    console.warn('WARNING: CSP_ENFORCE_MODE is not "true". CSP is in report-only mode — violations are logged but NOT blocked. Set CSP_ENFORCE_MODE=true in production.');
  }
}

// CORS configuration - fail-closed if env var missing
const corsOrigin = process.env.CORS_ORIGIN;
if (!corsOrigin) {
  console.warn('WARNING: CORS_ORIGIN not set. Using restrictive default (same-origin only).');
}

const corsOptions: cors.CorsOptions = {
  origin: corsOrigin || false, // false = same-origin only
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
};

// Nonce generation for CSP
app.use(nonceMiddleware);

// Full security headers: HSTS, X-Frame-Options, X-Content-Type-Options, etc.
// CSP is handled separately below with nonce support for Swagger UI
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// Security headers with CSP (includes nonce-based script-src)
app.use(cspMiddleware());

// CORS configuration
app.use(cors(corsOptions));

// Session configuration
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is required');
}

const pgPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const PgStore = pgSession(session);

app.use(
  session({
    store: new PgStore({
      pool: pgPool,
      tableName: 'session',
      createTableIfMissing: true,
    }),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    name: 'wq.sid',
    cookie: {
      secure: 'auto',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

if (process.env.NODE_ENV !== 'production') {
  console.log('INFO: Running in development mode. Session cookies are not secure (secure=false).');
}

// Request timeout middleware (WQ-194)
const requestTimeout = (ms: number) => {
  return (_req: express.Request, res: express.Response, next: express.NextFunction) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
            error: 'Request Timeout',
            message: `Request exceeded ${ms}ms timeout`,
          });
      }
    }, ms);
    res.on('finish', () => clearTimeout(timer));
    next();
  };
};

// Apply timeout: 30s default (general must come BEFORE route-specific timeouts)
app.use(requestTimeout(30000));

// Spatial route-specific timeouts override the general 30s with 60s
app.use('/api/v1/locations/nearby', requestTimeout(60000));
app.use('/api/v1/samples/nearby', requestTimeout(60000));

// Request body size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Structured request logging
app.use(requestLogger);

// Enhanced health check with PostGIS
app.use('/health', healthRouter);

// API documentation (Swagger UI)
app.use('/api/docs', docsRouter);

// Rate limiters disabled for testing
app.use('/api/v1/auth', authRouter);

// Spatial (PostGIS) routes — must come BEFORE locations/samples to avoid /:id catch-all
// NOTE: Response format inconsistency exists.
// spatial.ts and quality.ts use responseEnvelope middleware → { success, data } format.
// All other routes return plain JSON directly (e.g., samples, auth, users, photos, export).
// Future migration: apply responseEnvelope consistently across all routes.
app.use('/api/v1', spatialRouter);

// Quality score route - must come before samples due to /:id catch-all
app.use('/api/v1', qualityRouter);

// Photos router MUST come before samples due to /:id catch-all
// Handles: /api/v1/uploads/:filename, /api/v1/samples/:id/photos, /api/v1/photos/:id
app.use('/api/v1', photosRouter);

// API routes - export MUST come before samples due to /:id catch-all
app.use('/api/v1/samples', exportRouter);
app.use('/api/v1/samples', samplesRouter);
app.use('/api/v1/locations', locationsRouter);

// User management (admin only)
app.use('/api/v1/users', usersRouter);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Verify all critical tables + PostGIS exist before accepting requests (fail-fast)
async function verifyMigrations(): Promise<void> {
  const requiredTables = ['UserAccount', 'Sample', 'Photo', 'Location', 'LoginLog', 'PasswordResetRequest'];
  for (const table of requiredTables) {
    try {
      await prisma.$queryRawUnsafe(`SELECT 1 FROM "${table}" LIMIT 1`);
    } catch (err) {
      console.error(`FATAL: Required table "${table}" is missing or inaccessible.`);
      console.error(`Run: npx prisma migrate deploy`);
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  }
  // Verify PostGIS extension is installed (needed for spatial queries)
  try {
    await prisma.$queryRawUnsafe(`SELECT PostGIS_Version()`);
  } catch (err) {
    console.error('FATAL: PostGIS extension is not installed or inaccessible.');
    console.error('Run: CREATE EXTENSION IF NOT EXISTS postgis;');
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
  console.log('✓ Database schema verified (all required tables + PostGIS present)');
}

// Graceful shutdown — close Prisma connections
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// Start server after verifying schema
async function start(): Promise<void> {
  // H1+M1+M2: Verify schema FIRST, before other startup sweeps
  await verifyMigrations();

  // Run startup sweeps (safe — we know tables exist)
  migrateLocationsToPostGIS().catch((e) => {
    console.warn('PostGIS location migration failed (non-fatal):', e.message);
  });

  addSessionIndex().catch((e) => {
    console.warn('Session index creation failed (non-fatal):', e.message);
  });

  // WQ-196v2: Expire stale password reset requests
  // Lazy import to avoid circular dependency at module level
  const { expireStaleResetRequests } = await import('./services/resetRequestExpiry.js');
  expireStaleResetRequests().catch((e: Error) => {
    console.warn('Reset request expiry sweep failed (non-fatal):', e.message);
  });

  app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📚 API available at http://localhost:${PORT}/api/v1`);
    console.log(`📖 API Docs at http://localhost:${PORT}/api/docs`);
  });
}

start().catch((e) => {
  console.error('FATAL: Server startup failed:', e instanceof Error ? e.message : String(e));
  process.exit(1);
});

export default app;