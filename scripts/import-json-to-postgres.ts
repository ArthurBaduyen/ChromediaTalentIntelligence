import "dotenv/config";
import { promises as fs } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { prisma } from "../backend/src/db/prismaClient";
import { repositories } from "../backend/src/db/repositories";
import type {
  AuditLogRecord,
  AuthSessionRecord,
  CandidateRecord,
  SharedProfileRecord,
  SkillsState,
  DemoUser
} from "../backend/src/db/types";

const root = process.cwd();
const dbDir = path.join(root, "backend", "db");
const wipeRequested = process.argv.includes("--wipe");

const demoUsers: DemoUser[] = [
  { role: "admin", email: "admin@chromedia.local", password: "password123", name: "Admin User" },
  {
    role: "candidate",
    email: "candidate@chromedia.local",
    password: "password123",
    name: "Alex Morgan",
    candidateId: "alex-morgan"
  },
  { role: "client", email: "client@chromedia.local", password: "password123", name: "Client User" }
];

async function readJsonFile<T>(filename: string): Promise<T> {
  const filePath = path.join(dbDir, filename);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      console.warn(`Skipping missing file: ${filePath}`);
      return ([] as unknown) as T;
    }
    throw error;
  }
}

async function wipeDatabase() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("--wipe is disabled in production.");
  }

  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "candidate_skill_selections",
      "skills",
      "skill_categories",
      "skill_taxonomy",
      "share_links",
      "user_sessions",
      "candidate_accounts",
      "client_accounts",
      "audit_logs",
      "candidates",
      "users"
    RESTART IDENTITY CASCADE
  `);
}

async function main() {
  if (wipeRequested) {
    console.log("Wiping database before import...");
    await wipeDatabase();
  }

  const [skillsStateRaw, candidates, sharedProfiles, authSessions, auditLogs] = await Promise.all([
    readJsonFile<SkillsState | null>("skills.json"),
    readJsonFile<CandidateRecord[]>("candidates.json"),
    readJsonFile<SharedProfileRecord[]>("sharedProfiles.json"),
    readJsonFile<AuthSessionRecord[]>("authSessions.json"),
    readJsonFile<AuditLogRecord[]>("auditLogs.json")
  ]);
  const skillsState: SkillsState = skillsStateRaw && Array.isArray((skillsStateRaw as SkillsState).categories)
    ? (skillsStateRaw as SkillsState)
    : { categories: [] };

  console.log("Importing skills taxonomy...");
  await repositories.skills.replaceState(skillsState);

  console.log("Importing candidates...");
  const candidateIdMap = new Map<string, string>();
  for (const candidate of candidates) {
    const legacyId = candidate.id?.trim() || `candidate-${randomUUID()}`;
    if (candidate.id?.trim()) {
      candidateIdMap.set(candidate.id, legacyId);
    }
    await repositories.candidates.upsert({ ...candidate, id: legacyId });
  }

  console.log("Upserting demo users...");
  for (const user of demoUsers) {
    await repositories.users.upsertDemoUser(user);
  }

  console.log("Importing shared profiles...");
  for (const sharedProfile of sharedProfiles) {
    const originalCandidateId = sharedProfile.candidateId;
    const mappedCandidateId = candidateIdMap.get(originalCandidateId) ?? originalCandidateId;
    const legacyId = sharedProfile.id?.trim() || `share-${randomUUID()}`;
    const shareToken = sharedProfile.shareToken || legacyId;
    await repositories.sharedProfiles.upsert({
      ...sharedProfile,
      id: legacyId,
      shareToken,
      candidateId: mappedCandidateId
    });
  }

  console.log("Importing auth sessions...");
  for (const session of authSessions) {
    const token = session.token?.trim() || `sess_${randomUUID()}`;
    const mappedCandidateId = session.candidateId ? candidateIdMap.get(session.candidateId) ?? session.candidateId : undefined;
    await repositories.authSessions.create({
      ...session,
      token,
      candidateId: mappedCandidateId
    });
  }

  console.log("Importing audit logs...");
  for (const auditLog of auditLogs) {
    await repositories.auditLogs.importOne({
      ...auditLog,
      id: auditLog.id?.trim() || `audit_${randomUUID()}`,
      entityId: auditLog.entityId?.trim() || "unknown"
    });
  }

  console.log("Import complete.");
}

main()
  .catch((error) => {
    console.error("Import failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
