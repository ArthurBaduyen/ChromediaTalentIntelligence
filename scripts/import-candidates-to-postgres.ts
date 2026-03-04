import "dotenv/config";
import { promises as fs } from "node:fs";
import path from "node:path";
import { prisma } from "../backend/src/db/prismaClient";
import { repositories } from "../backend/src/db/repositories";
import type { CandidateRecord } from "../backend/src/db/types";

async function main() {
  const filePath = path.join(process.cwd(), "backend", "db", "candidates.json");
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  const candidates = Array.isArray(parsed) ? (parsed as CandidateRecord[]) : [];

  for (const candidate of candidates) {
    await repositories.candidates.upsert(candidate);
  }

  console.log("Imported candidates to PostgreSQL:");
  console.log(`- candidates: ${candidates.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

