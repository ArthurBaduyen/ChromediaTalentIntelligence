-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "app_role" AS ENUM ('admin', 'candidate', 'client');

-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('Active', 'Inactive', 'Pending');

-- CreateEnum
CREATE TYPE "AuditEntityType" AS ENUM ('candidate', 'skills', 'shared_profile', 'auth');

-- CreateEnum
CREATE TYPE "AuditActorRole" AS ENUM ('admin', 'candidate', 'client', 'system');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "app_role" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" UUID NOT NULL,
    "legacy_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role_title" TEXT NOT NULL,
    "expected_salary_label" TEXT,
    "status" "CandidateStatus" NOT NULL DEFAULT 'Pending',
    "available_label" TEXT,
    "technologies_label" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "city" TEXT,
    "region" TEXT,
    "country" TEXT,
    "profile_json" JSONB NOT NULL DEFAULT '{}',
    "contact_json" JSONB,
    "location_json" JSONB,
    "compensation_json" JSONB,
    "employment_json" JSONB,
    "schema_version" INTEGER,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_accounts" (
    "user_id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_accounts_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "client_accounts" (
    "user_id" UUID NOT NULL,
    "company_name" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_accounts_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "role" "app_role" NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "user_id" UUID,
    "candidate_id" UUID,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_links" (
    "id" UUID NOT NULL,
    "legacy_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "candidate_id" UUID NOT NULL,
    "candidate_name" TEXT NOT NULL,
    "candidate_role" TEXT NOT NULL,
    "shared_with_name" TEXT NOT NULL,
    "shared_with_email" TEXT NOT NULL,
    "rate_label" TEXT,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "shared_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "access_count" INTEGER NOT NULL DEFAULT 0,
    "last_accessed_at" TIMESTAMPTZ(6),
    "shared_by_user_id" UUID,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "share_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "legacy_id" TEXT,
    "actor_user_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" "AuditEntityType" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "actor_role" "AuditActorRole" NOT NULL,
    "actor_email" TEXT NOT NULL,
    "before_state" JSONB,
    "after_state" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_taxonomy" (
    "id" INTEGER NOT NULL,
    "taxonomy_version" INTEGER,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_taxonomy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_categories" (
    "id" UUID NOT NULL,
    "legacy_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "description" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "skill_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" UUID NOT NULL,
    "legacy_id" TEXT NOT NULL,
    "category_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "capabilities" JSONB NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_skill_selections" (
    "id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "category_legacy_id" TEXT NOT NULL,
    "skill_legacy_id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "capability_id" TEXT NOT NULL,
    "text" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "candidate_skill_selections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_legacy_id_key" ON "candidates"("legacy_id");

-- CreateIndex
CREATE INDEX "candidates_legacy_id_idx" ON "candidates"("legacy_id");

-- CreateIndex
CREATE INDEX "candidates_full_name_idx" ON "candidates"("full_name");

-- CreateIndex
CREATE INDEX "candidates_contact_email_idx" ON "candidates"("contact_email");

-- CreateIndex
CREATE INDEX "candidates_status_idx" ON "candidates"("status");

-- CreateIndex
CREATE INDEX "candidates_deleted_at_idx" ON "candidates"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_accounts_candidate_id_key" ON "candidate_accounts"("candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_refresh_token_hash_key" ON "user_sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "user_sessions_email_idx" ON "user_sessions"("email");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_expires_at_idx" ON "user_sessions"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "user_sessions_expires_at_idx" ON "user_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "user_sessions_deleted_at_idx" ON "user_sessions"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "share_links_legacy_id_key" ON "share_links"("legacy_id");

-- CreateIndex
CREATE UNIQUE INDEX "share_links_token_hash_key" ON "share_links"("token_hash");

-- CreateIndex
CREATE INDEX "share_links_candidate_id_idx" ON "share_links"("candidate_id");

-- CreateIndex
CREATE INDEX "share_links_expires_at_idx" ON "share_links"("expires_at");

-- CreateIndex
CREATE INDEX "share_links_revoked_at_idx" ON "share_links"("revoked_at");

-- CreateIndex
CREATE INDEX "share_links_shared_at_idx" ON "share_links"("shared_at");

-- CreateIndex
CREATE INDEX "share_links_deleted_at_idx" ON "share_links"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "audit_logs_legacy_id_key" ON "audit_logs"("legacy_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_idx" ON "audit_logs"("actor_user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_deleted_at_idx" ON "audit_logs"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "skill_categories_legacy_id_key" ON "skill_categories"("legacy_id");

-- CreateIndex
CREATE INDEX "skill_categories_name_idx" ON "skill_categories"("name");

-- CreateIndex
CREATE INDEX "skill_categories_deleted_at_idx" ON "skill_categories"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "skills_legacy_id_key" ON "skills"("legacy_id");

-- CreateIndex
CREATE INDEX "skills_category_id_idx" ON "skills"("category_id");

-- CreateIndex
CREATE INDEX "skills_name_idx" ON "skills"("name");

-- CreateIndex
CREATE INDEX "skills_deleted_at_idx" ON "skills"("deleted_at");

-- CreateIndex
CREATE INDEX "candidate_skill_selections_candidate_id_idx" ON "candidate_skill_selections"("candidate_id");

-- CreateIndex
CREATE INDEX "candidate_skill_selections_skill_legacy_id_idx" ON "candidate_skill_selections"("skill_legacy_id");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_skill_selections_candidate_id_category_legacy_id__key" ON "candidate_skill_selections"("candidate_id", "category_legacy_id", "skill_legacy_id", "capability_id");

-- AddForeignKey
ALTER TABLE "candidate_accounts" ADD CONSTRAINT "candidate_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_accounts" ADD CONSTRAINT "candidate_accounts_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_accounts" ADD CONSTRAINT "client_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_shared_by_user_id_fkey" FOREIGN KEY ("shared_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "skill_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_skill_selections" ADD CONSTRAINT "candidate_skill_selections_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

