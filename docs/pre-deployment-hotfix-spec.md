# Pre-Deployment Security & Production Readiness Hotfix Spec
## Water Quality Crowdsource — Hotfix v1.1.1 (WQ-111 to WQ-121)

> **Status**: ✅ Done — All phases complete  
> **Spec Owner**: Lead Manager  
> **Target Milestone**: Hotfix v1.1.1 — Pre-Deployment  
> **Last Updated**: 2026-06-02

---

## Table of Contents

1. [Audit Summary](#1-audit-summary)
2. [Phase A: Critical Security Blockers](#2-phase-a-critical-security-blockers)
3. [Phase B: Auth & Security Hardening](#3-phase-b-auth--security-hardening)
4. [Implementation Order & Task List](#4-implementation-order--task-list)
5. [Exit Criteria](#5-exit-criteria)

---

## 1. Audit Summary

A comprehensive security and production-readiness audit was performed on 2026-06-02. Key findings:

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 5 | All addressed in this hotfix |
| HIGH | 6 | All addressed in this hotfix |
| MEDIUM | 9 | Deferred to post-launch |
| POSITIVE | 11 | No action needed |

**Top 5 blockers for deployment:**
1. Trust proxy not configured — rate limiting ineffective behind reverse proxy
2. No `prisma generate` in build — fresh deploys crash
3. CSP blocks Leaflet CSS and Google Fonts — styling breaks in enforce mode
4. Hardcoded admin password in seed script
5. Weak session secret fallback in source code

---

## 2. Phase A: Critical Security Blockers

### WQ-111: Trust Proxy Configuration ✅ Done

**File:** `api/src/index.ts`

**Change:** Added `app.set('trust proxy', 1)` after `const app = express();`

---

### WQ-112: Fix API Build Script ✅ Done

**File:** `api/package.json`

**Change:** `"build": "npx prisma generate && tsc"`

---

### WQ-113: CSP External Stylesheet Domains ✅ Done

**File:** `api/src/middleware/csp.ts`

**Change:** Added `https://unpkg.com`, `https://fonts.googleapis.com` to `styleSrc` and `https://fonts.gstatic.com` to `fontSrc`.

---

### WQ-114: Seed Script + Change Password + Session Management ✅ Done

**Files:** `prisma/seed.ts`, `api/src/routes/auth.ts`, `api/src/validators/schemas.ts`, `web/src/contexts/AuthContext.tsx`, `web/src/components/AdminDashboard.tsx`, `prisma/schema.prisma`

**Implemented:**
- Seed script reads `ADMIN_PASSWORD` from env, fails if not set, enforces min 8 chars
- `POST /auth/change-password` endpoint with current password verification + bcrypt hash
- `LoginLog` model (userId, action, ipAddress, userAgent, createdAt)
- Single session enforcement: `killOtherSessions()` deletes other sessions via PostgreSQL JSON query on login + password change
- Login/logout/password_change audit logging
- `AuthContext` gains `changePassword()` and `getLoginHistory()` methods
- AdminDashboard: expandable "Change Password" form + "Login History" panel
- `bcrypt.compare` (async) replaces `compareSync`
- Login password field has `.max(128)` validation

---

### WQ-115: Session Secret Fail-Closed ✅ Done

**File:** `api/src/index.ts`

**Change:** Removed fallback string and conditional check. `SESSION_SECRET` must be set or server crashes immediately.

---

## 3. Phase B: Auth & Security Hardening

### WQ-116: Async bcrypt.compare ✅ Done

**File:** `api/src/routes/auth.ts`

**Status:** Completed as part of WQ-114 implementation. All `bcrypt.compareSync` replaced with async `bcrypt.compare`.

---

### WQ-117: Auth Middleware Role Default (Fail Closed) ✅ Done

**File:** `api/src/middleware/auth.ts` (line 20)

**Current code:**
```typescript
role: req.session.role || 'admin',
```

**Problem:** If `req.session.role` is `undefined` (corrupted session, manual DB edit, migration issue), the user is implicitly granted `admin` privileges. This is fail-open behavior — a missing field escalates to admin access.

**Fix:**
```typescript
export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.session.userId) {
    res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    return;
  }

  if (!req.session.role) {
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid session: missing role' });
    return;
  }

  (req as AuthenticatedRequest).auth = {
    userId: req.session.userId,
    username: req.session.username || '',
    role: req.session.role,
  };

  next();
};
```

**Validation:** Send a request with a valid session but missing `role` field → should get 401, not 200 with admin access.

---

### WQ-118: Login Password Max Length ✅ Done

**File:** `api/src/validators/schemas.ts`

**Status:** Completed as part of WQ-114. Both `loginSchema.password` and `changePasswordSchema.currentPassword` have `.max(128)`.

---

### WQ-119: Health Endpoint Sanitize (Remove PostGIS Version Leak) ✅ Done

**File:** `api/src/routes/health.ts` (lines 16-23)

**Current code:**
```typescript
try {
  const result = await prisma.$queryRaw<Array<{ postgis_version: string }>>`
    SELECT PostGIS_Version() as postgis_version
  `;
  checks.postgis = result[0]?.postgis_version || 'unknown';
} catch {
  checks.postgis = 'not available';
}
```

**Problem:** Returns `"3.6 USE_DEVELOPMENT=0"` (exact PostGIS version) to unauthenticated users. This information disclosure helps attackers identify specific vulnerabilities in the database software.

**Fix:**
```typescript
try {
  await prisma.$queryRaw`SELECT PostGIS_Version()`;
  checks.postgis = 'up';
} catch {
  checks.postgis = 'down';
}
```

**Validation:** `curl localhost:3001/health` → `"postgis": "up"` (not version string).

---

### WQ-120: Remove Duplicate Upload Serving ✅ Done

**File:** `api/src/index.ts` (line 96)

**Current code (two routes serve the same files):**
1. `app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));` — index.ts:96
2. `router.get('/uploads/:filename', ...)` — photos.ts:40 (with path traversal protection)

**Problem:** The `express.static` route at index.ts:96 serves files **without** the explicit path traversal checks that the photos router has (line 44-48 in photos.ts). Two different security postures for the same files.

**Fix:** Remove line 96 from `index.ts`:
```typescript
// REMOVE this line:
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
```

The photos router's `/uploads/:filename` endpoint handles all file serving with proper security checks:
- Rejects `/`, `\`, `..` in filename (line 44)
- Uses `path.basename` as additional safety (line 52)
- Validates resolved path stays within uploads dir (line 57)

**Validation:** `grep -n "uploads" api/src/index.ts` should only show `express.static` for the main static assets, not for `/uploads`.

---

### WQ-121: Ensure uploads/ Directory Exists at Startup ✅ Done

**File:** `api/src/index.ts` (near top, after imports)

**Problem:** If `uploads/` doesn't exist on a fresh deployment, `multer` throws `ENOENT` when trying to save uploaded files. The error message is unhelpful and doesn't indicate the fix.

**Fix:** Add `fs` import and directory creation near the top of `index.ts`, after imports and before middleware:
```typescript
import fs from 'fs';

// After imports, before any middleware:
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
```

**Insert location:** After `const PORT = process.env.PORT || 3001;` (line 27), before the CORS configuration.

**Validation:**
1. `rm -rf uploads/` then start server → directory should be recreated
2. Upload a photo → should succeed
3. `ls -la uploads/` → directory exists with correct permissions

---

## 4. Implementation Order & Task List

| # | Task | File(s) | Est. Time | Status |
|---|------|---------|-----------|--------|
| 1 | WQ-111: Add trust proxy | `api/src/index.ts` | 5 min | ✅ Done |
| 2 | WQ-112: Fix build script | `api/package.json` | 5 min | ✅ Done |
| 3 | WQ-113: CSP external domains | `api/src/middleware/csp.ts` | 10 min | ✅ Done |
| 4 | WQ-114: Seed password + change password + sessions + login history | Multiple | 2 hrs | ✅ Done |
| 5 | WQ-115: Session secret fail-closed | `api/src/index.ts` | 10 min | ✅ Done |
| 6 | WQ-116: Async bcrypt.compare | `api/src/routes/auth.ts` | 10 min | ✅ Done |
| 7 | WQ-117: Auth role fail-closed | `api/src/middleware/auth.ts` | 10 min | ✅ Done |
| 8 | WQ-118: Password max length | `api/src/validators/schemas.ts` | 5 min | ✅ Done |
| 9 | WQ-119: Health endpoint sanitize | `api/src/routes/health.ts` | 10 min | ✅ Done |
| 10 | WQ-120: Remove duplicate uploads | `api/src/index.ts` | 5 min | ✅ Done |
| 11 | WQ-121: Ensure uploads dir | `api/src/index.ts` | 5 min | ✅ Done |
| 12 | Full regression | All | 1 hr | ✅ Done |

**Total estimated effort:** ~2 hours

---

## 5. Exit Criteria

| # | Criteria | Validation | Status |
|---|----------|------------|--------|
| 1 | `app.set('trust proxy', 1)` active | Code review | ✅ Done |
| 2 | `api/package.json` build runs `prisma generate` before `tsc` | `npm run build` in api/ | ✅ Done |
| 3 | CSP allows `unpkg.com` and `fonts.googleapis.com` | `curl -I` + browser console check | ✅ Done |
| 4 | Seed script fails without `ADMIN_PASSWORD` env | Run seed without env var | ✅ Done |
| 5 | Missing `SESSION_SECRET` crashes server on start | Remove var, run `npm run dev` | ✅ Done |
| 6 | `bcrypt.compare` (async) used in login | Code review | ✅ Done |
| 7 | Auth middleware rejects requests without role | Send request with valid session but missing role | ✅ Done |
| 8 | Login rejects password >128 chars | Send 200-char password | ✅ Done |
| 9 | Health endpoint returns `"up"` not version string | `curl localhost:3001/health` | ✅ Done |
| 10 | No duplicate `/uploads` static route | `grep -r "uploads" api/src/index.ts` | ✅ Done |
| 11 | `uploads/` created on startup | Delete dir, restart server | ✅ Done |
| 12 | `npm run lint && npm run typecheck` pass | CI/CD | ✅ Done |

---

*End of Spec*
