import type {
  CandidateProfileSkillSelection,
  CandidateProfileSkillSelectionItem,
  CandidateRecord
} from "../../data/candidatesDb";
import type { SkillCategoryRecord } from "../../data/skillsDb";
import { capabilityIdForEntry, getLevelRank, normalizeLevelLabel, skillEntryKey } from "./utils";
import type { CandidateProfileContent, RadarMetric, SkillCategory, SkillTrackItem } from "./types";

const LEVEL_RANK: Record<string, number> = {
  "Entry Level": 1,
  "Mid Level": 2,
  "Senior Level": 3,
  "Senior Lead Level": 4
};

export function resolveSkillTag(category: SkillCategory) {
  let highestRank = 0;
  for (const level of category.levels) {
    const hasChecked = level.items.some((item) => item.checked);
    if (!hasChecked) continue;
    highestRank = Math.max(highestRank, getLevelRank(level.label));
  }

  if (highestRank >= 4) return "Senior Lead";
  if (highestRank >= 3) return "Senior";
  if (highestRank >= 2) return "Mid";
  return "Entry";
}

export function toSkillTrack(category: SkillCategoryRecord): SkillTrackItem {
  return {
    id: `skill-track-${category.id}`,
    categoryId: category.id,
    title: category.name,
    categories: category.skills.map((skill) => {
      const mappedLevels = skill.capabilities.map((level) => ({
        label: normalizeLevelLabel(level.level),
        items: level.entries.map((text, index) => ({
          text,
          checked: true,
          skillId: skill.id,
          level: level.level,
          capabilityId: capabilityIdForEntry(skill.id, level.level, index)
        })),
        questions: []
      }));
      const nextCategory: SkillCategory = {
        title: skill.name,
        tag: "Entry",
        levels: mappedLevels
      };
      return { ...nextCategory, tag: resolveSkillTag(nextCategory) };
    })
  };
}

function tokenizeText(input: string) {
  return input
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/g)
    .map((item) => item.trim())
    .filter((item) => item.length > 1);
}

function inferCategoryScore(categoryName: string, text: string) {
  const name = categoryName.toLowerCase();
  let score = 0;

  if (name.includes("frontend") && /(frontend|react|vue|angular|ui|ux|figma|design)/.test(text)) score += 7;
  if (name.includes("backend") && /(backend|api|node|python|django|java|go|php|laravel|spring)/.test(text)) score += 7;
  if (name.includes("cloud") && /(cloud|devops|kubernetes|terraform|aws|ci\/cd|sre)/.test(text)) score += 7;
  if (name.includes("data") && /(data|etl|warehouse|analytics|sql|pipeline)/.test(text)) score += 7;
  if (name.includes("qa") && /(qa|quality|test|automation|performance testing)/.test(text)) score += 7;

  return score;
}

function getRoleTier(role: string) {
  const normalized = role.toLowerCase();
  if (normalized.includes("senior") || normalized.includes("lead")) return 3;
  if (normalized.includes("mid")) return 2;
  if (normalized.includes("junior") || normalized.includes("jr")) return 1;
  return 2;
}

function hashText(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 100000;
  }
  return hash;
}

