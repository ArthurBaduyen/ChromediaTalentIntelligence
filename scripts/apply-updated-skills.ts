import { promises as fs } from "node:fs";
import path from "node:path";

type RawCapability = { level?: unknown; entries?: unknown };
type RawSkill = { id?: unknown; name?: unknown; capabilities?: unknown };
type RawCategory = { id?: unknown; name?: unknown; skills?: unknown };
type RawSkillsState = { taxonomyVersion?: unknown; updatedAt?: unknown; categories?: unknown };

const rootDir = process.cwd();
const dbDir = path.join(rootDir, "backend", "db");
const sourcePath = path.join(dbDir, "skills_updated.json");
const targetPath = path.join(dbDir, "skills.json");

const CAPABILITY_LEVELS = ["Entry Level", "Mid Level", "Senior Level", "Senior Lead Level"] as const;

type NormalizedCapability = { level: string; entries: string[] };
type NormalizedSkill = {
  id: string;
  name: string;
  code?: string;
  description?: string;
  capabilities: NormalizedCapability[];
  createdAt: string;
  updatedAt: string;
};
type NormalizedCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  skills: NormalizedSkill[];
  createdAt: string;
  updatedAt: string;
};
type NormalizedSkillsState = {
  taxonomyVersion: number;
  updatedAt: string;
  categories: NormalizedCategory[];
};

function nowIso() {
  return new Date().toISOString();
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function slug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function unique<T>(items: T[], key: (item: T) => string) {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const token = key(item);
    if (!token || seen.has(token)) continue;
    seen.add(token);
    out.push(item);
  }
  return out;
}

function normalizeCapabilities(raw: unknown): NormalizedCapability[] {
  const list = Array.isArray(raw) ? (raw as RawCapability[]) : [];
  const byLevel = new Map<string, string[]>();

  for (const row of list) {
    const level = asString(row.level);
    if (!level) continue;
    const rawEntries = Array.isArray(row.entries) ? row.entries : [];
    const entries = unique(
      rawEntries
        .map((entry) => asString(entry))
        .filter(Boolean),
      (entry) => entry.toLowerCase()
    );
    byLevel.set(level, entries);
  }

  const normalized = CAPABILITY_LEVELS.map((level) => ({
    level,
    entries: byLevel.get(level) ?? []
  }));

  return normalized;
}

function normalizeSkills(raw: unknown, categoryId: string, timestamp: string): NormalizedSkill[] {
  const list = Array.isArray(raw) ? (raw as RawSkill[]) : [];
  const mapped = list
    .map((row, index) => {
      const name = asString(row.name);
      if (!name) return null;
      const id = asString(row.id) || `skill-${categoryId}-${slug(name)}-${index + 1}`;
      return {
        id,
        name,
        capabilities: normalizeCapabilities(row.capabilities),
        createdAt: timestamp,
        updatedAt: timestamp
      } satisfies NormalizedSkill;
    })
    .filter((item): item is NormalizedSkill => item !== null);

  return unique(mapped, (skill) => skill.id);
}

function normalizeCategories(raw: unknown, timestamp: string): NormalizedCategory[] {
  const list = Array.isArray(raw) ? (raw as RawCategory[]) : [];
  const mapped = list
    .map((row, index) => {
      const name = asString(row.name);
      if (!name) return null;
      const id = asString(row.id) || `cat-${slug(name)}-${index + 1}`;
      const skills = normalizeSkills(row.skills, id, timestamp);
      return {
        id,
        name,
        slug: slug(name),
        skills,
        createdAt: timestamp,
        updatedAt: timestamp
      } satisfies NormalizedCategory;
    })
    .filter((item): item is NormalizedCategory => item !== null);

  return unique(mapped, (category) => category.id);
}

async function main() {
  const raw = await fs.readFile(sourcePath, "utf8");
  const parsed = JSON.parse(raw) as RawSkillsState;
  const timestamp = nowIso();
  const categories = normalizeCategories(parsed.categories, timestamp);

  const normalized: NormalizedSkillsState = {
    taxonomyVersion:
      typeof parsed.taxonomyVersion === "number" && Number.isFinite(parsed.taxonomyVersion)
        ? Math.trunc(parsed.taxonomyVersion)
        : 2,
    updatedAt: asString(parsed.updatedAt) || timestamp,
    categories
  };

  await fs.writeFile(targetPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");

  const skillsCount = categories.reduce((sum, category) => sum + category.skills.length, 0);
  console.log(`Updated ${path.relative(rootDir, targetPath)} from skills_updated.json`);
  console.log(`- categories: ${categories.length}`);
  console.log(`- skills: ${skillsCount}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

