import { AppRole } from "@prisma/client";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { repositories } from "../db/repositories";
import { validateBody } from "../middleware/validate";
import { requireAuth, requireCandidateOwner, requireRole } from "../middleware/auth";
import { ACCESS_COOKIE, CSRF_COOKIE, REFRESH_COOKIE, baseCookieOptions, clearCookieOptions, csrfCookieOptions } from "../security/cookies";
import { generateCsrfToken, generateRefreshToken, signAccessToken } from "../security/tokens";
import { getAppEnv } from "../config/env";
import { checkDatabaseHealth } from "../db/health";
import type {
  AuditLogRecord,
  AuthSessionRecord,
  CandidateRecord,
  SharedProfileRecord,
  SkillsState
} from "../db/types";

const router = Router();
const env = getAppEnv();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again later." }
});

const authLoginSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
    otpCode: z.string().optional()
  })
  .strict();

const candidateSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    role: z.string().min(1),
    technologies: z.string().min(1),
    expectedSalary: z.string().min(1),
    available: z.string().min(1),
    status: z.enum(["Active", "Inactive", "Pending"]),
    contact: z
      .object({
        phoneCountryCode: z.literal("+63"),
        phoneNumber: z.string().min(1),
        email: z.string().email(),
        iMessage: z.string().optional()
      })
      .strict()
      .optional(),
    location: z
      .object({
        address: z.string(),
        city: z.string(),
        region: z.string(),
        zipCode: z.string(),
        country: z.string()
      })
      .strict()
      .optional(),
    compensation: z
      .object({
        expectedAmount: z.number().finite(),
        expectedRate: z.enum(["Hourly", "Daily", "Monthly"]),
        offeredAmount: z.number().finite().optional(),
        offeredRate: z.enum(["Hourly", "Daily", "Monthly"]).optional(),
        currency: z.literal("USD")
      })
      .strict()
      .optional(),
    employment: z
      .object({
        contract: z.string(),
        availability: z.string()
      })
      .strict()
      .optional(),
    profile: z
      .object({
        about: z.string(),
        experience: z.string(),
        education: z.array(z.object({ year: z.string(), degree: z.string(), school: z.string() }).strict()),
        projects: z.array(
          z
            .object({
              name: z.string(),
              role: z.string(),
              duration: z.string(),
              summary: z.string(),
              responsibilities: z.array(z.string()),
              technologies: z.array(z.string())
            })
            .strict()
        ),
        skillSelections: z
          .array(
            z
              .object({
                categoryId: z.string(),
                selectedSubSkills: z.array(
                  z
                    .object({
                      skillId: z.string(),
                      level: z.string(),
                      capabilityId: z.string(),
                      text: z.string().optional()
                    })
                    .strict()
                )
              })
              .strict()
          )
          .optional(),
        videoTitle: z.string().optional(),
        videoUrl: z.string().optional(),
        coderbyteScore: z.string().optional(),
        coderbyteLink: z.string().optional()
      })
      .strict()
      .optional(),
    schemaVersion: z.number().int().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
  })
  .strict();

const candidateUpdateSchema = candidateSchema.omit({ id: true });

