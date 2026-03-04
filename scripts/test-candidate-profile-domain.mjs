import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";

function runTsc(outDir) {
  const args = [
    "tsc",
    "--pretty",
    "false",
    "--target",
    "ES2020",
    "--module",
    "CommonJS",
    "--moduleResolution",
    "Node",
    "--outDir",
    outDir,
    "frontend/src/features/admin/pages/candidateProfile/types.ts",
    "frontend/src/features/admin/pages/candidateProfile/utils.ts",
    "frontend/src/features/admin/pages/candidateProfile/domain.ts"
  ];
  const result = spawnSync("npx", args, { encoding: "utf8" });
  if (result.status !== 0) {
    const details = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`Failed compiling domain files for tests.\n${details}`);
  }
}

function createFixtureCategories() {
  return [
    {
      id: "cat-frontend",
      name: "Frontend Engineering",
      skills: [
        {
          id: "skill-react",
          name: "React + TypeScript",
          capabilities: [
            { level: "Entry Level", entries: ["Build components"] },
            { level: "Mid Level", entries: ["State architecture"] },
            { level: "Senior Level", entries: ["Design system governance"] },
            { level: "Senior Lead Level", entries: ["Org-wide frontend standards"] }
          ]
        }
      ]
    },
    {
      id: "cat-backend",
      name: "Backend Engineering",
      skills: [
        {
          id: "skill-node",
          name: "Node.js API Development",
          capabilities: [
            { level: "Entry Level", entries: ["CRUD endpoints"] },
            { level: "Mid Level", entries: ["Background jobs"] },
            { level: "Senior Level", entries: ["Service boundaries"] },
            { level: "Senior Lead Level", entries: ["Platform reliability leadership"] }
          ]
        }
      ]
    }
  ];
}

async function main() {
  const tempRoot = mkdtempSync(path.join(tmpdir(), "chromedia-domain-test-"));
  try {
    runTsc(tempRoot);
    const require = createRequire(import.meta.url);
    const candidatePaths = [
      path.join(tempRoot, "frontend/src/features/admin/pages/candidateProfile/domain.js"),
      path.join(tempRoot, "features/admin/pages/candidateProfile/domain.js"),
      path.join(tempRoot, "domain.js")
    ];
    const stack = [tempRoot];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;
      for (const entry of readdirSync(current, { withFileTypes: true })) {
        const resolved = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(resolved);
          continue;
        }
        if (entry.isFile() && entry.name === "domain.js" && resolved.includes("candidateProfile")) {
          candidatePaths.push(resolved);
        }
      }
    }
    const compiledDomainPath = candidatePaths.find((filePath) => existsSync(filePath));
    if (!compiledDomainPath) {
      throw new Error("Failed to locate compiled candidateProfile domain.js test module.");
    }
    const domainModule = require(compiledDomainPath);

    const {
      emptyProfileContent,
      getCandidateProfileContent,
      getRadarMetrics,
      getRelevantSkillTracks,
      getTrackFromSelection,
      hasAnyProfileData,
      hasCoreProfileData,
      keysToSkillSelectionItems
    } = domainModule;

    const categories = createFixtureCategories();
    const candidate = {
      id: "alex-morgan",
      name: "Alex Morgan",
      role: "Senior Frontend Developer",
      technologies: "React, TypeScript, Design System",
      expectedSalary: "$2,000 / Month",
      available: "Yes",
      status: "Active"
    };

    const relevantTracks = getRelevantSkillTracks(categories, candidate);
    assert.ok(relevantTracks.length > 0, "should generate relevant skill tracks");
    assert.equal(relevantTracks[0].categoryId, "cat-frontend", "should prioritize relevant category");

    const selection = {
      categoryId: "cat-frontend",
      selectedSubSkills: [
        { skillId: "skill-react", level: "Senior Level", capabilityId: "skill-react::Senior Level::0" }
      ]
    };
    const selectionTrack = getTrackFromSelection(selection, categories[0]);
    const selectedItems = selectionTrack.categories.flatMap((item) =>
      item.levels.flatMap((level) => level.items.filter((entry) => entry.checked))
    );
    assert.equal(selectedItems.length, 1, "track should mark selected capability as checked");

    const metrics = getRadarMetrics([selection], categories);
    const reactMetric = metrics.find((item) => item.label === "React + TypeScript");
    assert.equal(reactMetric?.value, 75, "senior selection should map to 75 radar score");

    const fallbackMetrics = getRadarMetrics([], categories);
    assert.equal(fallbackMetrics.length, 2, "empty selection should still return metrics for all skills");

    const defaultMap = {
      "seed-candidate": {
        about: "seed about",
        experience: "",
        education: [],
        projects: [],
        skillSelections: [],
        videoTitle: "",
        videoUrl: "",
        coderbyteScore: "",
        coderbyteLink: ""
      }
    };
    const blankProfileCandidate = { ...candidate, technologies: "List of technologies" };
    const profile = getCandidateProfileContent(blankProfileCandidate, defaultMap);
    assert.equal(profile?.about, "", "list-of-technologies candidates should start with empty profile");

    const seededCandidate = { ...candidate, id: "seed-candidate", technologies: "React" };
    const seededProfile = getCandidateProfileContent(seededCandidate, defaultMap);
    assert.equal(seededProfile?.about, "seed about", "should resolve seeded profile by candidate id");

    const empty = emptyProfileContent();
    assert.equal(hasAnyProfileData(empty), false, "empty profile should have no data");
    assert.equal(hasCoreProfileData(empty), false, "empty profile should have no core data");
    assert.equal(hasAnyProfileData({ ...empty, skillSelections: [selection] }), true, "skill selections count as profile data");
    assert.equal(hasCoreProfileData({ ...empty, skillSelections: [selection] }), false, "skill selections are not core profile data");

    const keyItems = keysToSkillSelectionItems(["skill-react::Mid Level::0"]);
    assert.deepEqual(keyItems, [{ skillId: "skill-react", level: "Mid Level", capabilityId: "skill-react::Mid Level::0" }]);

    console.log("Candidate profile domain unit tests passed.");
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

await main();
