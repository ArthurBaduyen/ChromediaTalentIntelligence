# Auth + RBAC Implementation Plan

This document defines the first implementation target for:
- proper login/authentication
- role-based authorization (`admin`, `candidate`, `client`)
- route guards and API guards
- share-link governance

## 1) Role Matrix (Human-Readable)

| Feature / Action | Admin | Candidate | Client |
|---|---|---|---|
| Access Admin Dashboard | Yes | No | No |
| View Candidate List (Admin table) | Yes | No | No |
| Create / Edit / Delete Candidate | Yes | No | No |
| Manage Skills Taxonomy (Category/Skill/Sub-skill) | Yes | No | No |
| Open Candidate Skill Form | No | Yes (own profile only) | No |
| Submit Candidate Skill Answers | No | Yes (own profile only) | No |
| View Shared Client Preview via Token URL | Yes | Yes (if token valid) | Yes (if token valid) |
| Create Share Link | Yes | No | No |
| Adjust/Extend/Revoke Share Link | Yes | No | No |
| Copy Share Link from Shared Profiles table | Yes | No | No |
| View Audit Logs | Yes | No | No |
| Manage Settings | Yes | No | No |

## 2) Route Guard Rules (Frontend)

- `/admin/**` -> requires authenticated user with role `admin`.
- `/candidate/:candidateId/start` and `/candidate/:candidateId/skills` -> requires role `candidate` and ownership of `candidateId`.
- `/shared/:shareToken` -> public route, but server validates token existence + expiry + revocation.
- `/customer/candidates/:candidateId/preview` -> should be admin-only in internal app; external clients use `/shared/:shareToken`.

## 3) API Guard Rules (Backend)

All write endpoints require authenticated session.

- Candidate APIs
  - `GET /api/candidates` -> `admin`
  - `GET /api/candidates/:id` -> `admin` OR `candidate` owner OR `client` if accessed through a valid share-token context
  - `POST/PUT/DELETE /api/candidates*` -> `admin`

- Skills APIs
  - `GET /api/skills` -> authenticated `admin/candidate/client`
  - `PUT /api/skills` and any mutation -> `admin`

- Shared profile APIs
  - `GET /api/shared-profiles` -> `admin`
  - `POST /api/shared-profiles` -> `admin`
  - `PUT /api/shared-profiles/:id` -> `admin`
  - `DELETE /api/shared-profiles/:id` -> `admin`

- Public share resolution
  - `GET /api/public-shares/:token` -> anonymous allowed, but return 404 for unknown/revoked/expired.

## 4) Database Structure Introduced

Migration file:
- `db/migrations/0001_auth_rbac.sql`

Tables:
- `users`
- `user_sessions`
- `candidates`
- `candidate_accounts`
- `client_accounts`
- `share_links`
- `audit_logs`

## 5) Implementation Sequence

1. **Auth foundation**
   - add login endpoint + password hashing (`argon2`/`bcrypt`)
   - add refresh-token session table writes
   - add auth middleware (`requireAuth`)

2. **Role middleware**
   - add `requireRole('admin' | 'candidate' | 'client')`
   - add candidate ownership guard (`requireCandidateOwner`)

3. **Route protection in React**
   - add `ProtectedRoute` wrapper
   - wire route constraints in `src/app/App.tsx`

4. **API protection**
   - enforce role checks in `/api/candidates`, `/api/skills`, `/api/shared-profiles`

5. **Share link hardening**
   - resolve token from `share_links` table
   - enforce `expires_at` and `revoked_at`

6. **Audit logs**
   - log candidate/skill/share mutations in `audit_logs`

## 6) Acceptance Criteria

- Unauthorized user cannot access `/admin/**`.
- Candidate cannot edit another candidate's skills/profile.
- Client cannot call admin mutation endpoints.
- Revoked/expired token cannot load shared profile.
- Every create/update/delete for candidate/skills/shares writes an `audit_logs` row.

## 7) Next Tasks (ready to implement)

- Create `auth` feature folder with session context + login form.
- Add middleware layer to replace open local-db API behavior.
- Add `public-share` lookup endpoint and move `/shared/:token` view to consume it.

