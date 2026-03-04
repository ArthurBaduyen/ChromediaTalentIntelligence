import { AppRole } from "@prisma/client";
import { Router, type Request } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { z } from "zod";
import { repositories } from "../db/repositories";
import { validateBody } from "../middleware/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  ACCESS_COOKIE,
  CSRF_COOKIE,
  REFRESH_COOKIE,
  baseCookieOptions,
  clearCookieOptions,
  csrfCookieOptions
} from "../security/cookies";
import { generateCsrfToken, generateRefreshToken, signAccessToken } from "../security/tokens";
import { getAppEnv } from "../config/env";
import { checkDatabaseHealth } from "../db/health";
import type { AuditLogRecord, AuthSessionRecord } from "../db/types";

const router = Router();
const env = getAppEnv();

const loginLimiter = rateLimit({
  windowMs: env.LOGIN_RATE_LIMIT_WINDOW_MS,
  max: env.LOGIN_RATE_LIMIT_MAX,
  keyGenerator: (req: Request) => {
    const email = normalizeEmail((req.body as { email?: unknown } | undefined)?.email);
    return `${email}|${ipKeyGenerator(req.ip ?? "")}`;
  },
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

const userRoleSchema = z.enum(["super_admin", "admin"]);

const userCreateSchema = z
  .object({
    email: z.string().email(),
    username: z.string().min(3).max(64),
    role: userRoleSchema,
    password: z.string().min(8)
  })
  .strict();

const userPatchSchema = z
  .object({
    username: z.string().min(3).max(64).optional(),
    role: userRoleSchema.optional(),
    isEnabled: z.boolean().optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required"
  });

const setPasswordSchema = z
  .object({
    password: z.string().min(8)
  })
  .strict();

const resetPasswordCompleteSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8)
  })
  .strict();

type LoginAttemptLock = {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil: number;
  lastSeenAt: number;
};

const lockouts = new Map<string, LoginAttemptLock>();

function paramValue(value: unknown) {
  if (Array.isArray(value)) return String(value[0] ?? "");
  return String(value ?? "");
}

function normalizeEmail(email: unknown) {
  return String(email ?? "").trim().toLowerCase();
}

function loginLockKey(email: string, requestIp: string | undefined) {
  return `${email}|${requestIp ?? "unknown"}`;
}

function clearLoginLocksForEmail(email: string) {
  const prefix = `${email}|`;
  for (const key of lockouts.keys()) {
    if (key.startsWith(prefix)) lockouts.delete(key);
  }
}

function cleanupExpiredLoginLocks(nowMs: number) {
  const retentionMs = env.LOGIN_ATTEMPT_WINDOW_MINUTES * 60 * 1000;
  for (const [key, value] of lockouts.entries()) {
    const lockExpired = value.lockedUntil > 0 && value.lockedUntil <= nowMs;
    const staleWindow = nowMs - value.firstAttemptAt > retentionMs;
    if (lockExpired && staleWindow) lockouts.delete(key);
  }
}

function registerFailedLoginAttempt(email: string, requestIp: string | undefined, nowMs: number) {
  const key = loginLockKey(email, requestIp);
  const previous = lockouts.get(key);
  const windowMs = env.LOGIN_ATTEMPT_WINDOW_MINUTES * 60 * 1000;
  const baseAttempt =
    previous && nowMs - previous.firstAttemptAt <= windowMs
      ? previous
      : { attempts: 0, firstAttemptAt: nowMs, lockedUntil: 0, lastSeenAt: nowMs };

  const attempts = baseAttempt.attempts + 1;
  const shouldLock = attempts >= env.LOGIN_MAX_ATTEMPTS;
  const lockedUntil = shouldLock ? nowMs + env.LOGIN_LOCKOUT_MINUTES * 60 * 1000 : 0;

  lockouts.set(key, {
    attempts,
    firstAttemptAt: baseAttempt.firstAttemptAt,
    lockedUntil,
    lastSeenAt: nowMs
  });

  return { attempts, lockedUntil };
}

async function appendAuditLog(record: Omit<AuditLogRecord, "id" | "createdAt">) {
  await repositories.auditLogs.append(record);
}

function authActorRole(role: AppRole): AuditLogRecord["actorRole"] {
  if (role === AppRole.candidate) return "candidate";
  if (role === AppRole.client) return "client";
  return "admin";
}

function displayNameFromUserRole(role: AppRole) {
  if (role === AppRole.super_admin) return "Super Admin";
  if (role === AppRole.admin) return "Admin User";
  if (role === AppRole.candidate) return "Alex Morgan";
  return "Client User";
}

