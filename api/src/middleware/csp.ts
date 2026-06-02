import helmet from 'helmet';

function getTileDomains(): string[] {
  const raw = process.env.CSP_TILE_DOMAINS;
  if (raw) {
    return raw.split(',').map((d) => d.trim()).filter(Boolean);
  }
  return ['https://tile.openstreetmap.org', 'https://*.tile.openstreetmap.org'];
}

export function cspMiddleware() {
  const isDev = process.env.NODE_ENV !== 'production';
  const enforceMode = process.env.CSP_ENFORCE_MODE === 'true';

  const connectSrc = ["'self'", 'https://nominatim.openstreetmap.org'];
  if (isDev) {
    connectSrc.push('ws://localhost:5173', 'http://localhost:5173');
  }

  const directives = {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://fonts.googleapis.com"],
    imgSrc: ["'self'", 'data:', ...getTileDomains()],
    connectSrc,
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    formAction: ["'self'"],
    frameAncestors: ["'self'"],
    baseUri: ["'self'"],
    objectSrc: ["'none'"],
    upgradeInsecureRequests: [],
  };

  return helmet({
    contentSecurityPolicy: {
      directives,
      reportOnly: !enforceMode,
    },
  });
}
