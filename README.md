# Water Quality Crowdsource

![Version](https://img.shields.io/badge/version-1.6.0-blue)

A **Progressive Web App (PWA)** for crowdsourcing water-quality data at Mangrove Wonorejo, Surabaya. Field researchers and citizen scientists can submit water sample measurements, view data on an interactive map, and track trends over time — all with offline support.

---

## Quick Start

### Prerequisites
- **Node.js** ≥ 18, **npm** ≥ 9
- **PostgreSQL** ≥ 14 with **PostGIS** extension

### 1. Install

```bash
git clone https://github.com/praswibowoo/WaterQuality_Crowdsource.git
cd WaterQuality_Crowdsource
npm install
```

### 2. Configure

```bash
cp api/.env.example api/.env
cp web/.env.example web/.env
```

Edit `api/.env` — set `DATABASE_URL`, `SESSION_SECRET` (`openssl rand -hex 32`), `ADMIN_PASSWORD`.

### 3. Database

```bash
psql -d waterquality -c "CREATE EXTENSION IF NOT EXISTS postgis;"
cd prisma && npx prisma migrate dev --name init && npx prisma db seed && cd ..
```

### 4. Run

```bash
# Terminal 1
cd api && npm run dev

# Terminal 2
cd web && npm run dev
```

Open **http://localhost:5173** → see the map → login as `admin`.

> **Deploying to production?** See [docs/Tutorial_Deployment.md](docs/Tutorial_Deployment.md) for Docker Compose, systemd, security hardening, and troubleshooting.

---

## Default Login

| Field | Value |
|-------|-------|
| URL | `http://localhost:5173/login` |
| Username | `admin` |
| Password | Value of `ADMIN_PASSWORD` in `api/.env` |

---

## Features

- **Water sample submission** — GPS-tagged, offline-first, Laquatwin measurement fields (pH, conductivity, salinity, nitrate, calcium, potassium, sodium), metadata tags (water body type, land use, GPS accuracy)
- **Interactive Leaflet map** — PostGIS spatial search, real-time GPS, marker clustering, pin drop search
- **PWA + offline-first** — Installable on mobile, IndexedDB queue with auto-sync, 8m conflict detection, exponential backoff
- **Admin dashboard** — Approve/reject/batch operations, user management, password reset, CSV export
- **Data quality scoring** — 6-factor reliability score per sample (GPS, range, spatial outlier, metadata, temporal, photos)
- **Photo upload** — Up to 5 photos per sample (JPEG/PNG/WebP), client-side compression, gallery view
- **Time-series charts** — Measurement trend visualization with Chart.js
- **Security** — Helmet, httpOnly sessions, rate limiting, CSP, path traversal protection

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TypeScript, Leaflet, TanStack Query, Dexie.js (offline), Zustand |
| Backend | Express, Prisma, PostgreSQL + PostGIS, Zod, Helmet, bcryptjs |
| Infrastructure | Docker Compose, GitHub Actions CI/CD, GHCR |

---

## API

Interactive documentation available at **/api/docs** when the server is running.

Full deployment guide with all endpoints and env vars: [docs/Tutorial_Deployment.md](docs/Tutorial_Deployment.md)

---

## License

MIT — see `LICENSE` for details.
