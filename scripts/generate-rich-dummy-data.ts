import { promises as fs } from "node:fs";
import path from "node:path";
import { seedSkillsState } from "../frontend/src/features/admin/data/skillsDb";
import type { CandidateRecord } from "../backend/src/db/types";

const dbDir = path.join(process.cwd(), "backend", "db");

const firstNames = [
  "Alex", "Jamie", "Riley", "Casey", "Jordan", "Avery", "Morgan", "Taylor", "Cameron", "Drew",
  "Harper", "Quinn", "Rowan", "Reese", "Skyler", "Logan", "Kai", "Blake", "Parker", "Sage"
];
const lastNames = [
  "Santos", "Reyes", "Garcia", "Cruz", "Lim", "Tan", "Mendoza", "Flores", "Yu", "Patel",
  "Morgan", "Smith", "Johnson", "Lee", "Nolasco", "Torres", "Diaz", "Ramos", "Navarro", "Castillo"
];
const cities = ["Makati", "Taguig", "Cebu", "Davao", "Quezon City", "Pasig", "Iloilo", "Baguio"];
const regions = ["NCR", "Region VII", "Region XI", "Region VI", "CAR"];
const countries = ["Philippines", "Philippines", "Philippines", "Remote"];
const roles = [
  "Sr Frontend Developer", "Backend Developer", "Data Engineer", "QA Automation Engineer", "Product Designer",
  "ML Engineer", "Mobile Developer", "DevOps Engineer", "Analytics Engineer", "Full Stack Developer"
];
const statusValues: CandidateRecord["status"][] = ["Active", "Active", "Active", "Pending", "Inactive"];

function rand<T>(arr: T[], i: number) {
  return arr[i % arr.length];
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
}

function amountLabel(amount: number, rate: "Hourly" | "Daily" | "Monthly") {
  const unit = rate === "Hourly" ? "Hour" : rate === "Daily" ? "Day" : "Month";
  return `$${amount.toLocaleString("en-US")} / ${unit}`;
}

function buildCandidate(index: number): CandidateRecord {
  const first = firstNames[index % firstNames.length];
  const last = lastNames[Math.floor(index / firstNames.length) % lastNames.length];
  const name = `${first} ${last}`;
  const role = rand(roles, index);
  const status = rand(statusValues, index);
  const expectedRate = index % 3 === 0 ? "Monthly" : index % 3 === 1 ? "Daily" : "Hourly";
  const expectedAmount = expectedRate === "Monthly" ? 1800 + index * 10 : expectedRate === "Daily" ? 80 + (index % 20) : 12 + (index % 25);
  const skillSelections = seedSkillsState.categories.slice(0, 3).map((category) => ({
    categoryId: category.id,
    selectedSubSkills: category.skills.slice(0, 2).map((skill, skillIndex) => ({
      skillId: skill.id,
      level: skill.capabilities[1]?.level ?? "Mid Level",
      capabilityId: `${skill.id}::${skill.capabilities[1]?.level ?? "Mid Level"}::${skillIndex}`,
      text: skill.capabilities[1]?.entries[skillIndex] ?? skill.capabilities[0]?.entries[0] ?? ""
    }))
  }));

  return {
    id: slug(name),
    name,
    role,
    technologies: "React, TypeScript, PostgreSQL, Jest",
    expectedSalary: amountLabel(expectedAmount, expectedRate),
    available: index % 4 === 0 ? "in 2 weeks" : "Yes",
    status,
    contact: {
      phoneCountryCode: "+63",
      phoneNumber: `9${String(100000000 + index).slice(0, 9)}`,
      email: `${slug(name)}@example.com`
    },
    location: {
      address: `${100 + index} Sample Street`,
      city: rand(cities, index),
      region: rand(regions, index + 1),
      zipCode: `${1000 + (index % 9000)}`,
      country: rand(countries, index)
    },
    compensation: {
      expectedAmount,
      expectedRate,
      currency: "USD"
    },
    employment: {
      contract: "Independent Contractor",
      availability: index % 4 === 0 ? "in 2 weeks" : "Immediate"
    },
    profile: {
      about: `${name} is a ${role.toLowerCase()} with strong delivery discipline and collaboration skills.`,
      experience: `Over ${2 + (index % 10)} years of professional engineering experience in product teams.`,
      education: [
        { year: "2018", degree: "BS Computer Science", school: "University of the Philippines" }
      ],
      projects: [
        {
          name: "Talent Intelligence Platform",
          role,
          duration: "2025 - 2026",
          summary: "Built and improved internal hiring workflows and analytics.",
          responsibilities: [
            "Implemented feature modules end-to-end",
            "Collaborated with product and QA",
            "Contributed to code quality and architecture"
          ],
          technologies: ["React", "TypeScript", "PostgreSQL"]
        }
      ],
      skillSelections,
      videoTitle: "Candidate Introduction",
      videoUrl: "https://example.com/video",
      coderbyteScore: String(70 + (index % 30)),
      coderbyteLink: "https://example.com/coderbyte"
    },
    schemaVersion: 2,
    createdAt: new Date(Date.now() - index * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - index * 3600000).toISOString()
  };
}

