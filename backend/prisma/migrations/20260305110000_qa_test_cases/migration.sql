CREATE TYPE "TestCasePriority" AS ENUM ('P0', 'P1', 'P2');
CREATE TYPE "TestCaseType" AS ENUM ('Smoke', 'Functional', 'Negative', 'Regression', 'API', 'Integration', 'UI', 'Security', 'Performance');

CREATE TABLE "features" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "roles_involved" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "platforms" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "browsers_or_devices" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "has_api" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "features_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "test_cases" (
  "id" UUID NOT NULL,
  "feature_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "preconditions" TEXT,
  "test_data" JSONB,
  "steps" TEXT[] NOT NULL,
  "expected_results" TEXT[] NOT NULL,
  "post_conditions" TEXT,
  "priority" "TestCasePriority" NOT NULL,
  "type" "TestCaseType" NOT NULL,
  "is_automatable" BOOLEAN NOT NULL DEFAULT false,
  "automation_notes" TEXT,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "test_cases_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "features_name_idx" ON "features"("name");
CREATE INDEX "test_cases_feature_id_idx" ON "test_cases"("feature_id");
CREATE INDEX "test_cases_priority_idx" ON "test_cases"("priority");
CREATE INDEX "test_cases_type_idx" ON "test_cases"("type");
CREATE INDEX "test_cases_is_automatable_idx" ON "test_cases"("is_automatable");

ALTER TABLE "test_cases"
  ADD CONSTRAINT "test_cases_feature_id_fkey"
  FOREIGN KEY ("feature_id") REFERENCES "features"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
