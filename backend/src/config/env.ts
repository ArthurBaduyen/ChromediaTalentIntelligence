import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  TRUST_PROXY_HOPS: z.coerce.number().int().nonnegative().default(1),
  DATABASE_URL: z.string().min(1),
  TOKEN_HASH_PEPPER: z.string().min(1),
  ACCESS_TOKEN_SECRET: z.string().min(32),
  REFRESH_TOKEN_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  CORS_ORIGINS: z.string().optional(),
  COOKIE_SECURE: z.enum(["true", "false"]).optional(),
  GLOBAL_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  GLOBAL_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  LOGIN_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  LOGIN_LOCKOUT_MINUTES: z.coerce.number().int().positive().default(15),
  LOGIN_ATTEMPT_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),
  ADMIN_MFA_CODE: z.string().optional(),
  DEMO_SUPER_ADMIN_PASSWORD: z.string().default("password123"),
  DEMO_ADMIN_PASSWORD: z.string().default("password123")
});

export type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | null = null;

export function getAppEnv(): AppEnv {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Invalid environment: ${details}`);
  }
  cached = parsed.data;
  return parsed.data;
}
