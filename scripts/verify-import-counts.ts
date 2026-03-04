import "dotenv/config";
import { promises as fs } from "node:fs";
import path from "node:path";
import { prisma } from "../backend/src/db/prismaClient";
import type { AuditLogRecord, AuthSessionRecord, CandidateRecord, SharedProfileRecord, SkillsState } from "../backend/src/db/types";

async function readJson<T>(filename: string) {
  const fullPath = path.join(process.cwd(), "backend", "db", filename);
  try {
    const raw = await fs.readFile(fullPath, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      console.warn(`Missing legacy file: ${fullPath} (using empty value)`);
      return ([] as unknown) as T;
    }
    throw error;
  }
}

async function main() {
  const [skillsRaw, candidates, sharedProfiles, authSessions, auditLogs] = await Promise.all([
    readJson<SkillsState | null>("skills.json"),
    readJson<CandidateRecord[]>("candidates.json"),
    readJson<SharedProfileRecord[]>("sharedProfiles.json"),
    readJson<AuthSessionRecord[]>("authSessions.json"),
    readJson<AuditLogRecord[]>("auditLogs.json")
  ]);
  const skills: SkillsState = skillsRaw && Array.isArray((skillsRaw as SkillsState).categories)
    ? (skillsRaw as SkillsState)
    : { categories: [] };

  const [dbCandidates, dbCategories, dbSkills, dbShared, dbSessions, dbAudit] = await Promise.all([
    prisma.candidate.count({ where: { deletedAt: null } }),
    prisma.skillCategory.count({ where: { deletedAt: null } }),
    prisma.skill.count({ where: { deletedAt: null } }),
    prisma.sharedProfile.count({ where: { deletedAt: null } }),
    prisma.authSession.count({ where: { deletedAt: null } }),
    prisma.auditLog.count({ where: { deletedAt: null } })
  ]);

  const expectedSkills = skills.categories.reduce((sum, category) => sum + category.skills.length, 0);

  const checks = [
    ["candidates", candidates.length, dbCandidates],
    ["skill categories", skills.categories.length, dbCategories],
    ["skills", expectedSkills, dbSkills],
    ["shared profiles", sharedProfiles.length, dbShared],
    ["auth sessions", authSessions.length, dbSessions],
    ["audit logs", auditLogs.length, dbAudit]
  ] as const;

  let failed = false;
  for (const [label, fileCount, dbCount] of checks) {
    const ok = fileCount === dbCount;
    if (!ok) failed = true;
    console.log(`${ok ? "OK" : "MISMATCH"}: ${label} (json=${fileCount}, db=${dbCount})`);
  }

  if (failed) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
