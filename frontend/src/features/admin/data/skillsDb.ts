import { sanitizeText, uniqueBy } from "../../../shared/lib/validation";
import { fetchWithAuth } from "../../../shared/auth/fetchWithAuth";
import type { PaginatedResult } from "../../../shared/types/pagination";

export type CapabilityLevelLabel = "Entry Level" | "Mid Level" | "Senior Level" | "Senior Lead Level";

export type SkillCapabilityGroup = {
  level: CapabilityLevelLabel;
  entries: string[];
};

export type SkillRecord = {
  id: string;
  name: string;
  code?: string;
  description?: string;
  capabilities: SkillCapabilityGroup[];
  createdAt?: string;
  updatedAt?: string;
};

export type SkillCategoryRecord = {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  skills: SkillRecord[];
  createdAt?: string;
  updatedAt?: string;
};

export type SkillsState = {
  categories: SkillCategoryRecord[];
  taxonomyVersion?: number;
  updatedAt?: string;
};

const STORAGE_KEY = "chromedia.skills.v2";
const LEGACY_STORAGE_KEY = "chromedia.skills.v1";
const API_URL = "/api/skills";
const QUERY_API_URL = "/api/skills/query";

export type SkillsCategoryListRow = {
  id: string;
  name: string;
  skillsCount: number;
  updatedAt?: string;
};

export type SkillsSkillListRow = {
  id: string;
  categoryId: string;
  name: string;
  capabilityCount: number;
  updatedAt?: string;
};

const LEVELS: CapabilityLevelLabel[] = ["Entry Level", "Mid Level", "Senior Level", "Senior Lead Level"];

