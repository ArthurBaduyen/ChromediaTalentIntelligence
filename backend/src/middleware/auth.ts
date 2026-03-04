import type { NextFunction, Request, Response } from "express";
import { AppRole } from "@prisma/client";
import { repositories } from "../db/repositories";
import { ACCESS_COOKIE } from "../security/cookies";
import { verifyAccessToken } from "../security/tokens";

function sendUnauthorized(res: Response, message = "Authentication required") {
  res.status(401).json({ message });
}

function toAuditActorRole(role: AppRole) {
  if (role === AppRole.candidate) return "candidate" as const;
  if (role === AppRole.client) return "client" as const;
  return "admin" as const;
}

export async function attachAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (!token) return next();
  const payload = verifyAccessToken(token);
  if (payload) {
    if (!payload.userId) {
      return next();
    }
    const userActive = await repositories.users.isUserActive(payload.userId);
    if (!userActive) {
      return next();
    }
    req.auth = payload;
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.auth) {
    sendUnauthorized(res);
    return;
  }
  next();
}

export function requireRole(...roles: AppRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      sendUnauthorized(res);
      return;
    }
    if (!roles.includes(req.auth.role)) {
      await repositories.auditLogs.append({
        action: "auth.forbidden",
        entityType: "auth",
        entityId: req.path,
        actorRole: toAuditActorRole(req.auth.role),
        actorEmail: req.auth.email,
        beforeState: null,
        afterState: null,
        metadata: {
          method: req.method,
          reason: "role_not_allowed",
          requiredRoles: roles,
          actualRole: req.auth.role
        }
      });
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    next();
  };
}

export async function requireCandidateOwner(req: Request, res: Response, next: NextFunction) {
  if (!req.auth) {
    sendUnauthorized(res);
    return;
  }
  if (req.auth.role === AppRole.admin) {
    next();
    return;
  }
  const candidateId = req.params.id ?? req.params.candidateId;
  const entityId = Array.isArray(candidateId) ? candidateId[0] : candidateId;
  if (req.auth.role === AppRole.candidate && req.auth.candidateId === entityId) {
    next();
    return;
  }

  await repositories.auditLogs.append({
    action: "auth.forbidden",
    entityType: "candidate",
    entityId: entityId ?? "unknown",
    actorRole: toAuditActorRole(req.auth.role),
    actorEmail: req.auth.email,
    beforeState: null,
    afterState: null,
    metadata: {
      method: req.method,
      reason: "candidate_ownership_violation"
    }
  });
  res.status(403).json({ message: "Forbidden" });
}
