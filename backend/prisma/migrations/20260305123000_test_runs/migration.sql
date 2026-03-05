CREATE TYPE "TestRunStatus" AS ENUM ('InProgress', 'Completed');
CREATE TYPE "TestExecutionStatus" AS ENUM ('NotRun', 'Pass', 'Fail', 'Blocked');

CREATE TABLE "test_runs" (
  "id" UUID NOT NULL,
  "feature_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "tester" TEXT,
  "notes" TEXT,
  "status" "TestRunStatus" NOT NULL DEFAULT 'InProgress',
  "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "test_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "test_run_results" (
  "id" UUID NOT NULL,
  "run_id" UUID NOT NULL,
  "test_case_id" UUID NOT NULL,
  "status" "TestExecutionStatus" NOT NULL DEFAULT 'NotRun',
  "tested_by" TEXT,
  "notes" TEXT,
  "defect_link" TEXT,
  "executed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "test_run_results_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "test_run_results_run_id_test_case_id_key" ON "test_run_results"("run_id", "test_case_id");
CREATE INDEX "test_runs_feature_id_idx" ON "test_runs"("feature_id");
CREATE INDEX "test_runs_status_idx" ON "test_runs"("status");
CREATE INDEX "test_runs_started_at_idx" ON "test_runs"("started_at");
CREATE INDEX "test_run_results_run_id_idx" ON "test_run_results"("run_id");
CREATE INDEX "test_run_results_test_case_id_idx" ON "test_run_results"("test_case_id");
CREATE INDEX "test_run_results_status_idx" ON "test_run_results"("status");

ALTER TABLE "test_runs"
  ADD CONSTRAINT "test_runs_feature_id_fkey"
  FOREIGN KEY ("feature_id") REFERENCES "features"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "test_run_results"
  ADD CONSTRAINT "test_run_results_run_id_fkey"
  FOREIGN KEY ("run_id") REFERENCES "test_runs"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "test_run_results"
  ADD CONSTRAINT "test_run_results_test_case_id_fkey"
  FOREIGN KEY ("test_case_id") REFERENCES "test_cases"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
