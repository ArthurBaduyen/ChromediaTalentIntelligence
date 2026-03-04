import { randomBytes } from "node:crypto";
import { prisma } from "../prismaClient";
import { hashToken } from "../utils/tokenHash";

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : undefined;
}

function generateInviteToken() {
  return `cl_${randomBytes(24).toString("hex")}`;
}

type CandidateInviteLinkRow = {
  candidate: { legacyId: string };
  expiresAt: Date;
  revokedAt: Date | null;
  accessCount: number;
  lastAccessedAt: Date | null;
};

function mapRecord(row: CandidateInviteLinkRow) {
  return {
    candidateId: row.candidate.legacyId,
    expiresAt: row.expiresAt.toISOString(),
    revokedAt: toIso(row.revokedAt),
    accessCount: row.accessCount,
    lastAccessedAt: toIso(row.lastAccessedAt)
  };
}

export class CandidateInviteLinkRepository {
  async create(candidateLegacyId: string, expirationDate?: string) {
    const candidate = await prisma.candidate.findFirst({
      where: { legacyId: candidateLegacyId, deletedAt: null },
      select: { id: true, legacyId: true }
    });
    if (!candidate) {
      throw new Error("Candidate not found");
    }

    const token = generateInviteToken();
    const tokenHash = hashToken(token);
    const expiresAt = expirationDate ? new Date(expirationDate) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    if (Number.isNaN(expiresAt.getTime())) {
      throw new Error("Invalid expiration date");
    }

    const created = await prisma.candidateInviteLink.create({
      data: {
        tokenHash,
        candidateId: candidate.id,
        expiresAt,
        revokedAt: null,
        deletedAt: null
      },
      include: { candidate: { select: { legacyId: true } } }
    });

    return {
      token,
      ...mapRecord(created)
    };
  }

  async findActiveByToken(token: string) {
    const tokenHash = hashToken(token);
    const now = new Date();
    const row = await prisma.candidateInviteLink.findFirst({
      where: {
        tokenHash,
        deletedAt: null,
        revokedAt: null,
        expiresAt: { gt: now }
      },
      include: { candidate: { select: { legacyId: true } } }
    });
    if (!row) return null;
    return mapRecord(row);
  }

  async touchAccessByToken(token: string) {
    const tokenHash = hashToken(token);
    const row = await prisma.candidateInviteLink.findFirst({
      where: { tokenHash, deletedAt: null },
      include: { candidate: { select: { legacyId: true } } }
    });
    if (!row) return null;

    const updated = await prisma.candidateInviteLink.update({
      where: { id: row.id },
      data: {
        accessCount: row.accessCount + 1,
        lastAccessedAt: new Date()
      },
      include: { candidate: { select: { legacyId: true } } }
    });

    return mapRecord(updated);
  }
}
