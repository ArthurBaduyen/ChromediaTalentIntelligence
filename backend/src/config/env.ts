import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  TOKEN_HASH_PEPPER: z.string().min(1),
  ACCESS_TOKEN_SECRET: z.string().min(32),
  REFRESH_TOKEN_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  COOKIE_SECURE: z.enum(["true", "false"]).optional(),
  ADMIN_MFA_CODE: z.string().optional(),
  DEMO_SUPER_ADMIN_PASSWORD: z.string().default("password123"),
  DEMO_ADMIN_PASSWORD: z.string().default("password123"),
  DEMO_CLIENT_PASSWORD: z.string().default("password123"),
  DEMO_CANDIDATE_PASSWORD: z.string().default("password123")
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
