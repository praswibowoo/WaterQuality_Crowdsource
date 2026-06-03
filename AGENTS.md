# AGENTS.md — Crowdsource Water Quality Data

## Project Context
- **Purpose**: Crowdsource water-quality data collection from users via CRUD + map.
- **Tech Stack**: React (Vite) + Leaflet (map) + Express/Fastify backend + SQLite/PostgreSQL (via Prisma) + optional Python microservice for AI analysis.
- **Repo State**: Active development.

## Agent Roles & Workflow

### 1. Lead Manager
**Responsibility**: Own requirements, architecture decisions, and task breakdown.

**Before any coding session:**
1. Ask user clarifying questions if requirements are ambiguous.
2. Produce or update the master task list (`TODO.md` or inline in session).
3. Define exact feature scope, data model, and API contract.
4. Assign work to Developer in small, verifiable chunks.
5. Document tech choices and folder structure in `AGENTS.md` or `README.md`.

**Key outputs:**
- Feature specification (what, why, acceptance criteria)
- Database schema / Prisma model
- API endpoint list (method, route, request/response shape)
- UI wireframe description (which page shows what)
- Environment variables needed (`VITE_MAP_TILE_URL`, `DATABASE_URL`, `AI_SERVICE_URL`, etc.)

### 2. Developer
**Responsibility**: Implement features exactly per Lead Manager spec. Minimize bugs.

**Rules:**
- Do NOT deviate from spec without Lead Manager approval.
- Write small, testable functions. Keep business logic out of UI components where possible.
- Use TypeScript strict mode. No `any` without comment justification.
- Validate all inputs (Zod on backend, form validation on frontend).
- Return proper HTTP status codes. Handle errors gracefully (don’t crash the app).
- After each feature: run `npm run lint`, `npm run typecheck`, `npm run test` (if available).
- Commit incrementally with clear messages.

**Stack specifics:**
- **Frontend**: React 18+, Vite, Leaflet (via `react-leaflet`), TanStack Query for server state, Zustand or React Context for local state.
- **Backend**: Node.js + Express or Fastify. Use Prisma ORM. CORS enabled.
- **Map**: Leaflet with OpenStreetMap tiles (configurable via env). Capture GPS coordinates on form submit.
- **AI**: Isolate in `/services/ai` (Python FastAPI or Node.js). Expose `/analyze` endpoint. Keep it optional (app works without AI).

**Critical constraints:**
- All DB migrations must be Prisma migrations (`npx prisma migrate dev`).
- API routes under `/api/v1/`.
- Frontend env vars prefixed with `VITE_`.
- Offline-first: cache submissions in localStorage if network fails; sync when back online.

**UI/UX checklist (apply when modifying components):**
- [ ] Touch targets ≥44px on mobile (buttons, remove icons, radius selectors)
- [ ] Use CSS variables (`var(--color-*)`, `var(--spacing-*)`, `var(--radius-*)`) — never hardcoded colors
- [ ] Use `100dvh` over `100vh` for full-screen heights (with `100vh` fallback)
- [ ] Loading, error, and empty states shown for every data-fetching view
- [ ] Confirmation dialog before destructive actions (delete, approve, reject)
- [ ] `prefers-reduced-motion: reduce` media query respected for animations
- [ ] Aria labels on icon-only controls (color dots, buttons without text)
- [ ] Keyboard-dismissable overlays (Escape key on modals, pin mode)

### 3. Quality Control (QC)
**Responsibility**: Verify features match Lead Manager spec. Report bugs; Developer fixes.

**Checklist per feature:**
- [ ] Feature matches acceptance criteria.
- [ ] Happy path works (create, read, update, delete if applicable).
- [ ] Edge cases handled (empty input, duplicate data, offline, invalid coordinates).
- [ ] Map shows correct markers; coordinates stored accurately.
- [ ] API returns correct status codes and error messages.
- [ ] No console errors; responsive on mobile viewport.
- [ ] Data persists correctly in database.

**Process:**
1. Review PR / code diff against spec.
2. Run manual verification steps (provide curl or UI click path).
3. If bug found: create a concise bug report (expected vs actual, repro steps) and assign to Developer.
4. Re-test after Developer claims fix.
5. Approve only when checklist passes.

## Environment & Secrets
- Use `.env` for local secrets. Add `.env.example` to version control.
- Never commit real API keys or database credentials.

## Directory Ownership
| Directory | Owner | Purpose |
|-----------|-------|---------|
| `/web` or `/frontend` | Developer | React Vite app |
| `/api` or `/backend` | Developer | Express/Fastify API |
| `/services/ai` | Developer | AI analysis microservice |
| `/prisma` | Lead Manager / Developer | Database schema & migrations |
| `/docs` | Lead Manager | **Temporary** spec files — delete after implementation. Only contains specs for 📝 Planned / 📝 Future Backlog features. Once a feature is ✅ Done, its spec file in here is erased. |

## Common Commands (update as project grows)
```bash
# Frontend
npm run dev          # Vite dev server
npm run build        # Production build
npm run preview      # Preview production build

# Backend
npm run dev          # nodemon/ts-node dev server
npm run start        # Production server

# Database
npx prisma migrate dev    # Run migrations in dev
npx prisma db seed        # Seed data if seed.ts exists
npx prisma studio         # Open DB GUI

# AI service (if Python)
cd services/ai && uvicorn main:app --reload
```

## Project Tracking Files
- **`PROGRESS.md`** — Single source of truth for all features. Read before working; update after finishing. Contains Feature ID registry (`WQ-###`) and session log.
- **`MILESTONES.md`** — Sprint gates and priorities. Lead Manager uses this to decide what to build next. Exit criteria must be met before moving to the next milestone.
- **Lead Manager** owns both files, edits `PROGRESS.md` directly, and must inform the user of any updates.

## Notes
- Map tile provider must remain configurable (env var) to avoid vendor lock-in.
- Keep AI module completely decoupled so it can be disabled or replaced without touching CRUD.
- When in doubt, Lead Manager decides. Developer executes. QC validates.
