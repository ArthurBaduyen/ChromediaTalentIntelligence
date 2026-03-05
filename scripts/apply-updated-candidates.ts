import { promises as fs } from "node:fs";
import path from "node:path";
import type { CandidateRecord } from "../backend/src/db/types";

type UnknownObject = Record<string, unknown>;

const rootDir = process.cwd();
const dbDir = path.join(rootDir, "backend", "db");
const fixedSourcePath = path.join(dbDir, "candidates_updated_skill_levels_fixed.json");
const legacySourcePath = path.join(dbDir, "candidates_updated.json");
const targetPath = path.join(dbDir, "candidates.json");

const VALID_STATUSES: CandidateRecord["status"][] = ["Active", "Inactive", "Pending"];
const VALID_RATES: Array<NonNullable<CandidateRecord["compensation"]>["expectedRate"]> = ["Hourly", "Daily", "Monthly"];

function nowIso() {
  return new Date().toISOString();
}

function asObject(value: unknown): UnknownObject | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as UnknownObject;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function slug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function parseExpectedRate(value: string): NonNullable<CandidateRecord["compensation"]>["expectedRate"] {
  const normalized = value.toLowerCase();
  if (normalized.includes("hour")) return "Hourly";
  if (normalized.includes("day")) return "Daily";
  if (normalized.includes("month")) return "Monthly";
  return "Monthly";
}

function parseExpectedAmount(value: string) {
  const match = value.match(/([\d,.]+)/);
  if (!match) return 1000;
  const parsed = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1000;
}

function formatExpectedSalary(amount: number, rate: NonNullable<CandidateRecord["compensation"]>["expectedRate"]) {
  const unit = rate === "Hourly" ? "Hour" : rate === "Daily" ? "Day" : "Month";
  const formatted = amount.toLocaleString(undefined, {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  });
  return `$${formatted} / ${unit}`;
}

function normalizeStatus(value: string): CandidateRecord["status"] {
  return VALID_STATUSES.includes(value as CandidateRecord["status"]) ? (value as CandidateRecord["status"]) : "Pending";
}

function normalizeCompensation(candidate: UnknownObject) {
  const rawComp = asObject(candidate.compensation);
  const expectedSalary = asString(candidate.expectedSalary);
  const rawRate = asString(rawComp?.expectedRate);
  const expectedRate = VALID_RATES.includes(rawRate as (typeof VALID_RATES)[number])
    ? (rawRate as (typeof VALID_RATES)[number])
    : parseExpectedRate(expectedSalary);
  const expectedAmount = asNumber(rawComp?.expectedAmount) ?? parseExpectedAmount(expectedSalary);

  return {
    expectedAmount,
    expectedRate,
    currency: "USD" as const
  };
}

function normalizeContact(candidate: UnknownObject): CandidateRecord["contact"] | undefined {
  const raw = asObject(candidate.contact);
  if (!raw) return undefined;
  const email = asString(raw.email).toLowerCase();
  const phone = asString(raw.phoneNumber).replace(/\D/g, "").slice(0, 10);
  if (!email && !phone) return undefined;
  return {
    phoneCountryCode: "+63",
    phoneNumber: phone || "9000000000",
    email: email || `${asString(candidate.id) || "candidate"}@example.com`,
    iMessage: asString(raw.iMessage) || undefined
  };
}

function normalizeLocation(candidate: UnknownObject): CandidateRecord["location"] | undefined {
  const raw = asObject(candidate.location);
  if (!raw) return undefined;
  return {
    address: asString(raw.address),
    city: asString(raw.city),
    region: asString(raw.region),
    zipCode: asString(raw.zipCode),
    country: asString(raw.country) || "Philippines"
  };
}

