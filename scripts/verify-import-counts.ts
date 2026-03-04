import "dotenv/config";
import { promises as fs } from "node:fs";
import path from "node:path";
import { prisma } from "../src/db/prismaClient";
import type { AuditLogRecord, AuthSessionRecord, CandidateRecord, SharedProfileRecord, SkillsState } from "../src/db/types";

async function readJson<T>(filename: string) {
  const fullPath = path.join(process.cwd(), "db", filename);
  const raw = await fs.readFile(fullPath, "utf8");
  return JSON.parse(raw) as T;
}

async function main() {
  const [skills, candidates, sharedProfiles, authSessions, auditLogs] = await Promise.all([
    readJson<SkillsState>("skills.json"),
    readJson<CandidateRecord[]>("candidates.json"),
    readJson<SharedProfileRecord[]>("sharedProfiles.json"),
    readJson<AuthSessionRecord[]>("authSessions.json"),
    readJson<AuditLogRecord[]>("auditLogs.json")
  ]);

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
