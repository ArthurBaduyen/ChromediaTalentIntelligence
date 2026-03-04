import "dotenv/config";
import { promises as fs } from "node:fs";
import path from "node:path";
import { prisma } from "../backend/src/db/prismaClient";
import { repositories } from "../backend/src/db/repositories";
import type { SkillsState } from "../backend/src/db/types";

async function main() {
  const filePath = path.join(process.cwd(), "backend", "db", "skills.json");
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as SkillsState | null;
  const state: SkillsState = parsed && Array.isArray(parsed.categories) ? parsed : { categories: [] };

  const saved = await repositories.skills.replaceState(state);
  const skillCount = saved.categories.reduce((sum, category) => sum + category.skills.length, 0);

  console.log("Imported skills taxonomy to PostgreSQL:");
  console.log(`- categories: ${saved.categories.length}`);
  console.log(`- skills: ${skillCount}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

