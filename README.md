# Chromedia Talent Intelligence

A React + Vite application for managing candidates, skill taxonomy, and client sharing workflows.

This repository runs as a frontend app with a Vite middleware API in `vite.config.ts`, now backed by PostgreSQL via Prisma.

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
| Admin | Full admin console | Can manage candidates, skills, share links, and audit logs |
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

- Start page (`/candidate/:candidateId/start`) with personalized greeting.
- Skill assessment flow (`/candidate/:candidateId/skills`):
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

## 5) Project Structure

| Path | Purpose |
|---|---|
| `src/app` | App shell, routes, global styles |
| `src/features/admin` | Admin pages, components, data layer |
| `src/features/candidate` | Candidate start and skill-flow pages |
| `src/features/customer` | Customer/client page(s) |
| `src/shared` | Shared auth, UI components, hooks, helpers |
| `db` | JSON data files used by the local API |
| `scripts` | Migration and integration test scripts |
| `docs` | Architecture notes and plans |

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
npm run test:domain
npm run test:share-links
npm run test:all
```

## 7) Authentication and Access

Login page route: `/login`

Demo accounts currently shown in UI:

- `admin@chromedia.local / password123`
- `client@chromedia.local / password123`

Notes:

- Candidate self-assessment flow is link-driven and does not require candidate login in the active UX.
- Auth session token is persisted in local storage key: `chromedia.auth.session.v1`.
- API uses `x-session-token` header for protected endpoints.

## 8) Route Map

| Route | Role | Purpose |
|---|---|---|
| `/login` | Public | Sign-in page |
| `/admin/dashboard` | Admin | Dashboard |
| `/admin/candidates` | Admin | Candidates table |
| `/admin/candidates/:candidateId` | Admin | Candidate profile editor |
| `/admin/skills` | Admin | Skills taxonomy management |
| `/admin/shared-profiles` | Admin | Shared link management |
| `/admin/audit-logs` | Admin | Audit logs |
| `/admin/account` | Admin | Account page |
| `/admin/settings` | Admin | Settings page |
| `/customer` | Client | Customer home |
| `/customer/candidates/:candidateId/preview` | Admin/Client | Candidate preview view |
| `/shared/:shareToken` | Public | Shared profile entry point |
| `/candidate/:candidateId/start` | Public | Candidate start page |
| `/candidate/:candidateId/skills` | Public | Candidate skills flow |

## 9) Local API Reference

The app uses Vite middleware as a local API server in `vite.config.ts`.

### Auth

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Login with email/password |
| GET | `/api/auth/session` | Session token | Resolve active session |
| POST | `/api/auth/logout` | Session token | Revoke session |

### Candidates

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/candidates/query` | Admin | Paginated/sorted/filtered candidates |
| GET | `/api/candidates` | Admin | Full list |
| GET | `/api/candidates/:id` | Admin/Candidate own | Candidate detail |
| POST | `/api/candidates` | Admin | Create candidate |
| PUT | `/api/candidates/:id` | Admin/Candidate own | Update candidate |
| DELETE | `/api/candidates/:id` | Admin | Delete candidate |

### Skills

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/skills/query` | Authenticated | Paginated categories/skills view |
| GET | `/api/skills` | Authenticated | Full skills state |
| PUT | `/api/skills` | Admin | Update skills taxonomy |

### Shared Profiles

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/shared-profiles/query` | Admin | Paginated shared links |
| GET | `/api/shared-profiles` | Admin | Full shared links |
| POST | `/api/shared-profiles` | Admin | Create shared link |
| PUT | `/api/shared-profiles/:id` | Admin | Update shared link |
| DELETE | `/api/shared-profiles/:id` | Admin | Delete shared link |
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

Primary data store is PostgreSQL. Legacy JSON files under `db/` are still kept for import/backfill.

| File | What it stores | Example use |
|---|---|---|
| `db/candidates.json` | Candidate records and profile content | About, projects, skills selected |
| `db/skills.json` | Skills taxonomy | Categories, skills, capability entries |
| `db/sharedProfiles.json` | Shared profile links | Who received link, expiry, rate label |
| `db/auditLogs.json` | Change history | Candidate updates, share actions, auth events |
| `db/authSessions.json` | Active/expired login sessions | Admin/client login state |

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

### Logged in but blocked

- Check role permissions and session validity.
- Re-login via `/login`.

### Shared link not opening

- Check link expiration date.
- Check if link was revoked/deleted.
- Confirm token exists in `db/sharedProfiles.json`.

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
