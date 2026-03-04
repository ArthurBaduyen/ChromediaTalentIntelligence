import { prisma } from "../prismaClient";
import { hashToken } from "../utils/tokenHash";
import type { SharedProfileRecord } from "../types";

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : undefined;
}

function toExpirationDate(value: string) {
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  return new Date(`${value}T00:00:00.000Z`);
}

function mapSharedProfile(
  row: {
    legacyId: string;
    candidateLegacyId: string;
    candidate: { legacyId: string } | null;
    candidateName: string;
    candidateRole: string;
    sharedWithName: string;
    sharedWithEmail: string;
    rateLabel: string | null;
    expirationDate: Date;
    sharedAt: Date;
    revokedAt: Date | null;
    accessCount: number;
    lastAccessedAt: Date | null;
  }
): SharedProfileRecord {
  return {
    id: row.legacyId,
    shareToken: row.legacyId,
    candidateId: row.candidate?.legacyId ?? row.candidateLegacyId,
    candidateName: row.candidateName,
    candidateRole: row.candidateRole,
    sharedWithName: row.sharedWithName,
    sharedWithEmail: row.sharedWithEmail,
    rateLabel: row.rateLabel ?? "",
    expirationDate: row.expirationDate.toISOString().slice(0, 10),
    sharedAt: row.sharedAt.toISOString(),
    revokedAt: toIso(row.revokedAt),
    accessCount: row.accessCount,
    lastAccessedAt: toIso(row.lastAccessedAt)
  };
}

export class SharedProfileRepository {
  private async getCandidateDbId(candidateLegacyId: string) {
    const candidate = await prisma.candidate.findFirst({
      where: { legacyId: candidateLegacyId, deletedAt: null },
      select: { id: true }
    });
    return candidate?.id ?? null;
  }

  async list() {
    const rows = await prisma.sharedProfile.findMany({
      where: { deletedAt: null },
      include: { candidate: { select: { legacyId: true } } },
      orderBy: [{ sharedAt: "desc" }, { createdAt: "desc" }]
    });

    return rows.map(mapSharedProfile);
  }

  async findByLegacyId(legacyId: string) {
    const row = await prisma.sharedProfile.findFirst({
      where: { legacyId, deletedAt: null },
      include: { candidate: { select: { legacyId: true } } }
    });
    return row ? mapSharedProfile(row) : null;
  }

  async findByToken(token: string) {
    const tokenHash = hashToken(token);
    const row = await prisma.sharedProfile.findFirst({
      where: { tokenHash, deletedAt: null },
      include: { candidate: { select: { legacyId: true } } }
    });
    return row ? mapSharedProfile(row) : null;
  }

  async upsert(record: SharedProfileRecord) {
    const candidateId = await this.getCandidateDbId(record.candidateId);
    const shareToken = record.shareToken || record.id;
    const tokenHash = hashToken(shareToken);
    const expirationDate = toExpirationDate(record.expirationDate);
    const sharedAt = new Date(record.sharedAt);

    const row = await prisma.sharedProfile.upsert({
      where: { legacyId: record.id },
      create: {
        legacyId: record.id,
        tokenHash,
        candidateId,
        candidateLegacyId: record.candidateId,
        candidateName: record.candidateName,
        candidateRole: record.candidateRole,
        sharedWithName: record.sharedWithName,
        sharedWithEmail: record.sharedWithEmail,
        rateLabel: record.rateLabel,
        expirationDate,
        sharedAt,
        revokedAt: record.revokedAt ? new Date(record.revokedAt) : null,
        accessCount: record.accessCount ?? 0,
        lastAccessedAt: record.lastAccessedAt ? new Date(record.lastAccessedAt) : null,
        deletedAt: null
      },
      update: {
        tokenHash,
        candidateId,
        candidateLegacyId: record.candidateId,
        candidateName: record.candidateName,
        candidateRole: record.candidateRole,
        sharedWithName: record.sharedWithName,
        sharedWithEmail: record.sharedWithEmail,
        rateLabel: record.rateLabel,
        expirationDate,
        sharedAt,
        revokedAt: record.revokedAt ? new Date(record.revokedAt) : null,
        accessCount: record.accessCount ?? 0,
        lastAccessedAt: record.lastAccessedAt ? new Date(record.lastAccessedAt) : null,
        deletedAt: null
      },
      include: { candidate: { select: { legacyId: true } } }
    });

    return mapSharedProfile(row);
  }

  async revoke(legacyId: string) {
    const existing = await prisma.sharedProfile.findUnique({ where: { legacyId } });
    if (!existing || existing.deletedAt) return null;

    const row = await prisma.sharedProfile.update({
      where: { legacyId },
      data: { revokedAt: new Date() },
      include: { candidate: { select: { legacyId: true } } }
    });
    return mapSharedProfile(row);
  }

  async touchAccessByToken(token: string) {
    const tokenHash = hashToken(token);
    const row = await prisma.sharedProfile.findFirst({
      where: { tokenHash, deletedAt: null },
      include: { candidate: { select: { legacyId: true } } }
    });
    if (!row) return null;

    const updated = await prisma.sharedProfile.update({
      where: { id: row.id },
      data: {
        accessCount: row.accessCount + 1,
        lastAccessedAt: new Date()
      },
      include: { candidate: { select: { legacyId: true } } }
    });
    return mapSharedProfile(updated);
  }

  async softDelete(legacyId: string) {
    const existing = await prisma.sharedProfile.findUnique({ where: { legacyId } });
    if (!existing || existing.deletedAt) return null;

    const row = await prisma.sharedProfile.update({
      where: { legacyId },
      data: { deletedAt: new Date() },
      include: { candidate: { select: { legacyId: true } } }
    });
    return mapSharedProfile(row);
  }
}