export function getRelevantSkillTracks(categories: SkillCategoryRecord[], candidate?: CandidateRecord) {
  if (!candidate) {
    return categories.slice(0, 2).map((category) => toSkillTrack(category));
  }

  const candidateText = `${candidate.role} ${candidate.technologies}`.toLowerCase();
  const terms = tokenizeText(candidateText);

  const scored = categories
    .map((category) => {
      let score = inferCategoryScore(category.name, candidateText);

      if (candidateText.includes(category.name.toLowerCase())) {
        score += 8;
      }

      score += category.skills.reduce((skillScore, skill) => {
        const skillName = skill.name.toLowerCase();
        if (candidateText.includes(skillName)) {
          return skillScore + 8;
        }
        const matchedTerms = terms.filter((term) => term.length > 2 && skillName.includes(term)).length;
        return skillScore + matchedTerms * 2;
      }, 0);

      return { category, score };
    })
    .sort((a, b) => b.score - a.score);

  const matched = scored.filter((item) => item.score > 0).slice(0, 3).map((item) => item.category);
  const fallback = scored.slice(0, 2).map((item) => item.category);
  const selected = matched.length > 0 ? matched : fallback;

  const roleTier = getRoleTier(candidate.role);
  const candidateSeed = hashText(candidate.id);

  return selected.map((category) => {
    const baseTrack = toSkillTrack(category);
    return {
      ...baseTrack,
      categories: baseTrack.categories.map((skillCategory, categoryIndex) => ({
        ...skillCategory,
        levels: skillCategory.levels.map((level, levelIndex) => {
          const isEntry = level.label.toLowerCase().startsWith("entry");
          const isMid = level.label.toLowerCase().startsWith("mid");
          const isSenior = level.label.toLowerCase().startsWith("senior");
          return {
            ...level,
            items: level.items.map((item, itemIndex) => {
              const variability = (candidateSeed + categoryIndex + levelIndex + itemIndex) % 3;
              const checked =
                isEntry ? true :
                isMid ? roleTier >= 2 || variability > 0 :
                isSenior ? roleTier >= 3 && variability > 0 :
                roleTier >= 3 && variability === 2;
              return { ...item, checked };
            })
          };
        })
      }))
    };
  });
}

export function fallbackProfileContent(candidate: CandidateRecord): CandidateProfileContent {
  return {
    about: `${candidate.name} is a ${candidate.role} focused on delivering practical outcomes and consistent execution across assigned product workstreams.`,
    experience: `${candidate.name} has contributed to platform initiatives related to ${candidate.technologies}, collaborating with cross-functional teams to ship production-ready features.`,
    education: [
      { year: "2022", degree: "BS Computer Science", school: "University of the Philippines" },
      { year: "2020", degree: "Professional Certification", school: "Coursera" }
    ],
    projects: [
      {
        name: "Internal Platform Optimization",
        role: candidate.role,
        duration: "4 Months",
        summary: "Improved internal workflows and delivery quality for the talent operations platform.",
        responsibilities: [
          "Implemented scoped improvements with documented handoff.",
          "Coordinated QA feedback and issue triage.",
          "Maintained release readiness and delivery status updates."
        ],
        technologies: candidate.technologies.split(",").map((item) => item.trim()).filter(Boolean)
      },
      {
        name: "Client Workflow Enhancements",
        role: candidate.role,
        duration: "3 Months",
        summary: "Delivered targeted updates to client-facing workflows and platform usability.",
        responsibilities: [
          "Prioritized improvements based on stakeholder feedback.",
          "Validated implementation quality against acceptance criteria.",
          "Collaborated on documentation and iteration plans."
        ],
        technologies: candidate.technologies.split(",").map((item) => item.trim()).filter(Boolean)
      }
    ]
  };
}

export function emptyProfileContent(): CandidateProfileContent {
  return {
    about: "",
    experience: "",
    education: [],
    projects: [],
    skillSelections: [],
    videoTitle: "",
    videoUrl: "",
    coderbyteScore: "",
    coderbyteLink: ""
  };
}

export function hasAnyProfileData(profile: CandidateProfileContent | null) {
  if (!profile) return false;
  return Boolean(
    profile.about.trim() ||
      profile.experience.trim() ||
      (profile.education?.length ?? 0) > 0 ||
      (profile.projects?.length ?? 0) > 0 ||
      (profile.skillSelections?.length ?? 0) > 0 ||
      profile.videoTitle?.trim() ||
      profile.videoUrl?.trim() ||
      profile.coderbyteScore?.trim() ||
      profile.coderbyteLink?.trim()
  );
}

