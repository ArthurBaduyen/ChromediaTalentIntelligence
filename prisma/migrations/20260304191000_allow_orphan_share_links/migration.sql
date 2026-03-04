ALTER TABLE "share_links"
  ADD COLUMN IF NOT EXISTS "candidate_legacy_id" TEXT;

UPDATE "share_links" AS sl
SET "candidate_legacy_id" = c."legacy_id"
FROM "candidates" AS c
WHERE sl."candidate_id" = c."id"
  AND sl."candidate_legacy_id" IS NULL;

ALTER TABLE "share_links"
  ALTER COLUMN "candidate_legacy_id" SET NOT NULL;

ALTER TABLE "share_links"
  ALTER COLUMN "candidate_id" DROP NOT NULL;

DROP INDEX IF EXISTS "share_links_candidate_id_idx";
CREATE INDEX IF NOT EXISTS "share_links_candidate_id_idx" ON "share_links"("candidate_id");
CREATE INDEX IF NOT EXISTS "share_links_candidate_legacy_id_idx" ON "share_links"("candidate_legacy_id");