function nowIso() {
  return new Date().toISOString();
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function createCapabilitySections(entry: string[], mid: string[], senior: string[], lead?: string[]): SkillCapabilityGroup[] {
  return [
    { level: "Entry Level", entries: entry },
    { level: "Mid Level", entries: mid },
    { level: "Senior Level", entries: senior },
    {
      level: "Senior Lead Level",
      entries:
        lead ?? [
          "Set standards and mentor engineers across teams.",
          "Own delivery quality and risk management for the domain.",
          "Translate product goals into scalable technical strategy."
        ]
    }
  ];
}

export const seedSkillsState: SkillsState = {
  taxonomyVersion: 2,
  updatedAt: nowIso(),
  categories: [
    {
      id: "cat-backend",
      name: "Backend Engineering",
      skills: [
        {
          id: "skill-python-django",
          name: "Python / Django",
          capabilities: createCapabilitySections(
            [
              "Core Python syntax, OOP basics and package management.",
              "Django project setup, models, views and templates.",
              "Basic ORM queries and CRUD endpoints."
            ],
            [
              "DRF serializers, viewsets and authentication patterns.",
              "Celery/Redis async jobs and scheduled tasks.",
              "Query optimization and test coverage improvements."
            ],
            [
              "Multi-tenant architecture and service boundaries.",
              "High-scale PostgreSQL tuning and performance profiling.",
              "Production hardening, observability and reliability design."
            ]
          )
        },
        {
          id: "skill-node",
          name: "Node.js API Development",
          capabilities: createCapabilitySections(
            [
              "Build REST endpoints with Express or Fastify.",
              "Validate payloads and enforce API contracts.",
              "Implement authentication and role-based authorization."
            ],
            [
              "Design modular services and repository patterns.",
              "Optimize database access and query execution plans.",
              "Implement job queues and retry-safe background processing."
            ],
            [
              "Lead API versioning and backward compatibility strategy.",
              "Design event-driven integrations and eventual consistency.",
              "Define observability and SLOs for mission-critical APIs."
            ]
          )
        }
      ]
    },
    {
      id: "cat-frontend",
      name: "Frontend Engineering",
      skills: [
        {
          id: "skill-react",
          name: "React + TypeScript",
          capabilities: createCapabilitySections(
            [
              "Build reusable typed components from Figma.",
              "Implement controlled forms and validation flows.",
              "Handle local state and data fetching with clean patterns."
            ],
            [
              "Optimize rendering with memoization and state boundaries.",
              "Implement accessibility for keyboard and screen readers.",
              "Set up RTL tests for interactive components."
            ],
            [
              "Define feature architecture for large React products.",
              "Lead design system governance and component APIs.",
              "Own performance budgets and production monitoring."
            ]
          )
        },
        {
          id: "skill-nextjs",
          name: "Next.js",
          capabilities: createCapabilitySections(
            [
              "Create pages and layouts with App Router.",
              "Implement API routes and server-side validation.",
              "Use Tailwind for responsive UI implementation."
            ],
            [
              "Apply caching and revalidation strategies per route.",
              "Split client and server components intentionally.",
              "Configure image optimization and SEO metadata."
            ],
            [
              "Design SSR/ISR strategy for scale and reliability.",
              "Drive observability for user and route performance.",
              "Architect multi-tenant or white-label frontend patterns."
            ]
          )
        }
      ]
    },
    {
      id: "cat-cloud-devops",
      name: "Cloud & DevOps",
      skills: [
        {
          id: "skill-kubernetes",
          name: "Kubernetes",
          capabilities: createCapabilitySections(
            [
              "Understand pod lifecycle and deployment basics.",
              "Manage config maps, secrets and health probes.",
              "Debug common rollout and service connectivity issues."
            ],
            [
              "Configure autoscaling and resource limits from metrics.",
              "Implement canary/rolling deployments in CI/CD.",
              "Set up centralized logging and actionable alerts."
            ],
            [
              "Design multi-cluster strategy and disaster recovery.",
              "Optimize platform reliability and cloud cost at scale.",
              "Define workload, cluster and supply-chain security controls."
            ]
          )
        },
        {
          id: "skill-terraform",
          name: "Terraform",
          capabilities: createCapabilitySections(
            [
              "Provision cloud resources with reusable modules.",
              "Manage environment-specific variable files safely.",
              "Use remote state and locking for team collaboration."
            ],
            [
              "Structure IaC repositories by domain and ownership.",
              "Integrate policy checks and validation in CI.",
              "Handle safe module version upgrades and migrations."
            ],
            [
              "Define organization-wide guardrails and platform standards.",
              "Lead multi-account/multi-region provisioning strategy.",
              "Balance governance, velocity and operational reliability."
            ]
          )
        }
      ]
    },
    {
      id: "cat-data",
      name: "Data Engineering",
      skills: [
        {
          id: "skill-etl",
          name: "ETL Pipelines",
          capabilities: createCapabilitySections(
            [
              "Build basic extraction and transformation jobs.",
              "Validate data quality with simple checks.",
              "Schedule and monitor recurring data workflows."
            ],
            [
              "Handle schema drift and backward compatibility.",
              "Optimize pipeline reliability with retries and idempotency.",
              "Implement incremental loads and partition strategies."
            ],
            [
              "Design event-driven and batch hybrid architectures.",
              "Govern lineage, ownership and data contract strategy.",
              "Lead cost/performance optimization for large data platforms."
            ]
          )
        }
      ]
    }
  ]
};

function hasWindow() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeGroup(group: SkillCapabilityGroup): SkillCapabilityGroup {
  return {
    level: LEVELS.includes(group.level) ? group.level : "Entry Level",
    entries: uniqueBy(
      (group.entries ?? []).map((entry) => sanitizeText(entry, 240)).filter(Boolean),
      (entry) => entry.toLowerCase()
    )
  };
}

function normalizeSkill(skill: SkillRecord): SkillRecord {
  const normalizedCapabilities = LEVELS.map((level) => {
    const fromExisting = skill.capabilities.find((capability) => capability.level === level);
    return normalizeGroup({ level, entries: fromExisting?.entries ?? [] });
  });

  return {
    ...skill,
    name: sanitizeText(skill.name, 120),
    code: skill.code?.trim() || undefined,
    description: skill.description?.trim() || undefined,
    capabilities: normalizedCapabilities,
    updatedAt: skill.updatedAt ?? nowIso(),
    createdAt: skill.createdAt ?? nowIso()
  };
}

function normalizeCategory(category: SkillCategoryRecord): SkillCategoryRecord {
  return {
    ...category,
    name: sanitizeText(category.name, 120),
    slug: category.slug || toSlug(category.name),
    description: category.description?.trim() || undefined,
    skills: uniqueBy(category.skills.map(normalizeSkill), (skill) => skill.id),
    updatedAt: category.updatedAt ?? nowIso(),
    createdAt: category.createdAt ?? nowIso()
  };
}

export function normalizeSkillsState(state: SkillsState): SkillsState {
  return {
    taxonomyVersion: 2,
    updatedAt: state.updatedAt ?? nowIso(),
    categories: uniqueBy((state.categories ?? []).map(normalizeCategory), (category) => category.id)
  };
}

export function validateSkillsState(state: SkillsState) {
  const errors: string[] = [];

  const categoryNameSet = new Set<string>();
  for (const category of state.categories) {
    if (!category.name.trim()) {
      errors.push("Category name is required.");
    }
    const categoryNameKey = category.name.trim().toLowerCase();
    if (categoryNameSet.has(categoryNameKey)) {
      errors.push(`Duplicate category name: ${category.name}`);
    }
    categoryNameSet.add(categoryNameKey);

    const skillNameSet = new Set<string>();
    for (const skill of category.skills) {
      if (!skill.name.trim()) {
        errors.push(`Skill name is required in category ${category.name}.`);
      }
      const skillKey = skill.name.trim().toLowerCase();
      if (skillNameSet.has(skillKey)) {
        errors.push(`Duplicate skill name in ${category.name}: ${skill.name}`);
      }
      skillNameSet.add(skillKey);

      for (const group of skill.capabilities) {
        const entrySet = new Set<string>();
        for (const entry of group.entries) {
          const normalized = entry.trim().toLowerCase();
          if (!normalized) {
            errors.push(`Empty capability entry in ${category.name}/${skill.name}/${group.level}.`);
            continue;
          }
          if (entrySet.has(normalized)) {
            errors.push(`Duplicate capability entry in ${category.name}/${skill.name}/${group.level}.`);
          }
          entrySet.add(normalized);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

function safeParseState(raw: string | null): SkillsState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const state = parsed as SkillsState;
    if (!Array.isArray(state.categories)) return null;
    return normalizeSkillsState(state);
  } catch {
    return null;
  }
}

function persist(state: SkillsState) {
  if (!hasWindow()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getDefaultCapabilitySections() {
  return LEVELS.map((level) => ({ level, entries: [] as string[] }));
}

function migrateLegacyStorage() {
  if (!hasWindow()) return null;
  const legacy = safeParseState(window.localStorage.getItem(LEGACY_STORAGE_KEY));
  if (!legacy) return null;
  persist(legacy);
  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  return legacy;
}

export function getSkillsState(): SkillsState {
  return { categories: [] };
}

export function saveSkillsState(state: SkillsState) {
  void state;
}

export async function fetchSkillsState() {
  const response = await fetchWithAuth(API_URL);
  if (!response.ok) throw new Error(`Failed GET ${API_URL}`);
  return normalizeSkillsState((await response.json()) as SkillsState);
}

export async function updateSkillsState(state: SkillsState) {
  const normalized = normalizeSkillsState({ ...state, updatedAt: nowIso() });
  const validation = validateSkillsState(normalized);
  if (!validation.valid) {
    throw new Error(validation.errors[0] ?? "Invalid skills state");
  }

  const response = await fetchWithAuth(API_URL, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(normalized)
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? `Failed PUT ${API_URL}`);
  }
  return normalizeSkillsState((await response.json()) as SkillsState);
}

export async function fetchSkillCategoriesPage(query: {
  page?: number;
  pageSize?: number;
  q?: string;
  sortBy?: "name" | "skillsCount" | "updatedAt";
  sortDir?: "asc" | "desc";
}): Promise<PaginatedResult<SkillsCategoryListRow>> {
  const params = new URLSearchParams();
  params.set("scope", "categories");
  params.set("page", String(query.page ?? 1));
  params.set("pageSize", String(query.pageSize ?? 10));
  if (query.q) params.set("q", query.q);
  if (query.sortBy) params.set("sortBy", query.sortBy);
  if (query.sortDir) params.set("sortDir", query.sortDir);
  const response = await fetchWithAuth(`${QUERY_API_URL}?${params.toString()}`);
  if (!response.ok) throw new Error(`Failed GET ${QUERY_API_URL}`);
  return (await response.json()) as PaginatedResult<SkillsCategoryListRow>;
}

export async function fetchSkillsByCategoryPage(query: {
  categoryId: string;
  page?: number;
  pageSize?: number;
  q?: string;
  sortBy?: "name" | "capabilityCount" | "updatedAt";
  sortDir?: "asc" | "desc";
}): Promise<PaginatedResult<SkillsSkillListRow>> {
  const params = new URLSearchParams();
  params.set("scope", "skills");
  params.set("categoryId", query.categoryId);
  params.set("page", String(query.page ?? 1));
  params.set("pageSize", String(query.pageSize ?? 10));
  if (query.q) params.set("q", query.q);
  if (query.sortBy) params.set("sortBy", query.sortBy);
  if (query.sortDir) params.set("sortDir", query.sortDir);
  const response = await fetchWithAuth(`${QUERY_API_URL}?${params.toString()}`);
  if (!response.ok) throw new Error(`Failed GET ${QUERY_API_URL}`);
  return (await response.json()) as PaginatedResult<SkillsSkillListRow>;
}