function normalizeProfile(candidate: UnknownObject): CandidateRecord["profile"] {
  const raw = asObject(candidate.profile) ?? {};
  const educationRaw = Array.isArray(raw.education) ? raw.education : [];
  const projectsRaw = Array.isArray(raw.projects) ? raw.projects : [];
  const selectionsRaw = Array.isArray(raw.skillSelections) ? raw.skillSelections : [];

  const education = educationRaw
    .map((entry) => asObject(entry))
    .filter((entry): entry is UnknownObject => entry !== null)
    .map((entry) => ({
      year: asString(entry.year),
      degree: asString(entry.degree),
      school: asString(entry.school)
    }))
    .filter((entry) => entry.year || entry.degree || entry.school);

  const projects = projectsRaw
    .map((entry) => asObject(entry))
    .filter((entry): entry is UnknownObject => entry !== null)
    .map((entry) => ({
      name: asString(entry.name),
      role: asString(entry.role),
      duration: asString(entry.duration),
      summary: asString(entry.summary),
      responsibilities: (Array.isArray(entry.responsibilities) ? entry.responsibilities : [])
        .map((item) => asString(item))
        .filter(Boolean),
      technologies: (Array.isArray(entry.technologies) ? entry.technologies : [])
        .map((item) => asString(item))
        .filter(Boolean)
    }))
    .filter((entry) => entry.name);

  const skillSelections = selectionsRaw
    .map((entry) => asObject(entry))
    .filter((entry): entry is UnknownObject => entry !== null)
    .map((entry) => {
      const selectedRaw = Array.isArray(entry.selectedSubSkills) ? entry.selectedSubSkills : [];
      const selectedSubSkills = selectedRaw
        .map((item) => asObject(item))
        .filter((item): item is UnknownObject => item !== null)
        .map((item) => ({
          skillId: asString(item.skillId),
          level: asString(item.level),
          capabilityId: asString(item.capabilityId),
          text: asString(item.text) || undefined
        }))
        .filter((item) => item.skillId && item.level && item.capabilityId);
      return {
        categoryId: asString(entry.categoryId),
        selectedSubSkills
      };
    })
    .filter((entry) => entry.categoryId && entry.selectedSubSkills.length > 0);

  return {
    about: asString(raw.about),
    experience: asString(raw.experience),
    education,
    projects,
    skillSelections,
    videoTitle: asString(raw.videoTitle) || undefined,
    videoUrl: asString(raw.videoUrl) || undefined,
    coderbyteScore: asString(raw.coderbyteScore) || undefined,
    coderbyteLink: asString(raw.coderbyteLink) || undefined
  };
}

function normalizeCandidate(value: unknown, index: number, ids: Set<string>): CandidateRecord | null {
  const raw = asObject(value);
  if (!raw) return null;

  const name = asString(raw.name);
  if (!name) return null;

  const baseId = asString(raw.id) || slug(name) || `candidate-${index + 1}`;
  let id = baseId;
  let suffix = 1;
  while (ids.has(id)) {
    suffix += 1;
    id = `${baseId}-${suffix}`;
  }
  ids.add(id);

  const compensation = normalizeCompensation(raw);
  const expectedSalary = asString(raw.expectedSalary) || formatExpectedSalary(compensation.expectedAmount, compensation.expectedRate);
  const available = asString(raw.available) || "Yes";
  const status = normalizeStatus(asString(raw.status));
  const createdAt = asString(raw.createdAt) || nowIso();
  const updatedAt = asString(raw.updatedAt) || createdAt;

  return {
    id,
    name,
    role: asString(raw.role) || "Software Engineer",
    technologies: asString(raw.technologies) || "React, TypeScript, PostgreSQL",
    expectedSalary,
    available,
    status,
    contact: normalizeContact(raw),
    location: normalizeLocation(raw),
    compensation,
    employment: {
      contract: asString(asObject(raw.employment)?.contract) || "Independent Contractor",
      availability: asString(asObject(raw.employment)?.availability) || available
    },
    profile: normalizeProfile(raw),
    schemaVersion: typeof raw.schemaVersion === "number" ? Math.trunc(raw.schemaVersion) : 2,
    createdAt,
    updatedAt
  };
}

async function main() {
  const sourcePath = await fs
    .access(fixedSourcePath)
    .then(() => fixedSourcePath)
    .catch(() => legacySourcePath);
  const raw = await fs.readFile(sourcePath, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  const list = Array.isArray(parsed) ? parsed : [];
  const ids = new Set<string>();
  const candidates = list
    .map((item, index) => normalizeCandidate(item, index, ids))
    .filter((item): item is CandidateRecord => item !== null);

  await fs.writeFile(targetPath, `${JSON.stringify(candidates, null, 2)}\n`, "utf8");
  console.log(`Updated ${path.relative(rootDir, targetPath)} from ${path.basename(sourcePath)}`);
  console.log(`- candidates: ${candidates.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