export function hasCoreProfileData(profile: CandidateProfileContent | null) {
  if (!profile) return false;
  return Boolean(
    profile.about.trim() ||
      profile.experience.trim() ||
      (profile.education?.length ?? 0) > 0 ||
      (profile.projects?.length ?? 0) > 0 ||
      profile.videoTitle?.trim() ||
      profile.videoUrl?.trim() ||
      profile.coderbyteScore?.trim() ||
      profile.coderbyteLink?.trim()
  );
}

export function getCandidateProfileContent(
  candidate: CandidateRecord | undefined,
  defaultProfiles: Record<string, CandidateProfileContent>
): CandidateProfileContent | null {
  if (!candidate) return null;
  if (candidate.profile) {
    return {
      ...emptyProfileContent(),
      ...candidate.profile,
      education: candidate.profile.education ?? [],
      projects: candidate.profile.projects ?? []
    };
  }
  if (candidate.technologies.trim().toLowerCase() === "list of technologies") {
    return emptyProfileContent();
  }
  return defaultProfiles[candidate.id] ?? fallbackProfileContent(candidate);
}

export function getTrackFromSelection(
  selection: CandidateProfileSkillSelection,
  category: SkillCategoryRecord
): SkillTrackItem {
  const selectedSet = new Set(selection.selectedSubSkills.map((item) => skillEntryKey(item.skillId, item.level, item.capabilityId)));
  const categories: SkillCategory[] = category.skills.map((skill) => {
    const levels = skill.capabilities.map((group) => ({
      label: normalizeLevelLabel(group.level),
      items: group.entries.map((text, index) => {
        const capabilityId = capabilityIdForEntry(skill.id, group.level, index);
        return {
          text,
          checked: selectedSet.has(skillEntryKey(skill.id, group.level, capabilityId)),
          skillId: skill.id,
          level: group.level,
          capabilityId
        };
      }),
      questions: []
    }));
    const nextCategory: SkillCategory = {
      title: skill.name,
      tag: "Entry",
      levels
    };
    return { ...nextCategory, tag: resolveSkillTag(nextCategory) };
  });
  return {
    id: `skill-track-${category.id}`,
    categoryId: category.id,
    title: category.name,
    categories
  };
}

export function getRadarMetrics(selections: CandidateProfileSkillSelection[], categories: SkillCategoryRecord[]): RadarMetric[] {
  const selectedBySkill = new Map<string, number>();
  const selectedCategoryIds = new Set<string>();

  for (const selection of selections) {
    selectedCategoryIds.add(selection.categoryId);
    for (const item of selection.selectedSubSkills) {
      const rank = LEVEL_RANK[item.level] ?? 0;
      const previous = selectedBySkill.get(item.skillId) ?? 0;
      if (rank > previous) {
        selectedBySkill.set(item.skillId, rank);
      }
    }
  }

  const sourceCategories = categories.filter((category) => selectedCategoryIds.has(category.id));
  const skillsPool =
    sourceCategories.length > 0
      ? sourceCategories.flatMap((category) => category.skills)
      : categories.flatMap((category) => category.skills);

  const metrics = skillsPool
    .map((skill) => {
      const highestRank = selectedBySkill.get(skill.id) ?? 0;
      const value = highestRank > 0 ? Math.round((highestRank / 4) * 100) : 0;
      return {
        label: skill.name,
        value,
        highestRank
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label))
    .map(({ label, value }) => ({ label, value }));

  if (metrics.length > 0) {
    return metrics;
  }

  return categories.flatMap((category) => category.skills).map((skill) => ({ label: skill.name, value: 0 }));
}

export function keysToSkillSelectionItems(selectedSubSkillKeys: string[]): CandidateProfileSkillSelectionItem[] {
  return selectedSubSkillKeys
    .map((key) => {
      const [skillId, level] = key.split("::");
      if (!skillId || !level) return null;
      return { skillId, level, capabilityId: key };
    })
    .filter((item): item is CandidateProfileSkillSelectionItem => item !== null);
}
