import crypto from 'crypto';
import helmet from 'helmet';
import type { Request, Response, NextFunction } from 'express';

function getTileDomains(): string[] {
  const raw = process.env.CSP_TILE_DOMAINS;
  if (raw) {
    return raw.split(',').map((d) => d.trim()).filter(Boolean);
  }
  return ['https://tile.openstreetmap.org', 'https://*.tile.openstreetmap.org'];
}

export function nonceMiddleware(_req: Request, res: Response, next: NextFunction): void {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
}

export function cspMiddleware() {
  const isDev = process.env.NODE_ENV !== 'production';
  const enforceMode = process.env.CSP_ENFORCE_MODE === 'true';

  const connectSrc = ["'self'", 'https://nominatim.openstreetmap.org'];
  if (isDev) {
    connectSrc.push('ws://localhost:5173', 'http://localhost:5173');
  }

  const staticDirectives = {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://fonts.googleapis.com"],
    imgSrc: ["'self'", 'data:', ...getTileDomains()],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    formAction: ["'self'"],
    frameAncestors: ["'self'"],
    baseUri: ["'self'"],
    objectSrc: ["'none'"],
    upgradeInsecureRequests: [],
  };

  // Return a middleware that applies CSP with per-request nonce
  return (req: Request, res: Response, next: NextFunction) => {
    const nonce = res.locals.nonce as string;
    const cspHandler = helmet({
      contentSecurityPolicy: {
        directives: {
          ...staticDirectives,
          connectSrc,
          scriptSrc: ["'self'", `'nonce-${nonce}'`],
        },
        reportOnly: !enforceMode,
      },
    });
    cspHandler(req, res, next);
  };
}
