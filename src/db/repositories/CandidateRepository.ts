import { Prisma, type Candidate, type CandidateSkillSelection } from "@prisma/client";
import { prisma } from "../prismaClient";
import type { CandidateRecord } from "../types";

type CandidateWithSelections = Candidate & { skillSelections: CandidateSkillSelection[] };
type CandidateSkillSelectionGroup = {
  categoryId: string;
  selectedSubSkills: Array<{
    skillId: string;
    level: string;
    capabilityId: string;
    text?: string;
  }>;
};

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : undefined;
}

function asRecord<T>(value: Prisma.JsonValue | null | undefined): T | undefined {
  if (!value || typeof value !== "object") return undefined;
  return value as T;
}

function mapSelections(rows: CandidateSkillSelection[]) {
  const grouped = new Map<string, CandidateSkillSelectionGroup>();
  for (const row of rows) {
    const current = grouped.get(row.categoryLegacyId) ?? { categoryId: row.categoryLegacyId, selectedSubSkills: [] };
    current.selectedSubSkills.push({
      skillId: row.skillLegacyId,
      level: row.level,
      capabilityId: row.capabilityId,
      text: row.text ?? undefined
    });
    grouped.set(row.categoryLegacyId, current);
  }
  return Array.from(grouped.values());
}

function mapCandidate(candidate: CandidateWithSelections): CandidateRecord {
  const profile = asRecord<CandidateRecord["profile"]>(candidate.profileJson) ?? {
    about: "",
    experience: "",
    education: [],
    projects: []
  };
  const selectionRows = mapSelections(candidate.skillSelections);
  if (selectionRows.length > 0) {
    profile.skillSelections = selectionRows;
  }

  return {
    id: candidate.legacyId,
    name: candidate.fullName,
    role: candidate.roleTitle,
    technologies: candidate.technologiesLabel ?? "",
    expectedSalary: candidate.expectedSalaryLabel ?? "",
    available: candidate.availableLabel ?? "",
    status: candidate.status,
    contact: asRecord<CandidateRecord["contact"]>(candidate.contactJson),
    location: asRecord<CandidateRecord["location"]>(candidate.locationJson),
    compensation: asRecord<CandidateRecord["compensation"]>(candidate.compensationJson),
    employment: asRecord<CandidateRecord["employment"]>(candidate.employmentJson),
    profile,
    schemaVersion: candidate.schemaVersion ?? undefined,
    createdAt: toIso(candidate.createdAt),
    updatedAt: toIso(candidate.updatedAt)
  };
}

function toStatus(status: CandidateRecord["status"]) {
  if (status === "Active" || status === "Inactive" || status === "Pending") return status;
  return "Pending";
}

export class CandidateRepository {
  async list() {
    const rows = await prisma.candidate.findMany({
      where: { deletedAt: null },
      include: { skillSelections: true },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }]
    });
    return rows.map(mapCandidate);
  }

  async findByLegacyId(legacyId: string) {
    const row = await prisma.candidate.findFirst({
      where: { legacyId, deletedAt: null },
      include: { skillSelections: true }
    });
    return row ? mapCandidate(row) : null;
  }

  async upsert(record: CandidateRecord) {
    const now = new Date();
    const createdAt = record.createdAt ? new Date(record.createdAt) : now;
    const updatedAt = record.updatedAt ? new Date(record.updatedAt) : now;

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.candidate.findUnique({ where: { legacyId: record.id } });
      const data: Prisma.CandidateUncheckedCreateInput = {
        legacyId: record.id,
        fullName: record.name,
        roleTitle: record.role,
        expectedSalaryLabel: record.expectedSalary,
        technologiesLabel: record.technologies,
        availableLabel: record.available,
        status: toStatus(record.status),
        contactEmail: record.contact?.email?.trim().toLowerCase() || null,
        contactPhone: record.contact ? `${record.contact.phoneCountryCode ?? ""}${record.contact.phoneNumber ?? ""}` : null,
        city: record.location?.city ?? null,
        region: record.location?.region ?? null,
        country: record.location?.country ?? null,
        contactJson: record.contact ?? Prisma.JsonNull,
        locationJson: record.location ?? Prisma.JsonNull,
        compensationJson: record.compensation ?? Prisma.JsonNull,
        employmentJson: record.employment ?? Prisma.JsonNull,
        profileJson: { ...(record.profile ?? {}) },
        schemaVersion: record.schemaVersion ?? null,
        createdAt,
        updatedAt,
        deletedAt: null,
        id: existing?.id
      };

      const candidate = existing
        ? await tx.candidate.update({
            where: { id: existing.id },
            data: {
              ...data,
              id: undefined,
              createdAt: existing.createdAt
            }
          })
        : await tx.candidate.create({ data: { ...data, id: undefined } });

      await tx.candidateSkillSelection.deleteMany({ where: { candidateId: candidate.id } });
      const selections = record.profile?.skillSelections ?? [];
      const rows = selections.flatMap((selection) =>
        selection.selectedSubSkills.map((skill) => ({
          candidateId: candidate.id,
          categoryLegacyId: selection.categoryId,
          skillLegacyId: skill.skillId,
          level: skill.level,
          capabilityId: skill.capabilityId,
          text: skill.text ?? null
        }))
      );
      if (rows.length > 0) {
        await tx.candidateSkillSelection.createMany({ data: rows });
      }

      return tx.candidate.findUniqueOrThrow({
        where: { id: candidate.id },
        include: { skillSelections: true }
      });
    });

    return mapCandidate(result);
  }

  async softDelete(legacyId: string) {
    const existing = await prisma.candidate.findUnique({ where: { legacyId } });
    if (!existing || existing.deletedAt) return null;

    const deleted = await prisma.candidate.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
      include: { skillSelections: true }
    });
    return mapCandidate(deleted);
  }

  async getIdMapByLegacyIds(legacyIds: string[]) {
    if (legacyIds.length === 0) return new Map<string, string>();
    const rows = await prisma.candidate.findMany({
      where: { legacyId: { in: legacyIds } },
      select: { id: true, legacyId: true }
    });
    return new Map(rows.map((row) => [row.legacyId, row.id]));
  }
}
