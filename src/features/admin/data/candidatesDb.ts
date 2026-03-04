import { digitsOnly, isValidEmail, sanitizeText, uniqueBy } from "../../../shared/lib/validation";
import { fetchWithAuth } from "../../../shared/auth/fetchWithAuth";
import { getSkillsState } from "./skillsDb";
import type { PaginatedResult } from "../../../shared/types/pagination";

export type CandidateStatus = "Active" | "Inactive" | "Pending";
export type RateType = "Hourly" | "Daily" | "Monthly";

export type CandidateProfileEducation = {
  year: string;
  degree: string;
  school: string;
};

export type CandidateProfileProject = {
  name: string;
  role: string;
  duration: string;
  summary: string;
  responsibilities: string[];
  technologies: string[];
};

export type CandidateProfileSkillSelectionItem = {
  skillId: string;
  level: string;
  capabilityId: string;
  text?: string;
};

export type CandidateProfileSkillSelection = {
  categoryId: string;
  selectedSubSkills: CandidateProfileSkillSelectionItem[];
};

export type CandidateProfileData = {
  about: string;
  experience: string;
  education: CandidateProfileEducation[];
  projects: CandidateProfileProject[];
  skillSelections?: CandidateProfileSkillSelection[];
  videoTitle?: string;
  videoUrl?: string;
  coderbyteScore?: string;
  coderbyteLink?: string;
};

export type CandidateContact = {
  phoneCountryCode: "+63";
  phoneNumber: string;
  email: string;
  iMessage?: string;
};

export type CandidateLocation = {
  address: string;
  city: string;
  region: string;
  zipCode: string;
  country: string;
};

export type CandidateCompensation = {
  expectedAmount: number;
  expectedRate: RateType;
  offeredAmount?: number;
  offeredRate?: RateType;
  currency: "USD";
};

export type CandidateEmployment = {
  contract: string;
  availability: string;
};