function buildCandidates(count: number) {
  const rows: CandidateRecord[] = [];
  const ids = new Set<string>();
  for (let i = 0; i < count; i += 1) {
    let row = buildCandidate(i);
    if (ids.has(row.id)) {
      row = { ...row, id: `${row.id}-${i}` };
    }
    ids.add(row.id);
    rows.push(row);
  }
  return rows;
}

function buildSharedProfiles(candidates: CandidateRecord[], count: number) {
  const rows = [] as Array<Record<string, unknown>>;
  for (let i = 0; i < count; i += 1) {
    const candidate = candidates[i % candidates.length];
    const id = `share-${Date.now() + i}-${Math.random().toString(36).slice(2, 7)}`;
    rows.push({
      id,
      shareToken: id,
      candidateId: candidate.id,
      candidateName: candidate.name,
      candidateRole: candidate.role,
      sharedWithName: `${rand(firstNames, i + 4)} ${rand(lastNames, i + 7)}`,
      sharedWithEmail: `client${i + 1}@example.com`,
      rateLabel: "$80 - Daily - All Days",
      expirationDate: new Date(Date.now() + (7 + (i % 30)) * 86400000).toISOString().slice(0, 10),
      sharedAt: new Date(Date.now() - i * 7200000).toISOString(),
      revokedAt: i % 11 === 0 ? new Date(Date.now() - i * 3600000).toISOString() : undefined,
      accessCount: i % 20,
      lastAccessedAt: new Date(Date.now() - i * 1800000).toISOString()
    });
  }
  return rows;
}

function buildAuthSessions(count: number) {
  const roles = ["admin", "client", "candidate"] as const;
  const rows = [] as Array<Record<string, unknown>>;
  for (let i = 0; i < count; i += 1) {
    const role = roles[i % roles.length];
    rows.push({
      token: `sess_seed_${Date.now()}_${i}`,
      role,
      email: role === "admin" ? "admin@chromedia.local" : role === "client" ? "client@chromedia.local" : "candidate@chromedia.local",
      name: role === "admin" ? "Admin User" : role === "client" ? "Client User" : "Alex Morgan",
      candidateId: role === "candidate" ? "alex-morgan" : undefined,
      expiresAt: new Date(Date.now() + (1 + (i % 7)) * 86400000).toISOString(),
      revokedAt: i % 9 === 0 ? new Date(Date.now() - i * 3600000).toISOString() : undefined,
      createdAt: new Date(Date.now() - i * 600000).toISOString()
    });
  }
  return rows;
}

function buildAuditLogs(count: number, candidates: CandidateRecord[], shared: Array<Record<string, unknown>>) {
  const actions = [
    "auth.login",
    "auth.logout",
    "candidate.create",
    "candidate.update",
    "skills.update",
    "shared_profile.create",
    "shared_profile.open",
    "shared_profile.revoke"
  ];
  const rows = [] as Array<Record<string, unknown>>;
  for (let i = 0; i < count; i += 1) {
    const action = actions[i % actions.length];
    const candidate = candidates[i % candidates.length];
    const share = shared[i % shared.length] as { id: string };
    rows.push({
      id: `audit_seed_${Date.now()}_${i}`,
      action,
      entityType: action.startsWith("candidate") ? "candidate" : action.startsWith("shared_profile") ? "shared_profile" : action.startsWith("skills") ? "skills" : "auth",
      entityId: action.startsWith("candidate") ? candidate.id : action.startsWith("shared_profile") ? share.id : action.startsWith("skills") ? "taxonomy" : "admin@chromedia.local",
      actorRole: i % 5 === 0 ? "system" : i % 3 === 0 ? "client" : "admin",
      actorEmail: i % 3 === 0 ? "client@chromedia.local" : "admin@chromedia.local",
      beforeState: null,
      afterState: { index: i, action },
      metadata: { source: "seed", ip: "127.0.0.1" },
      createdAt: new Date(Date.now() - i * 300000).toISOString()
    });
  }
  return rows;
}

async function writeJson(name: string, data: unknown) {
  await fs.writeFile(path.join(dbDir, name), JSON.stringify(data, null, 2), "utf8");
}

async function main() {
  await fs.mkdir(dbDir, { recursive: true });

  const candidates = buildCandidates(80);
  const sharedProfiles = buildSharedProfiles(candidates, 60);
  const authSessions = buildAuthSessions(120);
  const auditLogs = buildAuditLogs(600, candidates, sharedProfiles);

  await writeJson("skills.json", seedSkillsState);
  await writeJson("candidates.json", candidates);
  await writeJson("sharedProfiles.json", sharedProfiles);
  await writeJson("authSessions.json", authSessions);
  await writeJson("auditLogs.json", auditLogs);

  console.log("Generated rich dummy JSON data:");
  console.log(`- candidates: ${candidates.length}`);
  console.log(`- skills categories: ${seedSkillsState.categories.length}`);
  console.log(`- sharedProfiles: ${sharedProfiles.length}`);
  console.log(`- authSessions: ${authSessions.length}`);
  console.log(`- auditLogs: ${auditLogs.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
