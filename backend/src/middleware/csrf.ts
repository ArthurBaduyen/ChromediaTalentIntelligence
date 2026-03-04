import type { NextFunction, Request, Response } from "express";
import { CSRF_COOKIE } from "../security/cookies";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const EXEMPT_PATHS = new Set(["/api/auth/login", "/api/auth/refresh"]);

export function requireCsrf(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  if (EXEMPT_PATHS.has(req.path)) {
    next();
    return;
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.header("x-csrf-token");
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    res.status(403).json({ message: "Invalid CSRF token" });
    return;
  }

  next();
}
