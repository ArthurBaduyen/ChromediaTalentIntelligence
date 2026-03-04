import { promises as fs } from "node:fs";
import path from "node:path";
import { seedCandidates } from "../frontend/src/features/admin/data/candidatesDb";
import { seedSkillsState } from "../frontend/src/features/admin/data/skillsDb";

const root = process.cwd();
const dbDir = path.join(root, "backend", "db");

type SharedProfileRecord = {
  id: string;
  shareToken: string;
  candidateId: string;
  candidateName: string;
  candidateRole: string;
  sharedWithName: string;
  sharedWithEmail: string;
  rateLabel: string;
  expirationDate: string;
  sharedAt: string;
  revokedAt?: string;
  accessCount?: number;
  lastAccessedAt?: string;
};

function nowIso() {
  return new Date().toISOString();
}

function inDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function buildSharedProfiles() {
  const picks = seedCandidates.slice(0, 5);
  const names = [
    ["Arnel White", "arnel.white@mail.com"],
    ["Sasha Lim", "sasha.lim@mail.com"],
    ["Noah Cruz", "noah.cruz@mail.com"],
    ["Leah Yu", "leah.yu@mail.com"],
    ["Kian Reyes", "kian.reyes@mail.com"]
  ] as const;

  return picks.map((candidate, index) => {
    const id = `share-${Date.now() + index}-seed${index + 1}`;
    const row: SharedProfileRecord = {
      id,
      shareToken: id,
      candidateId: candidate.id,
      candidateName: candidate.name,
      candidateRole: candidate.role,
      sharedWithName: names[index][0],
      sharedWithEmail: names[index][1],
      rateLabel: "$80 - Daily - All Days",
      expirationDate: inDays(14 + index),
      sharedAt: nowIso(),
      accessCount: index * 2,
      lastAccessedAt: nowIso()
    };

    if (index === 4) {
      row.revokedAt = nowIso();
    }
    return row;
  });
}

async function ensureFileIfMissing(filePath: string, fallback: unknown) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(fallback, null, 2), "utf8");
  }
}

async function main() {
  await fs.mkdir(dbDir, { recursive: true });

  const candidatesPath = path.join(dbDir, "candidates.json");
  const skillsPath = path.join(dbDir, "skills.json");
  const sharedProfilesPath = path.join(dbDir, "sharedProfiles.json");
  const auditLogsPath = path.join(dbDir, "auditLogs.json");
  const authSessionsPath = path.join(dbDir, "authSessions.json");

  await fs.writeFile(candidatesPath, JSON.stringify(seedCandidates, null, 2), "utf8");
  await fs.writeFile(skillsPath, JSON.stringify(seedSkillsState, null, 2), "utf8");
  await fs.writeFile(sharedProfilesPath, JSON.stringify(buildSharedProfiles(), null, 2), "utf8");

  await ensureFileIfMissing(auditLogsPath, []);
  await ensureFileIfMissing(authSessionsPath, []);

  console.log("Dummy JSON restored:");
  console.log(`- ${candidatesPath}`);
  console.log(`- ${skillsPath}`);
  console.log(`- ${sharedProfilesPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
