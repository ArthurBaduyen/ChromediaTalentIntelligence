import { createHash } from "node:crypto";
import { getDbEnv } from "./env";

export function hashPassword(value: string): string {
  const pepper = getDbEnv().TOKEN_HASH_PEPPER;
  return createHash("sha256").update(`pwd:${pepper}:${value}`).digest("hex");
}
