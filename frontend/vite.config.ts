import "dotenv/config";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { repositories } from "../backend/src/db/repositories";
import { checkDatabaseHealth } from "../backend/src/db/health";
import type {
  AuditLogRecord,
  CandidateRecord,
  SharedProfileRecord,
  DemoUser,
  AuthSessionRecord,
  SkillsState
} from "../backend/src/db/types";

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));

type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const demoUsers: DemoUser[] = [
  { role: "admin", email: "admin@chromedia.local", password: "password123", name: "Admin User" },
  {
    role: "candidate",
    email: "candidate@chromedia.local",
    password: "password123",
    name: "Alex Morgan",
    candidateId: "alex-morgan"
  },
  { role: "client", email: "client@chromedia.local", password: "password123", name: "Client User" }
];

async function readCandidatesFile() {
  return repositories.candidates.list();
}

async function readSkillsFile() {
  return repositories.skills.getState();
}

async function readSharedProfilesFile() {
  return repositories.sharedProfiles.list();
}

async function readAuditLogsFile() {
  return repositories.auditLogs.list();
}

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
}

function parseCandidateId(req: IncomingMessage) {
  if (!req.url) return null;
  const pathname = new URL(req.url, "http://localhost").pathname;
  const match = pathname.match(/^\/api\/candidates\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function parseSharedProfileId(req: IncomingMessage) {
  if (!req.url) return null;
  const pathname = new URL(req.url, "http://localhost").pathname;
  const match = pathname.match(/^\/api\/shared-profiles\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function parseSharedProfileRevokeId(req: IncomingMessage) {
  if (!req.url) return null;
  const pathname = new URL(req.url, "http://localhost").pathname;
  const match = pathname.match(/^\/api\/shared-profiles\/([^/]+)\/revoke$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function isShareLinkUsable(record: SharedProfileRecord) {
  if (record.revokedAt) return false;
  const expiration = new Date(record.expirationDate);
  if (Number.isNaN(expiration.getTime())) return false;
  const now = new Date();
  const startNow = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startExp = new Date(expiration.getFullYear(), expiration.getMonth(), expiration.getDate()).getTime();
  return startExp >= startNow;
}

function parsePublicShareToken(req: IncomingMessage) {
  if (!req.url) return null;
  const pathname = new URL(req.url, "http://localhost").pathname;
  const match = pathname.match(/^\/api\/public-shares\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function parsePublicShareCandidateToken(req: IncomingMessage) {
  if (!req.url) return null;
  const pathname = new URL(req.url, "http://localhost").pathname;
  const match = pathname.match(/^\/api\/public-shares\/([^/]+)\/candidate$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function parsePagination(url: URL) {
  const rawPage = Number(url.searchParams.get("page") ?? "1");
  const rawPageSize = Number(url.searchParams.get("pageSize") ?? "12");
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const pageSize = Number.isFinite(rawPageSize) && rawPageSize > 0 ? Math.min(100, Math.floor(rawPageSize)) : 12;
  return { page, pageSize };
}

function paginate<T>(items: T[], page: number, pageSize: number): PaginatedResponse<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages
  };
}

function getSubmissionProgress(candidate: CandidateRecord): "invited" | "started" | "in-progress" | "completed" {
  const selections = candidate.profile?.skillSelections ?? [];
  if (selections.length === 0) return "invited";
  const filledGroups = selections.filter((selection) => selection.selectedSubSkills.length > 0).length;
  if (filledGroups === 0) return "invited";
  if (filledGroups === selections.length) return "completed";
  if (filledGroups === 1) return "started";
  return "in-progress";
}

function candidateExpectedSalaryValue(candidate: CandidateRecord) {
  if (typeof candidate.compensation?.expectedAmount === "number" && Number.isFinite(candidate.compensation.expectedAmount)) {
    return candidate.compensation.expectedAmount;
  }
  const parsed = Number(String(candidate.expectedSalary ?? "").replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
}

function shareStatus(record: SharedProfileRecord): "Active" | "Expired" | "Revoked" {
  if (record.revokedAt) return "Revoked";
  const expiration = new Date(record.expirationDate);
  if (Number.isNaN(expiration.getTime())) return "Expired";
  const now = new Date();
  const startNow = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startExp = new Date(expiration.getFullYear(), expiration.getMonth(), expiration.getDate()).getTime();
  return startExp < startNow ? "Expired" : "Active";
}

function compareValues(a: string | number, b: string | number, dir: "asc" | "desc") {
  if (typeof a === "number" && typeof b === "number") {
    return dir === "asc" ? a - b : b - a;
  }
  const nextA = String(a).toLowerCase();
  const nextB = String(b).toLowerCase();
  if (nextA < nextB) return dir === "asc" ? -1 : 1;
  if (nextA > nextB) return dir === "asc" ? 1 : -1;
  return 0;
}

type DevAuth = {
  role: "admin" | "candidate" | "client" | null;
  email: string | null;
  candidateId: string | null;
  sessionToken?: string | null;
};

function getSessionToken(req: IncomingMessage) {
  const header = req.headers["x-session-token"];
  const raw = Array.isArray(header) ? header[0] : header;
  return typeof raw === "string" ? raw : null;
}

function issueSessionToken() {
  return `sess_${Date.now().toString(36)}_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

function snapshot(value: unknown) {
  if (value === undefined) return null;
  return JSON.parse(JSON.stringify(value));
}

async function appendAuditLog(input: Omit<AuditLogRecord, "id" | "createdAt">) {
  await repositories.auditLogs.append(input);
}

function getDevAuth(req: IncomingMessage): DevAuth {
  const roleHeader = req.headers["x-dev-role"];
  const emailHeader = req.headers["x-dev-user-email"];
  const candidateIdHeader = req.headers["x-dev-candidate-id"];
  const roleRaw = Array.isArray(roleHeader) ? roleHeader[0] : roleHeader;
  const emailRaw = Array.isArray(emailHeader) ? emailHeader[0] : emailHeader;
  const candidateIdRaw = Array.isArray(candidateIdHeader) ? candidateIdHeader[0] : candidateIdHeader;
  const role = roleRaw === "admin" || roleRaw === "candidate" || roleRaw === "client" ? roleRaw : null;
  return {
    role,
    email: typeof emailRaw === "string" ? emailRaw : null,
    candidateId: typeof candidateIdRaw === "string" ? candidateIdRaw : null,
    sessionToken: null
  };
}

async function resolveRequestAuth(req: IncomingMessage): Promise<DevAuth> {
  const token = getSessionToken(req);
  if (token) {
    const match = await repositories.authSessions.findActiveByToken(token);
    if (match) {
      return {
        role: match.role,
        email: match.email,
        candidateId: match.candidateId ?? null,
        sessionToken: token
      };
    }
  }
  return getDevAuth(req);
}

function sendUnauthorized(res: ServerResponse, message: string) {
  sendJson(res, 401, { message });
}

function sendForbidden(res: ServerResponse, message: string) {
  sendJson(res, 403, { message });
}

type FieldError = {
  field: string;
  message: string;
};

function sendBadRequest(res: ServerResponse, message: string, errors: FieldError[]) {
  sendJson(res, 400, { message, errors });
}

function isNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function isEmail(value: unknown) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isIsoDateLike(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function validateAuthLoginPayload(payload: Record<string, unknown>) {
  const errors: FieldError[] = [];
  if (!isEmail(payload.email)) {
    errors.push({ field: "email", message: "Valid email is required." });
  }
  if (!isNonEmptyString(payload.password)) {
    errors.push({ field: "password", message: "Password is required." });
  }
  return errors;
}

function validateCandidatePayload(payload: Record<string, unknown>, options: { requireId: boolean }) {
  const errors: FieldError[] = [];
  if (options.requireId && !isNonEmptyString(payload.id)) {
    errors.push({ field: "id", message: "Candidate id is required." });
  }
  if (!isNonEmptyString(payload.name)) {
    errors.push({ field: "name", message: "Candidate name is required." });
  }
  if (!isNonEmptyString(payload.role)) {
    errors.push({ field: "role", message: "Role is required." });
  }
  const status = payload.status;
  if (status !== "Active" && status !== "Inactive" && status !== "Pending") {
    errors.push({ field: "status", message: "Status must be Active, Inactive, or Pending." });
  }
  if (!isNonEmptyString(payload.available)) {
    errors.push({ field: "available", message: "Availability is required." });
  }
  if (!isNonEmptyString(payload.technologies)) {
    errors.push({ field: "technologies", message: "Technologies value is required." });
  }
  if (payload.contact && typeof payload.contact === "object") {
    const contact = payload.contact as Record<string, unknown>;
    if (!isEmail(contact.email)) {
      errors.push({ field: "contact.email", message: "Contact email must be valid." });
    }
  }
  return errors;
}

function validateSkillsStatePayload(payload: Record<string, unknown>) {
  const errors: FieldError[] = [];
  if (!Array.isArray(payload.categories)) {
    errors.push({ field: "categories", message: "Categories must be an array." });
    return errors;
  }
  (payload.categories as unknown[]).forEach((category, categoryIndex) => {
    if (!category || typeof category !== "object") {
      errors.push({ field: `categories[${categoryIndex}]`, message: "Category must be an object." });
      return;
    }
    const categoryObject = category as Record<string, unknown>;
    if (!isNonEmptyString(categoryObject.id)) {
      errors.push({ field: `categories[${categoryIndex}].id`, message: "Category id is required." });
    }
    if (!isNonEmptyString(categoryObject.name)) {
      errors.push({ field: `categories[${categoryIndex}].name`, message: "Category name is required." });
    }
    if (!Array.isArray(categoryObject.skills)) {
      errors.push({ field: `categories[${categoryIndex}].skills`, message: "Skills must be an array." });
      return;
    }
    (categoryObject.skills as unknown[]).forEach((skill, skillIndex) => {
      if (!skill || typeof skill !== "object") {
        errors.push({
          field: `categories[${categoryIndex}].skills[${skillIndex}]`,
          message: "Skill must be an object."
        });
        return;
      }
      const skillObject = skill as Record<string, unknown>;
      if (!isNonEmptyString(skillObject.id)) {
        errors.push({
          field: `categories[${categoryIndex}].skills[${skillIndex}].id`,
          message: "Skill id is required."
        });
      }
      if (!isNonEmptyString(skillObject.name)) {
        errors.push({
          field: `categories[${categoryIndex}].skills[${skillIndex}].name`,
          message: "Skill name is required."
        });
      }
      if (!Array.isArray(skillObject.capabilities)) {
        errors.push({
          field: `categories[${categoryIndex}].skills[${skillIndex}].capabilities`,
          message: "Capabilities must be an array."
        });
      }
    });
  });
  return errors;
}

function validateSharedProfilePayload(payload: Record<string, unknown>, options: { requireId: boolean }) {
  const errors: FieldError[] = [];
  if (options.requireId && !isNonEmptyString(payload.id)) {
    errors.push({ field: "id", message: "Share id is required." });
  }
  if (!isNonEmptyString(payload.shareToken)) {
    errors.push({ field: "shareToken", message: "Share token is required." });
  }
  if (!isNonEmptyString(payload.candidateId)) {
    errors.push({ field: "candidateId", message: "Candidate id is required." });
  }
  if (!isNonEmptyString(payload.candidateName)) {
    errors.push({ field: "candidateName", message: "Candidate name is required." });
  }
  if (!isNonEmptyString(payload.candidateRole)) {
    errors.push({ field: "candidateRole", message: "Candidate role is required." });
  }
  if (!isNonEmptyString(payload.sharedWithName)) {
    errors.push({ field: "sharedWithName", message: "Recipient name is required." });
  }
  if (!isEmail(payload.sharedWithEmail)) {
    errors.push({ field: "sharedWithEmail", message: "Recipient email must be valid." });
  }
  if (!isNonEmptyString(payload.rateLabel)) {
    errors.push({ field: "rateLabel", message: "Rate label is required." });
  }
  if (!isIsoDateLike(payload.expirationDate)) {
    errors.push({ field: "expirationDate", message: "Expiration date must be a valid date." });
  }
  return errors;
}

export default defineConfig({
  root: frontendRoot,
  plugins: [
    react(),
    {
      name: "local-db-api",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url?.startsWith("/api/health")) {
            try {
              await checkDatabaseHealth();
              sendJson(res, 200, { ok: true });
              return;
            } catch (error) {
              sendJson(res, 503, { ok: false, error: String(error) });
              return;
            }
          }

          if (req.url?.startsWith("/api/auth")) {
            try {
              if (req.url.startsWith("/api/auth/login")) {
                if (req.method !== "POST") {
                  sendJson(res, 405, { message: "Method Not Allowed" });
                  return;
                }
                const payload = (await readJsonBody(req)) as Record<string, unknown>;
                const loginErrors = validateAuthLoginPayload(payload);
                if (loginErrors.length > 0) {
                  sendBadRequest(res, "Invalid login payload", loginErrors);
                  return;
                }
                const email = String(payload.email ?? "").trim().toLowerCase();
                const password = String(payload.password ?? "");
                const user = demoUsers.find((item) => item.email === email && item.password === password);
                if (!user) {
                  sendUnauthorized(res, "Invalid email or password");
                  return;
                }
                await repositories.users.upsertDemoUser(user);
                await repositories.authSessions.revokeActiveSessionsForEmail(user.email);
                const createdAt = new Date().toISOString();
                const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
                const token = issueSessionToken();
                const nextSession: AuthSessionRecord = {
                  token,
                  role: user.role,
                  email: user.email,
                  name: user.name,
                  candidateId: user.candidateId,
                  expiresAt,
                  createdAt
                };
                await repositories.authSessions.create(nextSession);
                await appendAuditLog({
                  action: "auth.login",
                  entityType: "auth",
                  entityId: user.email,
                  actorRole: user.role,
                  actorEmail: user.email,
                  beforeState: null,
                  afterState: snapshot({ sessionToken: token, role: user.role, candidateId: user.candidateId ?? null })
                });
                sendJson(res, 200, {
                  role: user.role,
                  email: user.email,
                  name: user.name,
                  candidateId: user.candidateId,
                  sessionToken: token
                });
                return;
              }

              if (req.url.startsWith("/api/auth/session")) {
                if (req.method !== "GET") {
                  sendJson(res, 405, { message: "Method Not Allowed" });
                  return;
                }
                const token = getSessionToken(req);
                if (!token) {
                  sendUnauthorized(res, "Authentication required");
                  return;
                }
                const session = await repositories.authSessions.findActiveByToken(token);
                if (!session) {
                  sendUnauthorized(res, "Session expired or invalid");
                  return;
                }
                sendJson(res, 200, {
                  role: session.role,
                  email: session.email,
                  name: session.name,
                  candidateId: session.candidateId,
                  sessionToken: session.token
                });
                return;
              }

              if (req.url.startsWith("/api/auth/logout")) {
                if (req.method !== "POST") {
                  sendJson(res, 405, { message: "Method Not Allowed" });
                  return;
                }
                const token = getSessionToken(req);
                if (!token) {
                  sendJson(res, 200, { ok: true });
                  return;
                }
                const targetSession = await repositories.authSessions.revokeByToken(token);
                if (targetSession) {
                  await appendAuditLog({
                    action: "auth.logout",
                    entityType: "auth",
                    entityId: targetSession.email,
                    actorRole: targetSession.role,
                    actorEmail: targetSession.email,
                    beforeState: snapshot({ sessionToken: token, revokedAt: null }),
                    afterState: snapshot({ sessionToken: token, revokedAt: targetSession.revokedAt ?? new Date().toISOString() })
                  });
                }
                sendJson(res, 200, { ok: true });
                return;
              }

              sendJson(res, 404, { message: "Not Found" });
              return;
            } catch (error) {
              sendJson(res, 500, { message: "Failed auth operation", error: String(error) });
              return;
            }
          }

          if (req.url?.startsWith("/api/public-shares")) {
            try {
              const candidateToken = parsePublicShareCandidateToken(req);
              if (req.method === "GET" && candidateToken) {
                const link = await repositories.sharedProfiles.findByToken(candidateToken);
                if (!link) {
                  sendJson(res, 404, { message: "Share link not found" });
                  return;
                }
                if (!isShareLinkUsable(link)) {
                  sendJson(res, 404, { message: "Share link expired" });
                  return;
                }
                const candidates = await readCandidatesFile();
                const candidate = candidates.find((item) => item.id === link.candidateId);
                if (!candidate) {
                  sendJson(res, 404, { message: "Candidate not found" });
                  return;
                }
                const nowIso = new Date().toISOString();
                await repositories.sharedProfiles.touchAccessByToken(candidateToken);
                await appendAuditLog({
                  action: "shared_profile.open",
                  entityType: "shared_profile",
                  entityId: link.id,
                  actorRole: "client",
                  actorEmail: link.sharedWithEmail,
                  beforeState: null,
                  afterState: snapshot({
                    shareToken: link.shareToken,
                    openedAt: nowIso,
                    recipientEmail: link.sharedWithEmail
                  }),
                  metadata: {
                    shareToken: link.shareToken,
                    userAgent: req.headers["user-agent"] ?? "",
                    referer: req.headers.referer ?? ""
                  }
                });
                sendJson(res, 200, candidate);
                return;
              }

              const token = parsePublicShareToken(req);
              if (req.method !== "GET" || !token) {
                sendJson(res, 405, { message: "Method Not Allowed" });
                return;
              }
              const record = await repositories.sharedProfiles.findByToken(token);
              if (!record) {
                sendJson(res, 404, { message: "Share link not found" });
                return;
              }
              if (!isShareLinkUsable(record)) {
                sendJson(res, 404, { message: "Share link expired" });
                return;
              }
              sendJson(res, 200, record);
              return;
            } catch (error) {
              sendJson(res, 500, { message: "Failed to access local database", error: String(error) });
              return;
            }
          }

          if (req.url?.startsWith("/api/audit-logs")) {
            try {
              const requestUrl = new URL(req.url, "http://localhost");
              const auth = await resolveRequestAuth(req);
              if (!auth.role) {
                sendUnauthorized(res, "Authentication required");
                return;
              }
              if (auth.role !== "admin") {
                sendForbidden(res, "Only admins can view audit logs");
                return;
              }
              if (req.method !== "GET") {
                sendJson(res, 405, { message: "Method Not Allowed" });
                return;
              }
              const logs = await readAuditLogsFile();
              if (requestUrl.pathname === "/api/audit-logs/query") {
                const { page, pageSize } = parsePagination(requestUrl);
                const q = (requestUrl.searchParams.get("q") ?? "").trim().toLowerCase();
                const action = (requestUrl.searchParams.get("action") ?? "").trim();
                const entity = (requestUrl.searchParams.get("entity") ?? "").trim();
                const sortBy = (requestUrl.searchParams.get("sortBy") ?? "createdAt").trim();
                const sortDir = requestUrl.searchParams.get("sortDir") === "asc" ? "asc" : "desc";

                const filtered = logs.filter((log) => {
                  const matchesAction = !action || action === "all" || log.action === action;
                  const matchesEntity = !entity || entity === "all" || log.entityType === entity;
                  const matchesQ =
                    !q ||
                    log.action.toLowerCase().includes(q) ||
                    log.entityId.toLowerCase().includes(q) ||
                    log.actorEmail.toLowerCase().includes(q);
                  return matchesAction && matchesEntity && matchesQ;
                });

                const sorted = [...filtered].sort((a, b) => {
                  if (sortBy === "action") return compareValues(a.action, b.action, sortDir);
                  if (sortBy === "entityType") return compareValues(a.entityType, b.entityType, sortDir);
                  if (sortBy === "entityId") return compareValues(a.entityId, b.entityId, sortDir);
                  if (sortBy === "actorEmail") return compareValues(a.actorEmail, b.actorEmail, sortDir);
                  return compareValues(a.createdAt, b.createdAt, sortDir);
                });

                sendJson(res, 200, paginate(sorted, page, pageSize));
                return;
              }
              sendJson(res, 200, logs);
              return;
            } catch (error) {
              sendJson(res, 500, { message: "Failed to access audit logs", error: String(error) });
              return;
            }
          }

          if (req.url?.startsWith("/api/candidates")) {
            try {
              const requestUrl = new URL(req.url, "http://localhost");
              const candidateId = parseCandidateId(req);
              const auth = await resolveRequestAuth(req);

              if (req.method === "GET" && requestUrl.pathname === "/api/candidates/query") {
                if (!auth.role) {
                  sendUnauthorized(res, "Authentication required");
                  return;
                }
                if (auth.role !== "admin") {
                  sendForbidden(res, "Only admins can list candidates");
                  return;
                }
                const records = await readCandidatesFile();
                const { page, pageSize } = parsePagination(requestUrl);
                const q = (requestUrl.searchParams.get("q") ?? "").trim().toLowerCase();
                const status = (requestUrl.searchParams.get("status") ?? "").trim();
                const availability = (requestUrl.searchParams.get("availability") ?? "").trim();
                const role = (requestUrl.searchParams.get("role") ?? "").trim();
                const progress = (requestUrl.searchParams.get("progress") ?? "").trim();
                const sortBy = (requestUrl.searchParams.get("sortBy") ?? "name").trim();
                const sortDir = requestUrl.searchParams.get("sortDir") === "desc" ? "desc" : "asc";

                const filtered = records.filter((candidate) => {
                  const matchesQ =
                    !q ||
                    candidate.name.toLowerCase().includes(q) ||
                    candidate.role.toLowerCase().includes(q) ||
                    candidate.technologies.toLowerCase().includes(q);
                  const matchesStatus = !status || status === "all" || candidate.status === status;
                  const candidateAvailability = candidate.available.toLowerCase() === "yes" ? "yes" : "later";
                  const matchesAvailability = !availability || availability === "all" || candidateAvailability === availability;
                  const matchesRole = !role || role === "all" || candidate.role === role;
                  const matchesProgress =
                    !progress || progress === "all" || getSubmissionProgress(candidate) === progress;
                  return matchesQ && matchesStatus && matchesAvailability && matchesRole && matchesProgress;
                });

                const sorted = [...filtered].sort((a, b) => {
                  if (sortBy === "role") return compareValues(a.role, b.role, sortDir);
                  if (sortBy === "technologies") return compareValues(a.technologies, b.technologies, sortDir);
                  if (sortBy === "expectedSalary") return compareValues(candidateExpectedSalaryValue(a), candidateExpectedSalaryValue(b), sortDir);
                  if (sortBy === "status") return compareValues(a.status, b.status, sortDir);
                  if (sortBy === "available") return compareValues(a.available, b.available, sortDir);
                  if (sortBy === "updatedAt") return compareValues(a.updatedAt ?? "", b.updatedAt ?? "", sortDir);
                  return compareValues(a.name, b.name, sortDir);
                });

                sendJson(res, 200, paginate(sorted, page, pageSize));
                return;
              }

              if (req.method === "GET" && !candidateId) {
                if (!auth.role) {
                  sendUnauthorized(res, "Authentication required");
                  return;
                }
                if (auth.role !== "admin") {
                  sendForbidden(res, "Only admins can list candidates");
                  return;
                }
                const records = await readCandidatesFile();
                sendJson(res, 200, records);
                return;
              }

              if (req.method === "GET" && candidateId) {
                if (auth.role === "candidate" && auth.candidateId !== candidateId) {
                  sendForbidden(res, "Candidates can only access their own profile");
                  return;
                }
                const records = await readCandidatesFile();
                const record = records.find((item) => item.id === candidateId);
                if (!record) {
                  sendJson(res, 404, { message: "Candidate not found" });
                  return;
                }
                sendJson(res, 200, record);
                return;
              }

              if (req.method === "POST" && !candidateId) {
                if (!auth.role) {
                  sendUnauthorized(res, "Authentication required");
                  return;
                }
                if (auth.role !== "admin") {
                  sendForbidden(res, "Only admins can create candidates");
                  return;
                }
                const payload = (await readJsonBody(req)) as Record<string, unknown>;
                const candidateErrors = validateCandidatePayload(payload, { requireId: true });
                if (candidateErrors.length > 0) {
                  sendBadRequest(res, "Invalid candidate payload", candidateErrors);
                  return;
                }
                const records = await readCandidatesFile();
                const candidatePayload = payload as CandidateRecord;
                await repositories.candidates.upsert(candidatePayload);
                await appendAuditLog({
                  action: "candidate.create",
                  entityType: "candidate",
                  entityId: candidatePayload.id,
                  actorRole: auth.role,
                  actorEmail: auth.email ?? "unknown",
                  beforeState: null,
                  afterState: snapshot(candidatePayload)
                });
                sendJson(res, 201, candidatePayload);
                return;
              }

              if (req.method === "PUT" && candidateId) {
                if (auth.role && auth.role !== "admin" && !(auth.role === "candidate" && auth.candidateId === candidateId)) {
                  sendForbidden(res, "Not allowed to update this candidate");
                  return;
                }
                const payload = (await readJsonBody(req)) as Record<string, unknown>;
                const candidateErrors = validateCandidatePayload(payload, { requireId: false });
                if (candidateErrors.length > 0) {
                  sendBadRequest(res, "Invalid candidate payload", candidateErrors);
                  return;
                }
                const records = await readCandidatesFile();
                const candidatePayload = payload as CandidateRecord;
                const previousRecord = records.find((item) => item.id === candidateId) ?? null;
                await repositories.candidates.upsert({ ...candidatePayload, id: candidateId });
                await appendAuditLog({
                  action: "candidate.update",
                  entityType: "candidate",
                  entityId: candidateId,
                  actorRole: auth.role,
                  actorEmail: auth.email ?? "unknown",
                  beforeState: snapshot(previousRecord),
                  afterState: snapshot({ ...candidatePayload, id: candidateId })
                });
                sendJson(res, 200, { ...candidatePayload, id: candidateId });
                return;
              }

              if (req.method === "DELETE" && candidateId) {
                if (!auth.role) {
                  sendUnauthorized(res, "Authentication required");
                  return;
                }
                if (auth.role !== "admin") {
                  sendForbidden(res, "Only admins can delete candidates");
                  return;
                }
                const records = await readCandidatesFile();
                const previousRecord = records.find((item) => item.id === candidateId) ?? null;
                await repositories.candidates.softDelete(candidateId);
                await appendAuditLog({
                  action: "candidate.delete",
                  entityType: "candidate",
                  entityId: candidateId,
                  actorRole: auth.role,
                  actorEmail: auth.email ?? "unknown",
                  beforeState: snapshot(previousRecord),
                  afterState: null
                });
                sendJson(res, 200, { id: candidateId, deleted: true });
                return;
              }

              sendJson(res, 405, { message: "Method Not Allowed" });
              return;
            } catch (error) {
              sendJson(res, 500, { message: "Failed to access local database", error: String(error) });
              return;
            }
          }

          if (req.url?.startsWith("/api/skills")) {
            try {
              const requestUrl = new URL(req.url, "http://localhost");
              const auth = await resolveRequestAuth(req);
              if (req.method === "GET" && requestUrl.pathname === "/api/skills/query") {
                if (!auth.role) {
                  sendUnauthorized(res, "Authentication required");
                  return;
                }
                const state = await readSkillsFile();
                const scope = (requestUrl.searchParams.get("scope") ?? "categories").trim();
                const q = (requestUrl.searchParams.get("q") ?? "").trim().toLowerCase();
                const sortBy = (requestUrl.searchParams.get("sortBy") ?? "name").trim();
                const sortDir = requestUrl.searchParams.get("sortDir") === "desc" ? "desc" : "asc";
                const { page, pageSize } = parsePagination(requestUrl);

                if (scope === "categories") {
                  const categoryRows = state.categories
                    .map((category) => ({
                      id: category.id,
                      name: category.name,
                      skillsCount: category.skills.length,
                      updatedAt: category.updatedAt ?? ""
                    }))
                    .filter((row) => !q || row.name.toLowerCase().includes(q))
                    .sort((a, b) => {
                      if (sortBy === "skillsCount") return compareValues(a.skillsCount, b.skillsCount, sortDir);
                      if (sortBy === "updatedAt") return compareValues(a.updatedAt, b.updatedAt, sortDir);
                      return compareValues(a.name, b.name, sortDir);
                    });
                  sendJson(res, 200, paginate(categoryRows, page, pageSize));
                  return;
                }

                if (scope === "skills") {
                  const categoryId = (requestUrl.searchParams.get("categoryId") ?? "").trim();
                  const category = state.categories.find((item) => item.id === categoryId);
                  if (!category) {
                    sendJson(res, 200, paginate([], page, pageSize));
                    return;
                  }
                  const skillRows = category.skills
                    .map((skill) => ({
                      id: skill.id,
                      categoryId,
                      name: skill.name,
                      capabilityCount: skill.capabilities.reduce((sum, group) => sum + group.entries.length, 0),
                      updatedAt: skill.updatedAt ?? ""
                    }))
                    .filter((row) => !q || row.name.toLowerCase().includes(q))
                    .sort((a, b) => {
                      if (sortBy === "capabilityCount") return compareValues(a.capabilityCount, b.capabilityCount, sortDir);
                      if (sortBy === "updatedAt") return compareValues(a.updatedAt, b.updatedAt, sortDir);
                      return compareValues(a.name, b.name, sortDir);
                    });
                  sendJson(res, 200, paginate(skillRows, page, pageSize));
                  return;
                }
              }
              if (req.method === "GET") {
                const state = await readSkillsFile();
                sendJson(res, 200, state);
                return;
              }

              if (req.method === "PUT") {
                if (!auth.role) {
                  sendUnauthorized(res, "Authentication required");
                  return;
                }
                if (auth.role !== "admin") {
                  sendForbidden(res, "Only admins can modify skills");
                  return;
                }
                const payload = (await readJsonBody(req)) as Record<string, unknown>;
                const skillsErrors = validateSkillsStatePayload(payload);
                if (skillsErrors.length > 0) {
                  sendBadRequest(res, "Invalid skills payload", skillsErrors);
                  return;
                }
                const previousState = await readSkillsFile();
                const skillsPayload = payload as SkillsState;
                await repositories.skills.replaceState(skillsPayload);
                await appendAuditLog({
                  action: "skills.update",
                  entityType: "skills",
                  entityId: "taxonomy",
                  actorRole: auth.role,
                  actorEmail: auth.email ?? "unknown",
                  beforeState: snapshot(previousState),
                  afterState: snapshot(skillsPayload)
                });
                sendJson(res, 200, skillsPayload);
                return;
              }

              sendJson(res, 405, { message: "Method Not Allowed" });
              return;
            } catch (error) {
              sendJson(res, 500, { message: "Failed to access local database", error: String(error) });
              return;
            }
          }

          if (req.url?.startsWith("/api/shared-profiles")) {
            try {
              const requestUrl = new URL(req.url, "http://localhost");
              const sharedProfileId = parseSharedProfileId(req);
              const sharedProfileRevokeId = parseSharedProfileRevokeId(req);
              const auth = await resolveRequestAuth(req);
              if (!auth.role) {
                sendUnauthorized(res, "Authentication required");
                return;
              }
              if (auth.role !== "admin") {
                sendForbidden(res, "Only admins can manage shared profiles");
                return;
              }

              if (req.method === "GET" && requestUrl.pathname === "/api/shared-profiles/query") {
                const records = await readSharedProfilesFile();
                const { page, pageSize } = parsePagination(requestUrl);
                const q = (requestUrl.searchParams.get("q") ?? "").trim().toLowerCase();
                const status = (requestUrl.searchParams.get("status") ?? "").trim();
                const sortBy = (requestUrl.searchParams.get("sortBy") ?? "sharedAt").trim();
                const sortDir = requestUrl.searchParams.get("sortDir") === "asc" ? "asc" : "desc";

                const filtered = records.filter((row) => {
                  const rowStatus = shareStatus(row);
                  const matchesStatus = !status || status === "all" || rowStatus.toLowerCase() === status.toLowerCase();
                  const matchesQ =
                    !q ||
                    row.candidateName.toLowerCase().includes(q) ||
                    row.candidateRole.toLowerCase().includes(q) ||
                    row.sharedWithName.toLowerCase().includes(q) ||
                    row.sharedWithEmail.toLowerCase().includes(q);
                  return matchesStatus && matchesQ;
                });

                const sorted = [...filtered].sort((a, b) => {
                  if (sortBy === "candidateName") return compareValues(a.candidateName, b.candidateName, sortDir);
                  if (sortBy === "sharedWithName") return compareValues(a.sharedWithName, b.sharedWithName, sortDir);
                  if (sortBy === "rateLabel") return compareValues(a.rateLabel, b.rateLabel, sortDir);
                  if (sortBy === "expirationDate") return compareValues(a.expirationDate, b.expirationDate, sortDir);
                  if (sortBy === "status") return compareValues(shareStatus(a), shareStatus(b), sortDir);
                  if (sortBy === "accessCount") return compareValues(a.accessCount ?? 0, b.accessCount ?? 0, sortDir);
                  return compareValues(a.sharedAt, b.sharedAt, sortDir);
                });
                sendJson(res, 200, paginate(sorted, page, pageSize));
                return;
              }

              if (req.method === "GET") {
                const records = await readSharedProfilesFile();
                sendJson(res, 200, records);
                return;
              }

              if (req.method === "POST" && sharedProfileRevokeId) {
                const previousRecord = await repositories.sharedProfiles.findByLegacyId(sharedProfileRevokeId);
                if (!previousRecord) {
                  sendJson(res, 404, { message: "Shared profile not found" });
                  return;
                }
                const revokedRecord = await repositories.sharedProfiles.revoke(sharedProfileRevokeId);
                await appendAuditLog({
                  action: "shared_profile.revoke",
                  entityType: "shared_profile",
                  entityId: sharedProfileRevokeId,
                  actorRole: auth.role,
                  actorEmail: auth.email ?? "unknown",
                  beforeState: snapshot(previousRecord),
                  afterState: snapshot(revokedRecord)
                });
                sendJson(res, 200, revokedRecord);
                return;
              }

              if (req.method === "POST" && !sharedProfileId && !sharedProfileRevokeId) {
                const payload = (await readJsonBody(req)) as Record<string, unknown>;
                const shareErrors = validateSharedProfilePayload(payload, { requireId: true });
                if (shareErrors.length > 0) {
                  sendBadRequest(res, "Invalid shared profile payload", shareErrors);
                  return;
                }
                const sharedPayload = payload as SharedProfileRecord;
                const savedRecord = await repositories.sharedProfiles.upsert(sharedPayload);
                await appendAuditLog({
                  action: "shared_profile.create",
                  entityType: "shared_profile",
                  entityId: sharedPayload.id,
                  actorRole: auth.role,
                  actorEmail: auth.email ?? "unknown",
                  beforeState: null,
                  afterState: snapshot(savedRecord)
                });
                sendJson(res, 201, savedRecord);
                return;
              }

              if (req.method === "PUT" && sharedProfileId) {
                const payload = (await readJsonBody(req)) as Record<string, unknown>;
                const shareErrors = validateSharedProfilePayload(payload, { requireId: false });
                if (shareErrors.length > 0) {
                  sendBadRequest(res, "Invalid shared profile payload", shareErrors);
                  return;
                }
                const sharedPayload = payload as SharedProfileRecord;
                const previousRecord = await repositories.sharedProfiles.findByLegacyId(sharedProfileId);
                const updatedRecord = await repositories.sharedProfiles.upsert({ ...sharedPayload, id: sharedProfileId });
                await appendAuditLog({
                  action: "shared_profile.update",
                  entityType: "shared_profile",
                  entityId: sharedProfileId,
                  actorRole: auth.role,
                  actorEmail: auth.email ?? "unknown",
                  beforeState: snapshot(previousRecord),
                  afterState: snapshot(updatedRecord)
                });
                sendJson(res, 200, updatedRecord);
                return;
              }

              if (req.method === "DELETE" && sharedProfileId) {
                const previousRecord = await repositories.sharedProfiles.findByLegacyId(sharedProfileId);
                await repositories.sharedProfiles.softDelete(sharedProfileId);
                await appendAuditLog({
                  action: "shared_profile.delete",
                  entityType: "shared_profile",
                  entityId: sharedProfileId,
                  actorRole: auth.role,
                  actorEmail: auth.email ?? "unknown",
                  beforeState: snapshot(previousRecord),
                  afterState: null
                });
                sendJson(res, 200, { id: sharedProfileId, deleted: true });
                return;
              }

              sendJson(res, 405, { message: "Method Not Allowed" });
              return;
            } catch (error) {
              sendJson(res, 500, { message: "Failed to access local database", error: String(error) });
              return;
            }
          }

          next();
        });
      }
    }
  ]
});
