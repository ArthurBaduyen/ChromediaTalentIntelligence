import type { NextFunction, Request, Response } from "express";
import { timingSafeEqual } from "node:crypto";
import { CSRF_COOKIE } from "../security/cookies";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const EXEMPT_PATHS = new Set(["/api/auth/login", "/api/auth/refresh", "/api/auth/reset-password"]);
const EXEMPT_PREFIXES = ["/api/public-candidate/"];

function safeTokenMatch(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function requireCsrf(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  if (EXEMPT_PATHS.has(req.path)) {
    next();
    return;
  }

  if (EXEMPT_PREFIXES.some((prefix) => req.path.startsWith(prefix))) {
    next();
    return;
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.header("x-csrf-token");
  if (!cookieToken || !headerToken || !safeTokenMatch(cookieToken, headerToken)) {
    res.status(403).json({ message: "Invalid CSRF token" });
    return;
  }

  next();
}
