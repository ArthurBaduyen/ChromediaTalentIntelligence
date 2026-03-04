import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  TOKEN_HASH_PEPPER: z.string().min(1, "TOKEN_HASH_PEPPER is required")
});

export type DbEnv = z.infer<typeof envSchema>;

let cachedEnv: DbEnv | null = null;

export function getDbEnv(): DbEnv {
  if (cachedEnv) return cachedEnv;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Invalid database environment configuration: ${issues}`);
  }
  cachedEnv = parsed.data;
  return parsed.data;
}
