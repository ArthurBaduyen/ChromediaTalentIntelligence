import { Router } from "express";
import { z } from "zod";
import { repositories } from "../db/repositories";
import type { AuditLogRecord, CandidateRecord, SharedProfileRecord } from "../db/types";
import { validateBody } from "../middleware/validate";

const router = Router();

const publicCandidateSkillsUpdateSchema = z
  .object({
    skillSelections: z.array(
      z
        .object({
          categoryId: z.string().min(1),
          selectedSubSkills: z.array(
            z
              .object({
                skillId: z.string().min(1),
                level: z.string().min(1),
                capabilityId: z.string().min(1),
                text: z.string().optional()
              })
              .strict()
          )
        })
        .strict()
    )
  })
  .strict();

type SkillSelectionsInput = z.infer<typeof publicCandidateSkillsUpdateSchema>["skillSelections"];

function paramValue(value: unknown) {
  if (Array.isArray(value)) return String(value[0] ?? "");
  return String(value ?? "");
}

function isShareLinkUsable(record: SharedProfileRecord) {
  if (record.revokedAt) return false;
  const expiration = new Date(record.expirationDate);
  if (Number.isNaN(expiration.getTime())) return false;
  const now = new Date();
  const startNow = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startExp = new Date(expiration.getFullYear(), expiration.getMonth(), expiration.getDate()).getTime();
  return startExp >= startNow;
}

function withUpdatedSkillSelections(candidate: CandidateRecord, skillSelections: SkillSelectionsInput) {
  return {
    ...candidate,
    profile: {
      about: candidate.profile?.about ?? "",
      experience: candidate.profile?.experience ?? "",
      education: candidate.profile?.education ?? [],
      projects: candidate.profile?.projects ?? [],
      skillSelections,
      videoTitle: candidate.profile?.videoTitle ?? "",
      videoUrl: candidate.profile?.videoUrl ?? "",
      coderbyteScore: candidate.profile?.coderbyteScore ?? "",
      coderbyteLink: candidate.profile?.coderbyteLink ?? ""
    }
  };
}

async function appendAuditLog(record: Omit<AuditLogRecord, "id" | "createdAt">) {
  await repositories.auditLogs.append(record);
}

router.get("/public-shares/:token", async (req, res) => {
  const record = await repositories.sharedProfiles.findByToken(req.params.token);
  if (!record || !isShareLinkUsable(record)) {
    res.status(404).json({ message: "Share link not found" });
    return;
  }
  res.json(record);
});

router.get("/public-shares/:token/candidate", async (req, res) => {
  const link = await repositories.sharedProfiles.findByToken(req.params.token);
  if (!link || !isShareLinkUsable(link)) {
    res.status(404).json({ message: "Share link expired" });
    return;
  }
  await repositories.sharedProfiles.touchAccessByToken(req.params.token);
  const candidate = await repositories.candidates.findByLegacyId(link.candidateId);
  if (!candidate) {
    res.status(404).json({ message: "Candidate not found" });
    return;
  }
  await appendAuditLog({
    action: "shared_profile.open",
    entityType: "shared_profile",
    entityId: link.id,
    actorRole: "client",
    actorEmail: link.sharedWithEmail,
    beforeState: null,
    afterState: { opened: true },
    metadata: {
      ip: req.ip,
      userAgent: req.headers["user-agent"] ?? ""
    }
  });
  res.json(candidate);
});

router.get("/public-candidate/:token", async (req, res) => {
  const token = paramValue(req.params.token);
  const invite = await repositories.candidateInviteLinks.findActiveByToken(token);
  if (!invite) {
    res.status(404).json({ message: "Candidate link not found" });
    return;
  }

  await repositories.candidateInviteLinks.touchAccessByToken(token);
  const candidate = await repositories.candidates.findByLegacyId(invite.candidateId);
  if (!candidate) {
    res.status(404).json({ message: "Candidate not found" });
    return;
  }

  res.json(candidate);
});

router.put("/public-candidate/:token/skills", validateBody(publicCandidateSkillsUpdateSchema), async (req, res) => {
  const token = paramValue(req.params.token);
  const invite = await repositories.candidateInviteLinks.findActiveByToken(token);
  if (!invite) {
    res.status(404).json({ message: "Candidate link not found" });
    return;
  }
  const candidate = await repositories.candidates.findByLegacyId(invite.candidateId);
  if (!candidate) {
    res.status(404).json({ message: "Candidate not found" });
    return;
  }

  const { skillSelections } = req.body as z.infer<typeof publicCandidateSkillsUpdateSchema>;
  const updated = await repositories.candidates.upsert(withUpdatedSkillSelections(candidate, skillSelections));
  await repositories.candidateInviteLinks.touchAccessByToken(token);
  await appendAuditLog({
    action: "candidate.skills_submitted",
    entityType: "candidate",
    entityId: candidate.id,
    actorRole: "candidate",
    actorEmail: `${candidate.id}@candidate-link.local`,
    beforeState: null,
    afterState: { skillSelectionCount: skillSelections.length },
    metadata: {
      via: "candidate_invite_link",
      requestIp: req.ip,
      userAgent: req.headers["user-agent"] ?? ""
    }
  });
  res.json(updated);
});

export default router;
