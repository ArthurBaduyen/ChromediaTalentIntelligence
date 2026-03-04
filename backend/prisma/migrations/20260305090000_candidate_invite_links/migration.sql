CREATE TABLE "candidate_invite_links" (
  "id" UUID NOT NULL,
  "token_hash" TEXT NOT NULL,
  "candidate_id" UUID NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "revoked_at" TIMESTAMPTZ(6),
  "access_count" INTEGER NOT NULL DEFAULT 0,
  "last_accessed_at" TIMESTAMPTZ(6),
  "deleted_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "candidate_invite_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "candidate_invite_links_token_hash_key" ON "candidate_invite_links"("token_hash");
CREATE INDEX "candidate_invite_links_candidate_id_idx" ON "candidate_invite_links"("candidate_id");
CREATE INDEX "candidate_invite_links_expires_at_idx" ON "candidate_invite_links"("expires_at");
CREATE INDEX "candidate_invite_links_revoked_at_idx" ON "candidate_invite_links"("revoked_at");
CREATE INDEX "candidate_invite_links_deleted_at_idx" ON "candidate_invite_links"("deleted_at");

ALTER TABLE "candidate_invite_links"
  ADD CONSTRAINT "candidate_invite_links_candidate_id_fkey"
  FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
