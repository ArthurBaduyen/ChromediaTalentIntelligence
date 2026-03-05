# Chromedia Talent Intelligence

A React + Vite + Express application for managing candidates, skill taxonomy, and client sharing workflows.

This repository uses:
- `frontend/` for the client app
- `backend/` for API, auth/RBAC, and database access

## 1) Product Overview

Chromedia Talent Intelligence supports three practical workflows:

- Admin workflow: manage candidates, maintain skills taxonomy, evaluate profiles, and share candidate links with clients.
- Candidate workflow: candidates receive a link and complete skill self-assessment without login.
- Client workflow: clients view shared candidate profiles via unique expiring links.

Primary goals:

- Keep candidate data structured and editable.
- Keep skills taxonomy centralized and reusable across admin and candidate flows.
- Track share-link lifecycle and activity.
- Provide auditability for important actions.

## 2) User Roles

| Role | Access | Notes |
|---|---|---|
| Super Admin | Full admin console | Can manage users, candidates, skills, share links, and audit logs |
| Admin | Admin console (limited) | Can manage candidates, skills, share links, profile details; cannot access users/audit logs |
| Client | Restricted client view | Can access shared/public candidate profile views |
| Candidate | No login in current candidate flow | Accesses skill flow via emailed link route |

## 3) Core Features

### Admin

- Dashboard with operational metrics and summaries.
- Candidates table with search/filter/sort/pagination.
- Candidate profile editor:
  - About, experience, video, coderbyte, education, projects, skills.
  - Add/edit/delete actions for relevant sections.
  - Share to client modal.
- Skills management:
  - Category/Skill/Capability hierarchy.
  - Inline edit/delete actions in table rows.
- Shared profiles management:
  - List of generated links.
  - Copy link.
  - Adjust/extend validity.
  - Remove/revoke.
- Audit log viewer.

### Candidate

- Start page (`/candidate/:token/start`) with personalized greeting.
- Skill assessment flow (`/candidate/:token/skills`):
  - Category-based navigation.
  - Autosave behavior with reliability improvements.
  - Resume where left off.
  - Accessibility improvements (focus, hit area, keyboard behavior).

### Client/Public

- Unique shared profile links (`/shared/:shareToken`).
- Client view hides admin editing controls.
- Share link validity and expiration enforced by API.

## 4) Tech Stack

- React 18
- TypeScript 5
- Vite 6
- React Router 7
- Tailwind CSS 3
- PostgreSQL 16 (Docker Compose local setup)
- Prisma ORM + SQL migrations
- Express API with Helmet, CORS, cookie-parser, and rate limiting

## 5) Project Structure

| Path | Purpose |
|---|---|
| `frontend/` | Client-side app (React/Vite UI + routes/components) |
| `backend/` | Server-side concerns (Prisma schema/migrations, data layer, legacy JSON) |
| `frontend/src/app` | App shell, routes, global styles |
| `frontend/src/features` | Feature modules (admin/candidate/customer/auth/design) |
| `frontend/src/shared` | Shared auth, UI components, hooks, helpers |
| `backend/db` | Legacy JSON files kept for import/backfill |
| `scripts` | Migration and integration test scripts |
| `docs` | Architecture notes and plans |
| `docker` | Docker-related supporting config files |

## 6) Run the App

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
npm install
```

### Local DB Setup

1) Copy environment variables:

```bash
cp .env.example .env
```

2) Start PostgreSQL:

```bash
docker compose up -d
```

3) Generate Prisma client + apply migrations:

```bash
npm run db:generate
npm run db:migrate
```

4) Import legacy JSON data into PostgreSQL:

```bash
npm run db:import
npm run db:verify
```

### Run Frontend + Backend

```bash
npm run dev
```

This starts:
- backend API on `http://localhost:4000`
- frontend on `http://localhost:5173` (proxying `/api` to backend)

Quick start sequence (local):

```bash
docker compose up -d
npm install
npm run db:migrate
npm run db:import
npm run dev
```

Optional: to re-import cleanly in development, run `npm run db:import -- --wipe`.

### Prisma Connection Notes

- `DATABASE_URL` is required at runtime.
- For high concurrency/serverless environments, use a pooled connection string (for example PgBouncer or provider pool endpoint).
- Session/share tokens are stored as SHA-256 hashes with `TOKEN_HASH_PEPPER`.

### Start dev server

```bash
npm run dev
```

If you close the terminal running `npm run dev`, the site will stop and show "site can't be reached" until restarted.

### Build and typecheck

```bash
npm run typecheck
npm run build
```

### Test scripts

```bash
npm run test
npm run test:qa-generator
npm run test:qa-api
npm run test:domain
npm run test:share-links
npm run test:all
```

## 7) Authentication and Access

Login page route: `/login`

