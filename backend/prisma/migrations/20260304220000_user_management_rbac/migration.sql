-- Add super_admin role
ALTER TYPE "app_role" ADD VALUE IF NOT EXISTS 'super_admin';

-- Users table enhancements
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_enabled" BOOLEAN NOT NULL DEFAULT true;

UPDATE "users"
SET "username" = split_part("email", '@', 1)
WHERE "username" IS NULL;

-- Ensure unique usernames if email local-part collides
WITH duplicates AS (
  SELECT id,
         username,
         ROW_NUMBER() OVER (PARTITION BY username ORDER BY created_at, id) AS rn
  FROM users
)
UPDATE users u
SET username = CONCAT(u.username, '_', d.rn)
FROM duplicates d
WHERE u.id = d.id
  AND d.rn > 1;

UPDATE "users"
SET "is_enabled" = COALESCE("is_active", true)
WHERE "is_enabled" IS DISTINCT FROM COALESCE("is_active", true);

ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE "users" DROP COLUMN "is_active";
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username");
CREATE INDEX IF NOT EXISTS "users_is_enabled_idx" ON "users"("is_enabled");

-- Sessions: optional activity timestamp
ALTER TABLE "user_sessions" ADD COLUMN IF NOT EXISTS "last_seen_at" TIMESTAMPTZ(6);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "used_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_user_id_expires_at_idx" ON "password_reset_tokens"("user_id", "expires_at");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_used_at_idx" ON "password_reset_tokens"("used_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'password_reset_tokens_user_id_fkey'
      AND table_name = 'password_reset_tokens'
  ) THEN
    ALTER TABLE "password_reset_tokens"
      ADD CONSTRAINT "password_reset_tokens_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
