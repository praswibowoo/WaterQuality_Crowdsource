# Deployment Tutorial — Water Quality Crowdsource

> **⚠️ TEMPORARY SPEC — Delete after implementation is ✅ Done and QC has verified.**

## Prerequisites

- **Node.js** ≥ 18, **npm** ≥ 9
- **PostgreSQL** ≥ 14 with **PostGIS** extension
- **Docker** (optional, for containerized deployment)
- **Git**

---

## Option A: Docker Compose (Recommended)

This is the fastest way to get a running instance.

### 1. Clone and configure

```bash
git clone https://github.com/praswibowoo/WaterQuality_Crowdsource.git
cd WaterQuality_Crowdsource
```

### 2. Create environment file

```bash
cp api/.env.example api/.env
```

Edit `api/.env` with your production values:

```env
DATABASE_URL=postgresql://postgres:your-strong-password@db:5432/waterquality
SESSION_SECRET=$(openssl rand -hex 32)
ADMIN_PASSWORD=$(openssl rand -base64 16)
PORT=3001
CORS_ORIGIN=https://your-domain.com
NODE_ENV=production
TRUST_PROXY=true
CSP_ENFORCE_MODE=true
```

### 3. Start with Docker Compose

```bash
docker-compose up -d
```

Services started:
- **db** (PostGIS 16) — port 5432
- **api** (Node.js) — port 3001
- **web** (nginx) — port 80

### 4. Run database migrations

```bash
docker-compose exec api npx prisma migrate deploy
docker-compose exec api npx prisma db seed
```

### 5. Verify

```bash
curl http://localhost/health
# Expected: {"status":"ok","checks":{"database":"up","postgis":"up","sessions":"up"}}
```

### 6. Access

- App: `http://localhost`
- API: `http://localhost:3001/api/v1`
- Docs: `http://localhost:3001/api/docs`
- Admin: `http://localhost/admin`

---

## Option B: Bare Metal (Systemd)

For servers without Docker.

### 1. Install dependencies

```bash
# Install Node.js 20 (via nvm or nodesource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL + PostGIS
sudo apt-get install -y postgresql postgresql-contrib postgis
```

### 2. Set up database

```bash
sudo -u postgres psql -c "CREATE DATABASE waterquality;"
sudo -u postgres psql -d waterquality -c "CREATE EXTENSION IF NOT EXISTS postgis;"
sudo -u postgres psql -c "CREATE USER water WITH PASSWORD 'your-password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE waterquality TO water;"
```

### 3. Install and configure app

```bash
cd /opt
git clone https://github.com/praswibowoo/WaterQuality_Crowdsource.git
cd WaterQuality_Crowdsource
npm install
cd api && npm install && cd ..
cd web && npm install && npm run build && cd ..
```

Create `/opt/WaterQuality_Crowdsource/api/.env`:

```env
DATABASE_URL=postgresql://water:your-password@localhost:5432/waterquality
SESSION_SECRET=$(openssl rand -hex 32)
ADMIN_PASSWORD=$(openssl rand -base64 16)
PORT=3001
CORS_ORIGIN=https://your-domain.com
NODE_ENV=production
TRUST_PROXY=true
CSP_ENFORCE_MODE=true
```

### 4. Run migrations

```bash
cd api && npx prisma migrate deploy && npx prisma generate && cd ..
cd prisma && npx prisma db seed && cd ..
```

### 5. Build and start

```bash
# Build API
cd api && npm run build && cd ..

# Start API (production)
cd api && NODE_ENV=production node dist/index.js &

# Serve frontend with nginx (or your preferred static server)
# Point nginx root to /opt/WaterQuality_Crowdsource/web/dist
# Proxy /api/* to http://localhost:3001
```

### 6. Create systemd service (optional)

