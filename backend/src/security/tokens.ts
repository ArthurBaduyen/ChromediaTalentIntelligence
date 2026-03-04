import { randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { getAppEnv } from "../config/env";
import type { AccessTokenPayload, AuthUser } from "../types/auth";

export function generateRefreshToken() {
  return `rf_${randomBytes(32).toString("hex")}`;
}

export function generateCsrfToken() {
  return randomBytes(24).toString("hex");
}

export function signAccessToken(user: AuthUser) {
  const env = getAppEnv();
  const payload: AccessTokenPayload = {
    type: "access",
    userId: user.userId,
    role: user.role,
    email: user.email,
    name: user.name,
    candidateId: user.candidateId
  };

  return jwt.sign(payload, env.ACCESS_TOKEN_SECRET, {
    expiresIn: `${env.ACCESS_TOKEN_TTL_MINUTES}m`
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const env = getAppEnv();
    const payload = jwt.verify(token, env.ACCESS_TOKEN_SECRET) as AccessTokenPayload;
    return payload.type === "access" ? payload : null;
  } catch {
    return null;
  }
}
