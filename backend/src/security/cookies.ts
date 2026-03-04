import type { CookieOptions } from "express";
import { getAppEnv } from "../config/env";

export const ACCESS_COOKIE = "chromedia_access";
export const REFRESH_COOKIE = "chromedia_refresh";
export const CSRF_COOKIE = "chromedia_csrf";

function isSecureCookie() {
  const env = getAppEnv();
  if (env.COOKIE_SECURE) return env.COOKIE_SECURE === "true";
  return env.NODE_ENV === "production";
}

export function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isSecureCookie(),
    sameSite: "strict",
    path: "/"
  };
}

export function clearCookieOptions(): CookieOptions {
  return {
    ...baseCookieOptions(),
    maxAge: 0
  };
}

export function csrfCookieOptions(): CookieOptions {
  return {
    httpOnly: false,
    secure: isSecureCookie(),
    sameSite: "strict",
    path: "/"
  };
}