```ini
# /etc/systemd/system/water-quality-api.service
[Unit]
Description=Water Quality Crowdsource API
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/WaterQuality_Crowdsource/api
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

---

## Security Hardening Checklist

Before going live:

| # | Item | Command/Action |
|---|------|----------------|
| 1 | Strong secrets | `openssl rand -hex 32` for SESSION_SECRET |
| 2 | Strong admin password | `openssl rand -base64 16` for ADMIN_PASSWORD |
| 3 | Trust proxy | Set `TRUST_PROXY=true` in .env |
| 4 | CSP enforcement | Set `CSP_ENFORCE_MODE=true` in .env |
| 5 | HTTPS | Use a reverse proxy (nginx, Cloudflare) with TLS termination |
| 6 | CORS | Set `CORS_ORIGIN=https://your-domain.com` |
| 7 | Database credentials | Use strong passwords, not default |
| 8 | Rate limiting | Verify limits in production (default: 300/15min general) |
| 9 | File permissions | Ensure `uploads/` directory is not world-writable |
| 10 | Regular backups | Schedule `pg_dump` for PostgreSQL |

---

## Health Check

The `/health` endpoint verifies all critical services:

```bash
curl http://localhost:3001/health
```

```json
{
  "status": "ok",
  "timestamp": "2026-06-13T...",
  "checks": {
    "database": "up",
    "postgis": "up",
    "sessions": "up"
  }
}
```

The server **fails fast** on startup if any required table is missing or PostGIS is not installed.

---

## Database Backup & Restore

### Backup

```bash
pg_dump -U water -d waterquality -F c -f backup-$(date +%Y%m%d).dump
```

### Restore

```bash
pg_restore -U water -d waterquality -c backup-20260613.dump
```

### Reset (dev only)

```bash
cd prisma && npx prisma migrate reset && cd ..
```

---

## Updating the App

```bash
cd /opt/WaterQuality-Crowdsource
git pull origin main

# Install any new dependencies
npm install
cd api && npm install && cd ..
cd web && npm install && cd ..

# Run any pending migrations
cd api && npx prisma migrate deploy && npx prisma generate && cd ..

# Rebuild frontend
cd web && npm run build && cd ..

# Restart API
systemctl restart water-quality-api
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `"Cannot find module '@prisma/client'"` | Run `npx prisma generate` |
| `"ECONNREFUSED"` | Ensure PostgreSQL is running and `DATABASE_URL` is correct |
| Map tiles not loading | Check `VITE_MAP_TILE_URL`; try a different tile provider |
| `"Missing required environment variables"` | Set `SESSION_SECRET` and `ADMIN_PASSWORD` |
| Photo uploads return 401 | Log in as admin first at `/login` |
| Server won't start | Check that all required tables exist: `npx prisma migrate deploy` |
| `verifyMigrations` fails | Run `npx prisma migrate deploy` and restart |
| Sessions not working | Ensure `session` table exists and `SESSION_SECRET` is set |

---

## Rollback

If a deploy fails:

```bash
# Revert to previous commit
git log --oneline -5  # Find the good commit hash
git checkout <good-hash> -- api/ web/ prisma/

# Rebuild
cd api && npm install && npm run build && cd ..
cd web && npm install && npm run build && cd ..

# Run any needed migrations
cd api && npx prisma migrate deploy && cd ..

# Restart
systemctl restart water-quality-api
```

---

## Environment Variables Reference

### Backend (`api/.env`)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | — | Yes |
| `PORT` | API server port | `3001` | No |
| `CORS_ORIGIN` | Allowed CORS origin | `false` (same-origin) | Yes |
| `SESSION_SECRET` | Secret for signing session cookies | — | Yes |
| `ADMIN_PASSWORD` | Admin login password (bcrypt-hashed at startup) | — | Yes |
| `NODE_ENV` | `development` or `production` | `development` | No |
| `TRUST_PROXY` | Set `true` behind reverse proxy | `false` | Production |
| `CSP_ENFORCE_MODE` | Set `true` to enforce CSP | `false` | Production |
| `CSP_TILE_DOMAINS` | Comma-separated map tile domains | OpenStreetMap | No |
| `RATE_LIMIT_MAX` | General API rate limit per 15min per IP | `300` | No |

### Frontend (`web/.env`)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:3001/api/v1` | Yes |
| `VITE_MAP_TILE_URL` | Leaflet tile URL template | OpenStreetMap | Yes |
| `VITE_DEFAULT_LAT` | Default map center latitude | `-7.3059612` | No |
| `VITE_DEFAULT_LNG` | Default map center longitude | `112.8443053` | No |