router.get("/health", async (_req, res) => {
  await checkDatabaseHealth();
  res.json({ ok: true });
});

router.post("/auth/login", loginLimiter, validateBody(authLoginSchema), async (req, res) => {
  const { email, password, otpCode } = req.body as z.infer<typeof authLoginSchema>;
  const normalizedEmail = normalizeEmail(email);
  cleanupExpiredLoginLocks(Date.now());
  const key = loginLockKey(normalizedEmail, req.ip);
  const lock = lockouts.get(key);
  const nowMs = Date.now();
  if (lock && lock.lockedUntil > nowMs) {
    await appendAuditLog({
      action: "auth.login_blocked",
      entityType: "auth",
      entityId: normalizedEmail || "unknown",
      actorRole: "admin",
      actorEmail: normalizedEmail || "unknown",
      beforeState: null,
      afterState: null,
      metadata: {
        reason: "lockout_active",
        requestIp: req.ip,
        lockedUntil: new Date(lock.lockedUntil).toISOString()
      }
    });
    res.status(429).json({ message: "Account temporarily locked due to failed attempts." });
    return;
  }

  const user = await repositories.users.verifyUserPassword(email, password);
  if (!user) {
    const { attempts, lockedUntil } = registerFailedLoginAttempt(normalizedEmail, req.ip, nowMs);
    await appendAuditLog({
      action: "auth.login_failed",
      entityType: "auth",
      entityId: normalizedEmail || "unknown",
      actorRole: "admin",
      actorEmail: normalizedEmail || "unknown",
      beforeState: null,
      afterState: null,
      metadata: {
        reason: "invalid_credentials",
        attempts,
        requestIp: req.ip,
        lockedUntil: lockedUntil ? new Date(lockedUntil).toISOString() : null
      }
    });
    res.status(401).json({ message: "Invalid email or password" });
    return;
  }

  if (user.role === AppRole.candidate || user.role === AppRole.client) {
    await appendAuditLog({
      action: "auth.login_blocked",
      entityType: "auth",
      entityId: normalizedEmail || "unknown",
      actorRole: user.role === AppRole.client ? "client" : "candidate",
      actorEmail: normalizedEmail || "unknown",
      beforeState: null,
      afterState: null,
      metadata: {
        reason: "role_not_allowed_for_app_login",
        requestIp: req.ip
      }
    });
    res.status(403).json({ message: "This account can only access tokenized links." });
    return;
  }

  if ((user.role === AppRole.super_admin || user.role === AppRole.admin) && env.ADMIN_MFA_CODE && otpCode !== env.ADMIN_MFA_CODE) {
    const { attempts, lockedUntil } = registerFailedLoginAttempt(normalizedEmail, req.ip, nowMs);
    await appendAuditLog({
      action: "auth.login_failed",
      entityType: "auth",
      entityId: normalizedEmail || "unknown",
      actorRole: "admin",
      actorEmail: normalizedEmail || "unknown",
      beforeState: null,
      afterState: null,
      metadata: {
        reason: "invalid_mfa_code",
        attempts,
        requestIp: req.ip,
        lockedUntil: lockedUntil ? new Date(lockedUntil).toISOString() : null
      }
    });
    res.status(401).json({ message: "Invalid MFA code" });
    return;
  }

  clearLoginLocksForEmail(normalizedEmail);

  await repositories.authSessions.revokeActiveSessionsForEmail(user.email);
  const userName = displayNameFromUserRole(user.role);

  const refreshToken = generateRefreshToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  const authSession: AuthSessionRecord = {
    token: refreshToken,
    userId: user.id,
    role: user.role,
    email: user.email,
    name: userName,
    candidateId: undefined,
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString()
  };
  await repositories.authSessions.create(authSession);

  const accessToken = signAccessToken({
    userId: user.id,
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
    actorRole: authActorRole(user.role),
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
  if (!session.userId) return null;
  const userActive = await repositories.users.isUserActive(session.userId);
  if (!userActive) {
    await repositories.authSessions.revokeByToken(refreshToken);
    return null;
  }

  await repositories.authSessions.revokeByToken(refreshToken);

  const nextRefresh = generateRefreshToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await repositories.authSessions.create({
    token: nextRefresh,
    userId: session.userId,
    role: session.role,
    email: session.email,
    name: session.name,
    candidateId: session.candidateId,
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString()
  });

  const accessToken = signAccessToken({
    userId: session.userId,
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
        actorRole: revoked.role === "candidate" ? "candidate" : revoked.role === "client" ? "client" : "admin",
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

router.post("/auth/reset-password", validateBody(resetPasswordCompleteSchema), async (req, res) => {
  const { token, password } = req.body as z.infer<typeof resetPasswordCompleteSchema>;
  const user = await repositories.users.consumePasswordResetToken(token, password);
  if (!user) {
    res.status(400).json({ message: "Invalid or expired reset token" });
    return;
  }
  await appendAuditLog({
    action: "user.password_reset.completed",
    entityType: "auth",
    entityId: user.email,
    actorRole: "admin",
    actorEmail: user.email,
    beforeState: null,
    afterState: { reset: true }
  });
  res.json({ ok: true });
});

router.get("/users", requireAuth, requireRole(AppRole.super_admin), async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const rows = await repositories.users.listManagedUsers(q || undefined);
  res.json(rows);
});

router.post("/users", requireAuth, requireRole(AppRole.super_admin), validateBody(userCreateSchema), async (req, res) => {
  try {
    const payload = req.body as z.infer<typeof userCreateSchema>;
    const created = await repositories.users.createManagedUser({
      email: payload.email,
      username: payload.username,
      role: payload.role,
      password: payload.password
    });
    await appendAuditLog({
      action: "user.create",
      entityType: "auth",
      entityId: created.email,
      actorRole: authActorRole(req.auth!.role),
      actorEmail: req.auth!.email,
      beforeState: null,
      afterState: created
    });
    res.status(201).json(created);
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create user" });
  }
});

router.patch("/users/:id", requireAuth, requireRole(AppRole.super_admin), validateBody(userPatchSchema), async (req, res) => {
  const userId = paramValue(req.params.id);
  const previous = await repositories.users.findManagedUserById(userId);
  if (!previous) {
    res.status(404).json({ message: "User not found" });
    return;
  }
  try {
    const payload = req.body as z.infer<typeof userPatchSchema>;
    const updated = await repositories.users.updateManagedUser(userId, payload);
    await appendAuditLog({
      action: "user.update",
      entityType: "auth",
      entityId: updated.email,
      actorRole: authActorRole(req.auth!.role),
      actorEmail: req.auth!.email,
      beforeState: previous,
      afterState: updated
    });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Failed to update user" });
  }
});

router.post("/users/:id/reset-password", requireAuth, requireRole(AppRole.super_admin), async (req, res) => {
  const userId = paramValue(req.params.id);
  const target = await repositories.users.findManagedUserById(userId);
  if (!target) {
    res.status(404).json({ message: "User not found" });
    return;
  }
  const reset = await repositories.users.createPasswordResetToken(userId);
  const resetLink = `${env.CORS_ORIGIN}/login?resetToken=${encodeURIComponent(reset.token)}`;
  await appendAuditLog({
    action: "user.password_reset.requested",
    entityType: "auth",
    entityId: target.email,
    actorRole: authActorRole(req.auth!.role),
    actorEmail: req.auth!.email,
    beforeState: null,
    afterState: { expiresAt: reset.expiresAt }
  });
  res.json({ resetLink, expiresAt: reset.expiresAt });
});

router.post("/users/:id/set-password", requireAuth, requireRole(AppRole.super_admin), validateBody(setPasswordSchema), async (req, res) => {
  const userId = paramValue(req.params.id);
  const target = await repositories.users.findManagedUserById(userId);
  if (!target) {
    res.status(404).json({ message: "User not found" });
    return;
  }
  const { password } = req.body as z.infer<typeof setPasswordSchema>;
  await repositories.users.setPassword(userId, password);
  await appendAuditLog({
    action: "user.password_set",
    entityType: "auth",
    entityId: target.email,
    actorRole: authActorRole(req.auth!.role),
    actorEmail: req.auth!.email,
    beforeState: null,
    afterState: { changed: true }
  });
  res.json({ ok: true });
});

router.delete("/users/:id", requireAuth, requireRole(AppRole.super_admin), async (req, res) => {
  const userId = paramValue(req.params.id);
  const previous = await repositories.users.findManagedUserById(userId);
  if (!previous) {
    res.status(404).json({ message: "User not found" });
    return;
  }
  try {
    if (!req.auth?.userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    const deleted = await repositories.users.softDeleteManagedUser(userId, req.auth.userId);
    await appendAuditLog({
      action: "user.delete",
      entityType: "auth",
      entityId: deleted.email,
      actorRole: authActorRole(req.auth!.role),
      actorEmail: req.auth!.email,
      beforeState: previous,
      afterState: { deletedAt: new Date().toISOString() }
    });
    res.json({ id: userId, deleted: true });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Failed to delete user" });
  }
});

export default router;
