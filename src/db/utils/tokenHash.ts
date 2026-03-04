import { createHash } from "node:crypto";
import { getDbEnv } from "./env";

export function hashToken(token: string): string {
  const pepper = getDbEnv().TOKEN_HASH_PEPPER;
  return createHash("sha256").update(`${pepper}:${token}`).digest("hex");
}
