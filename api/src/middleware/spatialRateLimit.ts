import rateLimit from 'express-rate-limit';

export const spatialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Spatial query rate limit exceeded. Please slow down.' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