Demo accounts currently shown in UI:

- `superadmin@chromedia.local / password123` (Super Admin)
- `admin@chromedia.local / password123` (Admin)

Notes:

- Candidate and client/customer flows are link-driven and do not require login.
- Auth now uses short-lived access tokens and rotated refresh tokens in secure HttpOnly cookies.
- CSRF protection is enforced for state-changing API calls using `x-csrf-token`.
- Frontend stores only user profile metadata in local storage; session tokens are not exposed to JS.

## 8) Route Map

| Route | Role | Purpose |
|---|---|---|
| `/login` | Public | Sign-in page |
| `/admin/dashboard` | Super Admin/Admin | Dashboard |
| `/admin/candidates` | Super Admin/Admin | Candidates table |
| `/admin/candidates/:candidateId` | Super Admin/Admin | Candidate profile editor |
| `/admin/test-cases` | Super Admin/Admin | QA test cases management and baseline generation |
| `/admin/skills` | Super Admin/Admin | Skills taxonomy management |
| `/admin/shared-profiles` | Super Admin/Admin | Shared link management |
| `/admin/audit-logs` | Super Admin | Audit logs |
| `/admin/account` | Super Admin/Admin | Account page |
| `/admin/settings` | Super Admin/Admin | Settings page (`UI` + `User` tab, `User` for Super Admin only) |
| `/customer/candidates/:candidateId/preview` | Super Admin/Admin | Candidate preview view |
| `/shared/:shareToken` | Public | Shared profile entry point |
| `/candidate/:token/start` | Public | Candidate start page |
| `/candidate/:token/skills` | Public | Candidate skills flow |

## 9) Local API Reference

The app uses the Express backend (`backend/src/server.ts`) as the API server.

### Auth

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Login with email/password |
| GET | `/api/auth/session` | Cookie session | Resolve active session (auto-refresh if valid refresh token exists) |
| POST | `/api/auth/refresh` | Cookie session | Rotate refresh token and issue new access token |
| POST | `/api/auth/logout` | Cookie session | Revoke session and clear cookies |
| POST | `/api/auth/reset-password` | Public (token-based) | Complete reset flow with one-time token |

### Candidates

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/candidates/query` | Admin | Paginated/sorted/filtered candidates |
| GET | `/api/candidates` | Admin | Full list |
| GET | `/api/candidates/:id` | Admin | Candidate detail |
| POST | `/api/candidates` | Admin | Create candidate |
| PUT | `/api/candidates/:id` | Admin | Update candidate |
| DELETE | `/api/candidates/:id` | Admin | Delete candidate |
| POST | `/api/candidate-links` | Admin | Generate candidate invite link token |

### Candidate Public Links

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/public-candidate/:token` | Public token | Resolve candidate by invite token |
| PUT | `/api/public-candidate/:token/skills` | Public token | Update candidate skill selections only |

### Skills

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/skills/query` | Authenticated | Paginated categories/skills view |
| GET | `/api/skills` | Authenticated | Full skills state |
| PUT | `/api/skills` | Admin | Update skills taxonomy |

### QA Test Cases

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/features` | Admin | List QA features/stories |
| POST | `/api/features` | Admin | Create QA feature/story |
| GET | `/api/features/:id/test-cases` | Admin | List test cases for a feature with filters (`type`, `priority`, `isAutomatable`, `q`) |
| POST | `/api/features/:id/test-cases` | Admin | Create a test case for a feature |
| PUT | `/api/test-cases/:id` | Admin | Update a test case |
| DELETE | `/api/test-cases/:id` | Admin | Delete a test case |
| POST | `/api/features/:id/test-cases:generate` | Admin | Generate deterministic baseline test cases (preview or persist) |
| POST | `/api/features/:id/test-cases/generate` | Admin | Alias of the generate endpoint above |

### Shared Profiles

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/shared-profiles/query` | Admin | Paginated shared links |
| GET | `/api/shared-profiles` | Admin | Full shared links |
| POST | `/api/shared-profiles` | Admin | Create shared link |
| PUT | `/api/shared-profiles/:id` | Admin | Update shared link |
| DELETE | `/api/shared-profiles/:id` | Admin | Delete shared link |

### Users (Super Admin only)

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/users` | Super Admin | List users (search by email/username) |
| POST | `/api/users` | Super Admin | Create user |
| PATCH | `/api/users/:id` | Super Admin | Update role/status/username |
| POST | `/api/users/:id/reset-password` | Super Admin | Generate one-time reset link |
| POST | `/api/users/:id/set-password` | Super Admin | Set password directly |
| DELETE | `/api/users/:id` | Super Admin | Soft delete user (self-delete blocked) |
| POST | `/api/shared-profiles/:id/revoke` | Admin | Revoke link |