const skillsSchema = z
  .object({
    taxonomyVersion: z.number().int().optional(),
    updatedAt: z.string().optional(),
    categories: z.array(
      z
        .object({
          id: z.string(),
          name: z.string(),
          slug: z.string().optional(),
          description: z.string().optional(),
          skills: z.array(
            z
              .object({
                id: z.string(),
                name: z.string(),
                code: z.string().optional(),
                description: z.string().optional(),
                capabilities: z.array(
                  z
                    .object({
                      level: z.string(),
                      entries: z.array(z.string())
                    })
                    .strict()
                ),
                createdAt: z.string().optional(),
                updatedAt: z.string().optional()
              })
              .strict()
          ),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
        .strict()
    )
  })
  .strict();

const sharedProfileSchema = z
  .object({
    id: z.string().min(1),
    shareToken: z.string().optional(),
    candidateId: z.string().min(1),
    candidateName: z.string().min(1),
    candidateRole: z.string().min(1),
    sharedWithName: z.string().min(1),
    sharedWithEmail: z.string().email(),
    rateLabel: z.string(),
    expirationDate: z.string().min(1),
    sharedAt: z.string().min(1),
    revokedAt: z.string().optional(),
    accessCount: z.number().int().optional(),
    lastAccessedAt: z.string().optional()
  })
  .strict();

const sharedProfileUpdateSchema = sharedProfileSchema.omit({ id: true });

const lockouts = new Map<string, { attempts: number; lockedUntil: number }>();

function paramValue(value: unknown) {
  if (Array.isArray(value)) return String(value[0] ?? "");
  return String(value ?? "");
}

function parsePagination(query: Record<string, unknown>) {
  const rawPage = Number(String(query.page ?? "1"));
  const rawPageSize = Number(String(query.pageSize ?? "12"));
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const pageSize = Number.isFinite(rawPageSize) && rawPageSize > 0 ? Math.min(100, Math.floor(rawPageSize)) : 12;
  return { page, pageSize };
}

function paginate<T>(items: T[], page: number, pageSize: number) {
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

function compareValues(a: string | number, b: string | number, dir: "asc" | "desc") {
  if (typeof a === "number" && typeof b === "number") {
    return dir === "asc" ? a - b : b - a;
  }
  const x = String(a).toLowerCase();
  const y = String(b).toLowerCase();
  if (x < y) return dir === "asc" ? -1 : 1;
  if (x > y) return dir === "asc" ? 1 : -1;
  return 0;
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
  return Number.isFinite(parsed) ? parsed : 0;
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

async function appendAuditLog(record: Omit<AuditLogRecord, "id" | "createdAt">) {
  await repositories.auditLogs.append(record);
}

router.get("/health", async (_req, res) => {
  await checkDatabaseHealth();
  res.json({ ok: true });
});

router.post("/auth/login", loginLimiter, validateBody(authLoginSchema), async (req, res) => {
  const { email, password, otpCode } = req.body as z.infer<typeof authLoginSchema>;
  const key = email.toLowerCase();
  const lock = lockouts.get(key);
  const nowMs = Date.now();
  if (lock && lock.lockedUntil > nowMs) {
    res.status(429).json({ message: "Account temporarily locked due to failed attempts." });
    return;
  }

  const user = await repositories.users.verifyUserPassword(email, password);
  if (!user) {
    const prev = lockouts.get(key) ?? { attempts: 0, lockedUntil: 0 };
    const attempts = prev.attempts + 1;
    const lockedUntil = attempts >= 5 ? nowMs + 15 * 60 * 1000 : 0;
    lockouts.set(key, { attempts, lockedUntil });
    res.status(401).json({ message: "Invalid email or password" });
    return;
  }

  if (user.role === AppRole.admin && env.ADMIN_MFA_CODE && otpCode !== env.ADMIN_MFA_CODE) {
    res.status(401).json({ message: "Invalid MFA code" });
    return;
  }

  lockouts.delete(key);

  await repositories.authSessions.revokeActiveSessionsForEmail(user.email);
  const candidateId = user.role === AppRole.candidate ? await repositories.users.getCandidateLegacyIdForUser(user.id) : undefined;
  const userName = user.role === AppRole.candidate ? "Alex Morgan" : user.role === AppRole.admin ? "Admin User" : "Client User";

  const refreshToken = generateRefreshToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  const authSession: AuthSessionRecord = {
    token: refreshToken,
    role: user.role,
    email: user.email,
    name: userName,
    candidateId,
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString()
  };
  await repositories.authSessions.create(authSession);

  const accessToken = signAccessToken({
    role: user.role,
    email: authSession.email,
    name: authSession.name,
    candidateId: authSession.candidateId
  });

  const csrfToken = generateCsrfToken();

  res.cookie(ACCESS_COOKIE, accessToken, {
    ...baseCookieOptions(),
    maxAge: env.ACCESS_TOKEN_TTL_MINUTES * 60 * 1000
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...baseCookieOptions(),
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  });
  res.cookie(CSRF_COOKIE, csrfToken, {
    ...csrfCookieOptions(),
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  });

  await appendAuditLog({
    action: "auth.login",
    entityType: "auth",
    entityId: user.email,
    actorRole: user.role,
    actorEmail: user.email,
    beforeState: null,
    afterState: { role: user.role }
  });

  res.json({
    role: user.role,
    email: authSession.email,
    name: authSession.name,
    candidateId: authSession.candidateId
  });
});

async function refreshSession(refreshToken: string | undefined) {
  if (!refreshToken) return null;
  const session = await repositories.authSessions.findActiveByToken(refreshToken);
  if (!session) return null;

  await repositories.authSessions.revokeByToken(refreshToken);

  const nextRefresh = generateRefreshToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await repositories.authSessions.create({
    token: nextRefresh,
    role: session.role,
    email: session.email,
    name: session.name,
    candidateId: session.candidateId,
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString()
  });

  const accessToken = signAccessToken({
    role: session.role,
    email: session.email,
    name: session.name,
    candidateId: session.candidateId
  });

  return {
    session,
    accessToken,
    refreshToken: nextRefresh,
    csrfToken: generateCsrfToken()
  };
}

router.get("/auth/session", async (req, res) => {
  const accessPayload = req.auth;
  if (accessPayload) {
    res.json({
      role: accessPayload.role,
      email: accessPayload.email,
      name: accessPayload.name,
      candidateId: accessPayload.candidateId
    });
    return;
  }

  const refreshed = await refreshSession(req.cookies?.[REFRESH_COOKIE]);
  if (!refreshed) {
    res.status(401).json({ message: "Session expired or invalid" });
    return;
  }

  res.cookie(ACCESS_COOKIE, refreshed.accessToken, {
    ...baseCookieOptions(),
    maxAge: env.ACCESS_TOKEN_TTL_MINUTES * 60 * 1000
  });
  res.cookie(REFRESH_COOKIE, refreshed.refreshToken, {
    ...baseCookieOptions(),
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  });
  res.cookie(CSRF_COOKIE, refreshed.csrfToken, {
    ...csrfCookieOptions(),
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  });

  res.json({
    role: refreshed.session.role,
    email: refreshed.session.email,
    name: refreshed.session.name,
    candidateId: refreshed.session.candidateId
  });
});

router.post("/auth/refresh", async (req, res) => {
  const refreshed = await refreshSession(req.cookies?.[REFRESH_COOKIE]);
  if (!refreshed) {
    res.status(401).json({ message: "Session expired or invalid" });
    return;
  }

  res.cookie(ACCESS_COOKIE, refreshed.accessToken, {
    ...baseCookieOptions(),
    maxAge: env.ACCESS_TOKEN_TTL_MINUTES * 60 * 1000
  });
  res.cookie(REFRESH_COOKIE, refreshed.refreshToken, {
    ...baseCookieOptions(),
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  });
  res.cookie(CSRF_COOKIE, refreshed.csrfToken, {
    ...csrfCookieOptions(),
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  });

  res.json({
    role: refreshed.session.role,
    email: refreshed.session.email,
    name: refreshed.session.name,
    candidateId: refreshed.session.candidateId
  });
});

router.post("/auth/logout", async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  if (refreshToken) {
    const revoked = await repositories.authSessions.revokeByToken(refreshToken);
    if (revoked) {
      await appendAuditLog({
        action: "auth.logout",
        entityType: "auth",
        entityId: revoked.email,
        actorRole: revoked.role,
        actorEmail: revoked.email,
        beforeState: { active: true },
        afterState: { active: false }
      });
    }
  }

  res.clearCookie(ACCESS_COOKIE, clearCookieOptions());
  res.clearCookie(REFRESH_COOKIE, clearCookieOptions());
  res.clearCookie(CSRF_COOKIE, { ...csrfCookieOptions(), maxAge: 0 });
  res.json({ ok: true });
});

router.get("/public-shares/:token", async (req, res) => {
  const record = await repositories.sharedProfiles.findByToken(req.params.token);
  if (!record || !isShareLinkUsable(record)) {
    res.status(404).json({ message: "Share link not found" });
    return;
  }
  res.json(record);
});

router.get("/public-shares/:token/candidate", async (req, res) => {
  const link = await repositories.sharedProfiles.findByToken(req.params.token);
  if (!link || !isShareLinkUsable(link)) {
    res.status(404).json({ message: "Share link expired" });
    return;
  }
  await repositories.sharedProfiles.touchAccessByToken(req.params.token);
  const candidate = await repositories.candidates.findByLegacyId(link.candidateId);
  if (!candidate) {
    res.status(404).json({ message: "Candidate not found" });
    return;
  }
  await appendAuditLog({
    action: "shared_profile.open",
    entityType: "shared_profile",
    entityId: link.id,
    actorRole: "client",
    actorEmail: link.sharedWithEmail,
    beforeState: null,
    afterState: { opened: true },
    metadata: {
      ip: req.ip,
      userAgent: req.headers["user-agent"] ?? ""
    }
  });
  res.json(candidate);
});

router.get("/candidates/query", requireAuth, requireRole(AppRole.admin), async (req, res) => {
  const records = await repositories.candidates.list();
  const { page, pageSize } = parsePagination(req.query as Record<string, unknown>);
  const q = String(req.query.q ?? "").trim().toLowerCase();
  const status = String(req.query.status ?? "").trim();
  const availability = String(req.query.availability ?? "").trim();
  const role = String(req.query.role ?? "").trim();
  const progress = String(req.query.progress ?? "").trim();
  const sortBy = String(req.query.sortBy ?? "name").trim();
  const sortDir = req.query.sortDir === "desc" ? "desc" : "asc";

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
    const matchesProgress = !progress || progress === "all" || getSubmissionProgress(candidate) === progress;
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

  res.json(paginate(sorted, page, pageSize));
});

router.get("/candidates", requireAuth, requireRole(AppRole.admin), async (_req, res) => {
  res.json(await repositories.candidates.list());
});

router.get("/candidates/:id", requireAuth, async (req, res, next) => {
  if (req.auth?.role === AppRole.admin) return next();
  return requireCandidateOwner(req, res, next);
}, async (req, res) => {
  const record = await repositories.candidates.findByLegacyId(paramValue(req.params.id));
  if (!record) {
    res.status(404).json({ message: "Candidate not found" });
    return;
  }
  res.json(record);
});

router.post("/candidates", requireAuth, requireRole(AppRole.admin), validateBody(candidateSchema), async (req, res) => {
  const candidate = await repositories.candidates.upsert(req.body as CandidateRecord);
  await appendAuditLog({
    action: "candidate.create",
    entityType: "candidate",
    entityId: candidate.id,
    actorRole: req.auth!.role,
    actorEmail: req.auth!.email,
    beforeState: null,
    afterState: candidate
  });
  res.status(201).json(candidate);
});

router.put("/candidates/:id", requireAuth, async (req, res, next) => {
  if (req.auth?.role === AppRole.admin) return next();
  return requireCandidateOwner(req, res, next);
}, validateBody(candidateUpdateSchema), async (req, res) => {
  const previous = await repositories.candidates.findByLegacyId(paramValue(req.params.id));
  const candidate = await repositories.candidates.upsert({
    ...(req.body as Omit<CandidateRecord, "id">),
    id: paramValue(req.params.id)
  });
  await appendAuditLog({
    action: "candidate.update",
    entityType: "candidate",
    entityId: paramValue(req.params.id),
    actorRole: req.auth!.role,
    actorEmail: req.auth!.email,
    beforeState: previous,
    afterState: candidate
  });
  res.json(candidate);
});

router.delete("/candidates/:id", requireAuth, requireRole(AppRole.admin), async (req, res) => {
  const previous = await repositories.candidates.findByLegacyId(paramValue(req.params.id));
  await repositories.candidates.softDelete(paramValue(req.params.id));
  await appendAuditLog({
    action: "candidate.delete",
    entityType: "candidate",
    entityId: paramValue(req.params.id),
    actorRole: req.auth!.role,
    actorEmail: req.auth!.email,
    beforeState: previous,
    afterState: null
  });
  res.json({ id: paramValue(req.params.id), deleted: true });
});

router.get("/skills/query", requireAuth, async (req, res) => {
  const state = await repositories.skills.getState();
  const { page, pageSize } = parsePagination(req.query as Record<string, unknown>);
  const scope = String(req.query.scope ?? "categories").trim();
  const q = String(req.query.q ?? "").trim().toLowerCase();
  const sortBy = String(req.query.sortBy ?? "name").trim();
  const sortDir = req.query.sortDir === "desc" ? "desc" : "asc";

  if (scope === "categories") {
    const rows = state.categories
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

    res.json(paginate(rows, page, pageSize));
    return;
  }

  if (scope === "skills") {
    const categoryId = String(req.query.categoryId ?? "").trim();
    const category = state.categories.find((item) => item.id === categoryId);
    if (!category) {
      res.json(paginate([], page, pageSize));
      return;
    }

    const rows = category.skills
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

    res.json(paginate(rows, page, pageSize));
    return;
  }

  res.status(400).json({ message: "Invalid scope" });
});

router.get("/skills", requireAuth, async (_req, res) => {
  res.json(await repositories.skills.getState());
});

router.put("/skills", requireAuth, requireRole(AppRole.admin), validateBody(skillsSchema), async (req, res) => {
  const previous = await repositories.skills.getState();
  const updated = await repositories.skills.replaceState(req.body as SkillsState);
  await appendAuditLog({
    action: "skills.update",
    entityType: "skills",
    entityId: "taxonomy",
    actorRole: req.auth!.role,
    actorEmail: req.auth!.email,
    beforeState: previous,
    afterState: updated
  });
  res.json(updated);
});

router.get("/shared-profiles/query", requireAuth, requireRole(AppRole.admin), async (req, res) => {
  const records = await repositories.sharedProfiles.list();
  const { page, pageSize } = parsePagination(req.query as Record<string, unknown>);
  const q = String(req.query.q ?? "").trim().toLowerCase();
  const status = String(req.query.status ?? "").trim();
  const sortBy = String(req.query.sortBy ?? "sharedAt").trim();
  const sortDir = req.query.sortDir === "asc" ? "asc" : "desc";

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

  res.json(paginate(sorted, page, pageSize));
});

router.get("/shared-profiles", requireAuth, requireRole(AppRole.admin), async (_req, res) => {
  res.json(await repositories.sharedProfiles.list());
});

router.post("/shared-profiles", requireAuth, requireRole(AppRole.admin), validateBody(sharedProfileSchema), async (req, res) => {
  const saved = await repositories.sharedProfiles.upsert(req.body as SharedProfileRecord);
  await appendAuditLog({
    action: "shared_profile.create",
    entityType: "shared_profile",
    entityId: saved.id,
    actorRole: req.auth!.role,
    actorEmail: req.auth!.email,
    beforeState: null,
    afterState: saved
  });
  res.status(201).json(saved);
});

router.post("/shared-profiles/:id/revoke", requireAuth, requireRole(AppRole.admin), async (req, res) => {
  const previous = await repositories.sharedProfiles.findByLegacyId(paramValue(req.params.id));
  if (!previous) {
    res.status(404).json({ message: "Shared profile not found" });
    return;
  }
  const revoked = await repositories.sharedProfiles.revoke(paramValue(req.params.id));
  await appendAuditLog({
    action: "shared_profile.revoke",
    entityType: "shared_profile",
    entityId: paramValue(req.params.id),
    actorRole: req.auth!.role,
    actorEmail: req.auth!.email,
    beforeState: previous,
    afterState: revoked
  });
  res.json(revoked);
});

router.put("/shared-profiles/:id", requireAuth, requireRole(AppRole.admin), validateBody(sharedProfileUpdateSchema), async (req, res) => {
  const previous = await repositories.sharedProfiles.findByLegacyId(paramValue(req.params.id));
  const updated = await repositories.sharedProfiles.upsert({
    ...(req.body as Omit<SharedProfileRecord, "id">),
    id: paramValue(req.params.id)
  });
  await appendAuditLog({
    action: "shared_profile.update",
    entityType: "shared_profile",
    entityId: paramValue(req.params.id),
    actorRole: req.auth!.role,
    actorEmail: req.auth!.email,
    beforeState: previous,
    afterState: updated
  });
  res.json(updated);
});

router.delete("/shared-profiles/:id", requireAuth, requireRole(AppRole.admin), async (req, res) => {
  const previous = await repositories.sharedProfiles.findByLegacyId(paramValue(req.params.id));
  await repositories.sharedProfiles.softDelete(paramValue(req.params.id));
  await appendAuditLog({
    action: "shared_profile.delete",
    entityType: "shared_profile",
    entityId: paramValue(req.params.id),
    actorRole: req.auth!.role,
    actorEmail: req.auth!.email,
    beforeState: previous,
    afterState: null
  });
  res.json({ id: paramValue(req.params.id), deleted: true });
});

router.get("/audit-logs/query", requireAuth, requireRole(AppRole.admin), async (req, res) => {
  const logs = await repositories.auditLogs.list();
  const { page, pageSize } = parsePagination(req.query as Record<string, unknown>);
  const q = String(req.query.q ?? "").trim().toLowerCase();
  const action = String(req.query.action ?? "").trim();
  const entity = String(req.query.entity ?? "").trim();
  const sortBy = String(req.query.sortBy ?? "createdAt").trim();
  const sortDir = req.query.sortDir === "asc" ? "asc" : "desc";

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

  res.json(paginate(sorted, page, pageSize));
});

router.get("/audit-logs", requireAuth, requireRole(AppRole.admin), async (_req, res) => {
  res.json(await repositories.auditLogs.list());
});

export default router;
