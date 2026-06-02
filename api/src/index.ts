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
import { requestLogger } from './middleware/requestLogger';
import { cspMiddleware } from './middleware/csp';
import { migrateLocationsToPostGIS } from './scripts/migratePostGIS';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Ensure uploads directory exists for multer
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Trust proxy — required for correct IP detection behind reverse proxy (affects rate limiting)
app.set('trust proxy', 1);

// CORS configuration - fail-closed if env var missing
const corsOrigin = process.env.CORS_ORIGIN;
if (!corsOrigin) {
  console.warn('WARNING: CORS_ORIGIN not set. Using restrictive default (same-origin only).');
}

const corsOptions: cors.CorsOptions = {
  origin: corsOrigin || false, // false = same-origin only
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Security headers with CSP
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
  console.warn('WARNING: Running in development mode. Session cookies are not secure (secure=false).');
}

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
const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX || '300', 10);
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

// Apply stricter rate limit to login route, then auth routes
app.use('/api/v1/auth/login', loginLimiter);
app.use('/api/v1/auth', authRouter);

// General rate limiter for all other API routes
app.use('/api/v1/', generalLimiter);

// Spatial (PostGIS) routes — must come BEFORE locations/samples to avoid /:id catch-all
app.use('/api/v1', spatialRouter);

// Quality score route - must come before samples due to /:id catch-all
app.use('/api/v1', qualityRouter);

// API routes - export MUST come before samples due to /:id catch-all
app.use('/api/v1/samples', exportRouter);
app.use('/api/v1/samples', samplesRouter);
app.use('/api/v1/locations', locationsRouter);
// Photos router handles: /api/v1/samples/:id/photos, /api/v1/photos/:id, /api/v1/uploads/:filename
app.use('/api/v1', photosRouter);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Migration on startup
migrateLocationsToPostGIS().catch((e) => {
  console.warn('PostGIS location migration failed (non-fatal):', e.message);
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📚 API available at http://localhost:${PORT}/api/v1`);
  console.log(`📖 API Docs at http://localhost:${PORT}/api/docs`);
});

export default app;