export type CandidateRecord = {
  id: string;
  name: string;
  role: string;
  technologies: string;
  expectedSalary: string;
  available: string;
  status: CandidateStatus;
  contact?: CandidateContact;
  location?: CandidateLocation;
  compensation?: CandidateCompensation;
  employment?: CandidateEmployment;
  profile?: CandidateProfileData;
  schemaVersion?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type NewCandidateInput = {
  name: string;
  role: string;
  expectedSalary?: string;
  available?: string;
  technologies?: string;
  status?: CandidateStatus;
  contact?: CandidateContact;
  location?: CandidateLocation;
  compensation?: CandidateCompensation;
  employment?: CandidateEmployment;
  profile?: CandidateProfileData;
};

const STORAGE_KEY = "chromedia.candidates.v2";
const LEGACY_STORAGE_KEY = "chromedia.candidates.v1";
const API_URL = "/api/candidates";
const QUERY_API_URL = "/api/candidates/query";

export type CandidateListQuery = {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: string;
  availability?: string;
  role?: string;
  progress?: string;
  sortBy?: "name" | "role" | "technologies" | "expectedSalary" | "status" | "available" | "updatedAt";
  sortDir?: "asc" | "desc";
};

function capabilityIdForEntry(skillId: string, level: string, index: number) {
  return `${skillId}::${level}::${index}`;
}

function capabilityTextKey(skillId: string, level: string, text: string) {
  return `${skillId}::${level}::${text.trim().toLowerCase()}`;
}

type CapabilityLookup = {
  ids: Set<string>;
  textToId: Map<string, string>;
  idToMeta: Map<string, { skillId: string; level: string }>;
};

function buildCapabilityLookup(): CapabilityLookup {
  const skillsState = getSkillsState();
  const ids = new Set<string>();
  const textToId = new Map<string, string>();
  const idToMeta = new Map<string, { skillId: string; level: string }>();

  for (const category of skillsState.categories) {
    for (const skill of category.skills) {
      for (const group of skill.capabilities) {
        for (const [index, entry] of group.entries.entries()) {
          const capabilityId = capabilityIdForEntry(skill.id, group.level, index);
          const text = entry.trim();
          ids.add(capabilityId);
          idToMeta.set(capabilityId, { skillId: skill.id, level: group.level });
          textToId.set(capabilityTextKey(skill.id, group.level, text), capabilityId);
        }
      }
    }
  }

  return { ids, textToId, idToMeta };
}

function emptyProfile(): CandidateProfileData {
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

const seedCandidates: CandidateRecord[] = [
  {
    id: "dianne",
    name: "Dianne",
    role: "Senior Web Designer",
    technologies: "List of technologies",
    expectedSalary: "$4,556/month",
    available: "in 4 weeks",
    status: "Active"
  },
  {
    id: "alex-morgan",
    name: "Alex Morgan",
    role: "Sr Frontend Developer",
    technologies: "List of technologies",
    expectedSalary: "$1,800.00 / Month",
    available: "Yes",
    status: "Active"
  },
  {
    id: "jamie-taylor",
    name: "Jamie Taylor",
    role: "Junior UI/UX Designer",
    technologies: "List of technologies",
    expectedSalary: "$90 / Day",
    available: "in 20 days",
    status: "Active"
  },
  {
    id: "riley-johnson",
    name: "Riley Johnson",
    role: "Junior Backend Developer",
    technologies: "List of technologies",
    expectedSalary: "$12 / Hour",
    available: "in 27 days",
    status: "Active"
  },
  {
    id: "casey-smith",
    name: "Casey Smith",
    role: "Sr Backend Developer",
    technologies: "List of technologies",
    expectedSalary: "$1,800.00 / Month",
    available: "Yes",
    status: "Active"
  },
  {
    id: "jordan-lee",
    name: "Jordan Lee",
    role: "Sr UI/UX Designer",
    technologies: "List of technologies",
    expectedSalary: "$90 / Day",
    available: "in 12 days",
    status: "Active"
  },
  {
    id: "avery-chen",
    name: "Avery Chen",
    role: "Jr UI/UX Designer",
    technologies: "List of technologies",
    expectedSalary: "$12 / Hour",
    available: "Yes",
    status: "Inactive"
  },
  {
    id: "morgan-patel",
    name: "Morgan Patel",
    role: "Product Designer",
    technologies: "List of technologies",
    expectedSalary: "$1,800.00 / Month",
    available: "Yes",
    status: "Pending"
  }
];

function hasWindow() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function slugifyName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function nowIso() {
  return new Date().toISOString();
}

function parseRate(value: string): RateType {
  const normalized = value.toLowerCase();
  if (normalized.includes("/ day") || normalized.includes("/day") || normalized.includes("daily")) return "Daily";
  if (normalized.includes("/ month") || normalized.includes("/month") || normalized.includes("monthly")) return "Monthly";
  return "Hourly";
}

function parseAmount(value: string) {
  const amountMatch = value.match(/([\d,.]+)/);
  if (!amountMatch) return 1000;
  const parsed = Number(amountMatch[1].replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1000;
}

function toSalaryLabel(compensation: CandidateCompensation) {
  const rateLabel = compensation.expectedRate === "Hourly" ? "Hour" : compensation.expectedRate === "Daily" ? "Day" : "Month";
  const formatted = compensation.expectedAmount.toLocaleString(undefined, {
    minimumFractionDigits: compensation.expectedAmount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  });
  return `$${formatted} / ${rateLabel}`;
}

function normalizeContact(contact?: CandidateContact) {
  if (!contact) return undefined;
  const phoneNumber = digitsOnly(contact.phoneNumber).slice(0, 10);
  return {
    phoneCountryCode: "+63" as const,
    phoneNumber,
    email: contact.email.trim().toLowerCase(),
    iMessage: contact.iMessage?.trim() || undefined
  };
}

function normalizeProfile(profile?: CandidateProfileData, capabilityLookup: CapabilityLookup = buildCapabilityLookup()): CandidateProfileData | undefined {
  if (!profile) return undefined;
  const migratedSelections = (profile.skillSelections ?? []).map((selection) => {
    const nextItems = uniqueBy(
      (selection.selectedSubSkills ?? [])
        .map((item) => {
          const capabilityId =
            (item.capabilityId && capabilityLookup.ids.has(item.capabilityId) ? item.capabilityId : undefined) ??
            (item.text ? capabilityLookup.textToId.get(capabilityTextKey(item.skillId, item.level, item.text)) : undefined);
          if (!capabilityId) return null;
          const meta = capabilityLookup.idToMeta.get(capabilityId);
          return {
            skillId: meta?.skillId ?? item.skillId,
            level: meta?.level ?? item.level,
            capabilityId
          };
        })
        .filter((item): item is CandidateProfileSkillSelectionItem => item !== null),
      (item) => item.capabilityId
    );
    return {
      categoryId: selection.categoryId,
      selectedSubSkills: nextItems
    };
  });

  return {
    ...profile,
    about: profile.about ?? "",
    experience: profile.experience ?? "",
    education: profile.education ?? [],
    projects: profile.projects ?? [],
    skillSelections: migratedSelections
  };
}

function normalizeCandidate(
  input: NewCandidateInput & { createdAt?: string; updatedAt?: string },
  id?: string,
  capabilityLookup: CapabilityLookup = buildCapabilityLookup()
): CandidateRecord {
  const resolvedId = id ?? slugifyName(input.name || "candidate");
  const candidateName = sanitizeText(input.name, 100);
  const role = sanitizeText(input.role, 100);
  const compensation = input.compensation ?? {
    expectedAmount: parseAmount(input.expectedSalary ?? "$1,000 / Month"),
    expectedRate: parseRate(input.expectedSalary ?? "Monthly"),
    currency: "USD" as const
  };

  const available = sanitizeText(input.available ?? input.employment?.availability ?? "Yes", 40);
  const normalizedContact = normalizeContact(input.contact);
  const normalizedLocation = input.location
    ? {
        address: sanitizeText(input.location.address, 200),
        city: sanitizeText(input.location.city, 120),
        region: sanitizeText(input.location.region, 120),
        zipCode: sanitizeText(input.location.zipCode, 20),
        country: sanitizeText(input.location.country, 80)
      }
    : undefined;

  const record: CandidateRecord = {
    id: resolvedId,
    name: candidateName,
    role,
    expectedSalary: input.expectedSalary?.trim() || toSalaryLabel(compensation),
    technologies: input.technologies?.trim() || "List of technologies",
    available,
    status: input.status ?? "Pending",
    profile: normalizeProfile(input.profile, capabilityLookup),
    contact: normalizedContact,
    location: normalizedLocation,
    compensation,
    employment: {
      contract: input.employment?.contract ?? "",
      availability: available
    },
    schemaVersion: 2,
    createdAt: input.createdAt ?? input.updatedAt ?? nowIso(),
    updatedAt: input.updatedAt ?? nowIso()
  };

  return record;
}

export function validateCandidateInput(input: NewCandidateInput) {
  const errors: Record<string, string> = {};

  if (!sanitizeText(input.name, 100)) {
    errors.name = "Candidate name is required.";
  }
  if (!sanitizeText(input.role, 100)) {
    errors.role = "Role is required.";
  }

  if (input.contact?.email && !isValidEmail(input.contact.email)) {
    errors.email = "Please enter a valid email address.";
  }
  if (input.contact?.phoneNumber && !/^9\d{9}$/.test(digitsOnly(input.contact.phoneNumber))) {
    errors.phoneNumber = "Phone number should follow PH mobile format (9XXXXXXXXX).";
  }

  if (input.compensation && input.compensation.expectedAmount <= 0) {
    errors.expectedAmount = "Expected amount must be greater than zero.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

function safeParseCandidates(raw: string | null, capabilityLookup: CapabilityLookup = buildCapabilityLookup()): CandidateRecord[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed
      .filter((item): item is NewCandidateInput & { id: string } => Boolean(item && typeof item === "object" && typeof (item as { id?: unknown }).id === "string"))
      .map((item) => normalizeCandidate(item, item.id, capabilityLookup));
  } catch {
    return null;
  }
}

function persist(records: CandidateRecord[]) {
  if (!hasWindow()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function migrateLegacyStorage() {
  if (!hasWindow()) return null;
  const legacy = safeParseCandidates(window.localStorage.getItem(LEGACY_STORAGE_KEY));
  if (!legacy || legacy.length === 0) return null;
  persist(legacy);
  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  return legacy;
}

export function getCandidates(): CandidateRecord[] {
  const capabilityLookup = buildCapabilityLookup();
  if (!hasWindow()) return seedCandidates.map((item) => normalizeCandidate(item, item.id, capabilityLookup));

  const current = safeParseCandidates(window.localStorage.getItem(STORAGE_KEY), capabilityLookup);
  if (current && current.length > 0) {
    return current;
  }

  const migrated = migrateLegacyStorage();
  if (migrated && migrated.length > 0) {
    return migrated;
  }

  const seeded = seedCandidates.map((item) => normalizeCandidate(item, item.id, capabilityLookup));
  persist(seeded);
  return seeded;
}

export function saveCandidates(records: CandidateRecord[]) {
  const capabilityLookup = buildCapabilityLookup();
  persist(records.map((item) => normalizeCandidate(item, item.id, capabilityLookup)));
}

export async function fetchCandidates() {
  const capabilityLookup = buildCapabilityLookup();
  if (!hasWindow()) return seedCandidates.map((item) => normalizeCandidate(item, item.id, capabilityLookup));
  try {
    const response = await fetchWithAuth(API_URL);
    if (!response.ok) throw new Error(`Failed GET ${API_URL}`);
    const records = (await response.json()) as CandidateRecord[];
    const normalized = uniqueBy(records.map((item) => normalizeCandidate(item, item.id, capabilityLookup)), (item) => item.id);
    persist(normalized);
    return normalized;
  } catch {
    return getCandidates();
  }
}

export async function fetchCandidatesPage(query: CandidateListQuery): Promise<PaginatedResult<CandidateRecord>> {
  const params = new URLSearchParams();
  params.set("page", String(query.page ?? 1));
  params.set("pageSize", String(query.pageSize ?? 10));
  if (query.q) params.set("q", query.q);
  if (query.status) params.set("status", query.status);
  if (query.availability) params.set("availability", query.availability);
  if (query.role) params.set("role", query.role);
  if (query.progress) params.set("progress", query.progress);
  if (query.sortBy) params.set("sortBy", query.sortBy);
  if (query.sortDir) params.set("sortDir", query.sortDir);

  const response = await fetchWithAuth(`${QUERY_API_URL}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed GET ${QUERY_API_URL}`);
  }
  const payload = (await response.json()) as PaginatedResult<CandidateRecord>;
  const capabilityLookup = buildCapabilityLookup();
  return {
    ...payload,
    items: payload.items.map((item) => normalizeCandidate(item, item.id, capabilityLookup))
  };
}

export async function fetchCandidateById(id: string) {
  const candidates = await fetchCandidates();
  return candidates.find((candidate) => candidate.id === id) ?? candidates[0];
}

export async function fetchPublicCandidateByShareToken(token: string) {
  if (!hasWindow()) return null;
  try {
    const response = await fetch(`/api/public-shares/${encodeURIComponent(token)}/candidate`);
    if (!response.ok) return null;
    return normalizeCandidate((await response.json()) as CandidateRecord);
  } catch {
    return null;
  }
}

export async function addCandidate(input: NewCandidateInput): Promise<CandidateRecord> {
  const validation = validateCandidateInput(input);
  if (!validation.valid) {
    throw new Error(Object.values(validation.errors)[0] ?? "Invalid candidate input");
  }

  const timestamp = nowIso();
  const next = normalizeCandidate({ ...input, createdAt: timestamp, updatedAt: timestamp });
  try {
    const response = await fetchWithAuth(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next)
    });
    if (!response.ok) throw new Error(`Failed POST ${API_URL}`);
    const created = normalizeCandidate((await response.json()) as CandidateRecord, next.id);
    const existing = getCandidates().filter((candidate) => candidate.id !== created.id);
    persist([created, ...existing]);
    return created;
  } catch {
    const existing = getCandidates();
    const deduped = existing.filter((candidate) => candidate.id !== next.id);
    persist([next, ...deduped]);
    return next;
  }
}

export async function updateCandidate(id: string, input: NewCandidateInput): Promise<CandidateRecord> {
  const validation = validateCandidateInput(input);
  if (!validation.valid) {
    throw new Error(Object.values(validation.errors)[0] ?? "Invalid candidate input");
  }

  const previous = getCandidateById(id);
  const timestamp = nowIso();
  const next = {
    ...normalizeCandidate(
      {
        ...input,
        createdAt: previous?.createdAt ?? previous?.updatedAt ?? timestamp,
        updatedAt: timestamp
      },
      id
    )
  };

  try {
    const response = await fetchWithAuth(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next)
    });
    if (!response.ok) throw new Error(`Failed PUT ${API_URL}/${id}`);
    const updated = normalizeCandidate((await response.json()) as CandidateRecord, id);
    const existing = getCandidates().filter((candidate) => candidate.id !== updated.id);
    persist([updated, ...existing]);
    return updated;
  } catch {
    const existing = getCandidates().filter((candidate) => candidate.id !== id);
    persist([next, ...existing]);
    return next;
  }
}

export async function deleteCandidate(id: string) {
  try {
    const response = await fetchWithAuth(`${API_URL}/${id}`, { method: "DELETE" });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error("Not authorized to delete candidate. Please sign in as admin.");
      }
      throw new Error(`Failed DELETE ${API_URL}/${id}`);
    }
  } catch (error) {
    if (!(error instanceof TypeError)) {
      throw error;
    }
    // Network failure fallback for offline/dev interruptions only.
  }
  const next = getCandidates().filter((candidate) => candidate.id !== id);
  persist(next);
  return next;
}

export function getCandidateById(id: string) {
  return getCandidates().find((candidate) => candidate.id === id);
}