### Public Shares

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/public-shares/:token` | Public | Share metadata |
| GET | `/api/public-shares/:token/candidate` | Public | Candidate by share token |

### Audit Logs

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/audit-logs/query` | Admin | Paginated audit logs |
| GET | `/api/audit-logs` | Admin | Full audit logs |

## 10) Pagination and Table Behavior

- Server-side pagination/sort/filter is used for:
  - Candidates
  - Skills (categories and skills scope)
  - Shared Profiles
  - Audit Logs
- Standard page size is `12` rows.
- Pagination control is hidden when total pages is `1`.

## 11) Database Structure (Non-Technical View)

Primary data store is PostgreSQL. Legacy JSON files under `backend/db/` are still kept for import/backfill.

| File | What it stores | Example use |
|---|---|---|
| `backend/db/candidates.json` | Candidate records and profile content | About, projects, skills selected |
| `backend/db/skills.json` | Skills taxonomy | Categories, skills, capability entries |
| `backend/db/sharedProfiles.json` | Shared profile links | Who received link, expiry, rate label |
| `backend/db/auditLogs.json` | Change history | Candidate updates, share actions, auth events |
| `backend/db/authSessions.json` | Active/expired login sessions | Admin/client login state |

## 12) Database Structure (Technical Snapshot)

### Candidate

| Field | Type | Notes |
|---|---|---|
| `id` | string | Unique slug id |
| `name` | string | Candidate name |
| `role` | string | Job role |
| `technologies` | string | Comma-separated summary |
| `expectedSalary` | string | Display salary label |
| `available` | string | Availability label |
| `status` | enum | `Active` \| `Inactive` \| `Pending` |
| `contact` | object | PH phone + email |
| `location` | object | Address/city/region/zip/country |
| `compensation` | object | amount/rate/currency |
| `employment` | object | contract + availability |
| `profile` | object | About/experience/education/projects/video/coderbyte/skill selections |
| `createdAt` / `updatedAt` | ISO string | Timestamps |

### Skill taxonomy

| Level | Fields |
|---|---|
| Category | `id`, `name`, `skills[]` |
| Skill | `id`, `name`, `capabilities[]` |
| Capability group | `level`, `entries[]` |

### Skill selection model

Candidate skill selections store stable IDs:

- `categoryId`
- `selectedSubSkills[]` with:
  - `skillId`
  - `level`
  - `capabilityId`

Display text is resolved from `skills.json` to avoid text drift.

## 13) Reliability and UX Safeguards

- Global error boundary with retry/reload fallback.
- Query-level error banners with retry actions.
- Skeleton and empty-state components for async table pages.
- Unsaved-change guard (`useUnsavedChangesGuard`) where needed.
- Candidate skill flow autosave and resume support.

## 14) Audit Logging

Audit events are captured for key operations, including:

- `auth.login`, `auth.logout`
- `candidate.create`, `candidate.update`, `candidate.delete`
- `skills.update`
- `shared_profile.create`, `shared_profile.update`, `shared_profile.revoke`, `shared_profile.delete`, `shared_profile.open`

Audit records include actor role/email, entity info, timestamp, and before/after state snapshots.

## 15) Migration Script

To normalize candidate skill selections to stable capability IDs:

```bash
npm run migrate:skill-selections
```

Script location: `scripts/migrate-skill-selection-capability-ids.mjs`.

## 16) Troubleshooting

### "Site can't be reached"

- Cause: dev server stopped.
- Fix: run `npm run dev` again.

### Frontend starts on wrong port (CORS/login issues)

- Cause: port `5173` is already occupied, so the frontend cannot start on the expected origin.
- Fix: free the port, then restart dev servers:

```bash
lsof -ti :5173 | xargs kill -9
npm run dev
```

- If you change `CORS_ORIGIN`/`CORS_ORIGINS`, restart the backend so env changes are applied.

### Logged in but blocked

- Check role permissions and session validity.
- Re-login via `/login`.

### Shared link not opening

- Check link expiration date.
- Check if link was revoked/deleted.
- Confirm token exists in `backend/db/sharedProfiles.json`.

### Data not updating in UI

- Ensure API write succeeded (watch dev terminal logs).
- Refresh page to reload JSON-backed state.

## 17) Known Current Constraints

- API is still implemented as Vite middleware; move to a dedicated backend service for full production scale.
- Vite middleware API is suitable for development, not production scale.
- No formal CI pipeline configured in this repository yet.
- Demo credentials are development-only.

## 18) Next Productionization Steps

- Move API to dedicated backend service with persistent DB.
- Introduce proper secret management and secure auth flow.
- Add API contract tests and end-to-end browser tests in CI.
- Add backups and migration/versioning strategy for persisted data.

---

For previous implementation planning notes, see:

- `docs/architecture/auth-rbac-implementation-plan.md`
