import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
import pg from 'pg';
import samplesRouter from './routes/samples';
import locationsRouter from './routes/locations';
import photosRouter from './routes/photos';
import exportRouter from './routes/export';
import authRouter from './routes/auth';
import healthRouter from './routes/health';
import docsRouter from './routes/docs';
import spatialRouter from './routes/spatial';
import qualityRouter from './routes/quality';
import usersRouter from './routes/users';
import { requestLogger } from './middleware/requestLogger';
import helmet from 'helmet';
import { cspMiddleware, nonceMiddleware } from './middleware/csp';
import { migrateLocationsToPostGIS } from './scripts/migratePostGIS';
import addSessionIndex from './scripts/addSessionIndex';
import prisma from './db/prisma';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

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
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'strict',
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

// General API rate limiter: configurable via RATE_LIMIT_MAX env var (default: 300)
const rateLimitMax = Math.max(1, parseInt(process.env.RATE_LIMIT_MAX || '300', 10) || 300);
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: rateLimitMax,
  message: {
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Login rate limiter: 5 attempts per 15 minutes (stricter)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: 'Too Many Requests',
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Registration rate limiter: 5 registrations per 15 minutes per IP
const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: 'Too Many Requests',
    message: 'Too many registration attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply stricter rate limit to login route, then auth routes
app.use('/api/v1/auth/login', loginLimiter);
app.use('/api/v1/auth/register', registrationLimiter);
app.use('/api/v1/auth', authRouter);

// General rate limiter for all other API routes
app.use('/api/v1/', generalLimiter);

// Spatial (PostGIS) routes — must come BEFORE locations/samples to avoid /:id catch-all
// NOTE: Response format inconsistency exists.
// spatial.ts and quality.ts use responseEnvelope middleware → { success, data } format.
// All other routes return plain JSON directly (e.g., samples, auth, users, photos, export).
// Future migration: apply responseEnvelope consistently across all routes.
app.use('/api/v1', spatialRouter);

// Quality score route - must come before samples due to /:id catch-all
app.use('/api/v1', qualityRouter);

// API routes - export MUST come before samples due to /:id catch-all
app.use('/api/v1/samples', exportRouter);
app.use('/api/v1/samples', samplesRouter);
app.use('/api/v1/locations', locationsRouter);
// Photos router handles: /api/v1/samples/:id/photos, /api/v1/photos/:id, /api/v1/uploads/:filename
app.use('/api/v1', photosRouter);

// User management (admin only)
app.use('/api/v1/users', usersRouter);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Migration on startup
migrateLocationsToPostGIS().catch((e) => {
  console.warn('PostGIS location migration failed (non-fatal):', e.message);
});

// Create session userId index for efficient killOtherSessions queries
addSessionIndex().catch((e) => {
  console.warn('Session index creation failed (non-fatal):', e.message);
});

// Expire stale password reset requests on startup (WQ-196v2)
import { expireStaleResetRequests } from './services/resetRequestExpiry';
expireStaleResetRequests().catch((e) => {
  console.warn('Reset request expiry sweep failed (non-fatal):', e.message);
});

// Verify all critical tables exist before accepting requests (fail-fast)
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
  console.log('✓ Database schema verified (all required tables present)');
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

// Verify schema before accepting requests
verifyMigrations().catch(() => process.exit(1));

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📚 API available at http://localhost:${PORT}/api/v1`);
  console.log(`📖 API Docs at http://localhost:${PORT}/api/docs`);
});

export default app;