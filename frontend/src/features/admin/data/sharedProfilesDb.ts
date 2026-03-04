import { fetchWithAuth } from "../../../shared/auth/fetchWithAuth";
import { APP_ROUTES } from "../../../shared/config/routes";
import type { PaginatedResult } from "../../../shared/types/pagination";

export type SharedProfileRecord = {
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

type NewSharedProfileInput = Omit<SharedProfileRecord, "id" | "sharedAt" | "shareToken"> & { shareToken?: string };

const STORAGE_KEY = "chromedia.shared-profiles.v1";
const API_URL = "/api/shared-profiles";
const QUERY_API_URL = "/api/shared-profiles/query";
export type SharedProfilesQuery = {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: string;
  sortBy?: "sharedAt" | "candidateName" | "sharedWithName" | "rateLabel" | "expirationDate" | "status" | "accessCount";
  sortDir?: "asc" | "desc";
};
const RATE_AMOUNT_BY_LABEL: Record<string, string> = {
  "Ad Hoc - Hourly": "$10",
  "Ad Hoc - Daily": "$80",
  "Ad Hoc - Monthly": "$1000",
  "Hourly Salary": "$10",
  "Daily - All Days": "$80",
  "Daily - Billable Days": "$90",
  Monthly: "$1000"
};

function hasWindow() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function nowIso() {
  return new Date().toISOString();
}

function toId() {
  return `share-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toShareToken() {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = Array.from({ length: 22 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  return `sp_${bytes}`;
}

function normalizeRateLabel(rateLabel: string) {
  const trimmed = rateLabel.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("$")) return trimmed;

  const matchedAmount = RATE_AMOUNT_BY_LABEL[trimmed];
  if (!matchedAmount) return trimmed;
  return `${matchedAmount} - ${trimmed}`;
}

function normalizeRecord(
  input: Partial<SharedProfileRecord> & Pick<SharedProfileRecord, "candidateId" | "candidateName" | "candidateRole" | "sharedWithName" | "sharedWithEmail" | "rateLabel" | "expirationDate">
): SharedProfileRecord {
  const id = input.id ?? toId();
  return {
    id,
    shareToken: input.shareToken?.trim() || id || toShareToken(),
    candidateId: input.candidateId,
    candidateName: input.candidateName,
    candidateRole: input.candidateRole,
    sharedWithName: input.sharedWithName.trim(),
    sharedWithEmail: input.sharedWithEmail.trim().toLowerCase(),
    rateLabel: normalizeRateLabel(input.rateLabel),
    expirationDate: input.expirationDate,
    sharedAt: input.sharedAt ?? nowIso(),
    revokedAt: typeof input.revokedAt === "string" && input.revokedAt.trim() ? input.revokedAt : undefined,
    accessCount: typeof input.accessCount === "number" && Number.isFinite(input.accessCount) ? Math.max(0, Math.floor(input.accessCount)) : 0,
    lastAccessedAt: typeof input.lastAccessedAt === "string" && input.lastAccessedAt.trim() ? input.lastAccessedAt : undefined
  };
}

function safeParse(raw: string | null): SharedProfileRecord[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
      .map((item) =>
        normalizeRecord({
          id: typeof item.id === "string" ? item.id : undefined,
          shareToken: typeof item.shareToken === "string" ? item.shareToken : undefined,
          sharedAt: typeof item.sharedAt === "string" ? item.sharedAt : undefined,
          revokedAt: typeof item.revokedAt === "string" ? item.revokedAt : undefined,
          accessCount: typeof item.accessCount === "number" ? item.accessCount : undefined,
          lastAccessedAt: typeof item.lastAccessedAt === "string" ? item.lastAccessedAt : undefined,
          candidateId: String(item.candidateId ?? ""),
          candidateName: String(item.candidateName ?? ""),
          candidateRole: String(item.candidateRole ?? ""),
          sharedWithName: String(item.sharedWithName ?? ""),
          sharedWithEmail: String(item.sharedWithEmail ?? ""),
          rateLabel: String(item.rateLabel ?? ""),
          expirationDate: String(item.expirationDate ?? "")
        })
      )
      .filter((item) => item.candidateId && item.sharedWithEmail);
  } catch {
    return null;
  }
}

function persist(records: SharedProfileRecord[]) {
  if (!hasWindow()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function getSharedProfiles() {
  if (!hasWindow()) return [];
  return safeParse(window.localStorage.getItem(STORAGE_KEY)) ?? [];
}

export async function fetchSharedProfiles() {
  if (!hasWindow()) return [];
  try {
    const response = await fetchWithAuth(API_URL);
    if (!response.ok) throw new Error(`Failed GET ${API_URL}`);
    const records = (await response.json()) as SharedProfileRecord[];
    const normalized = records.map((item) => normalizeRecord(item));
    persist(normalized);
    return normalized;
  } catch {
    return getSharedProfiles();
  }
}

export async function fetchSharedProfilesPage(query: SharedProfilesQuery): Promise<PaginatedResult<SharedProfileRecord>> {
  const params = new URLSearchParams();
  params.set("page", String(query.page ?? 1));
  params.set("pageSize", String(query.pageSize ?? 10));
  if (query.q) params.set("q", query.q);
  if (query.status) params.set("status", query.status);
  if (query.sortBy) params.set("sortBy", query.sortBy);
  if (query.sortDir) params.set("sortDir", query.sortDir);
  const response = await fetchWithAuth(`${QUERY_API_URL}?${params.toString()}`);
  if (!response.ok) throw new Error(`Failed GET ${QUERY_API_URL}`);
  const payload = (await response.json()) as PaginatedResult<SharedProfileRecord>;
  const items = payload.items.map((item) => normalizeRecord(item));
  persist(items);
  return { ...payload, items };
}

export async function addSharedProfile(input: NewSharedProfileInput) {
  const next = normalizeRecord(input);
  try {
    const response = await fetchWithAuth(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next)
    });
    if (!response.ok) throw new Error(`Failed POST ${API_URL}`);
    const created = normalizeRecord((await response.json()) as SharedProfileRecord);
    const existing = getSharedProfiles().filter((item) => item.id !== created.id);
    persist([created, ...existing]);
    return created;
  } catch {
    const existing = getSharedProfiles();
    persist([next, ...existing]);
    return next;
  }
}

export async function updateSharedProfile(id: string, input: Omit<SharedProfileRecord, "id">) {
  const next = normalizeRecord({ ...input, id });
  try {
    const response = await fetchWithAuth(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next)
    });
    if (!response.ok) throw new Error(`Failed PUT ${API_URL}/${id}`);
    const updated = normalizeRecord((await response.json()) as SharedProfileRecord);
    const existing = getSharedProfiles().filter((item) => item.id !== updated.id);
    persist([updated, ...existing]);
    return updated;
  } catch {
    const existing = getSharedProfiles().filter((item) => item.id !== id);
    persist([next, ...existing]);
    return next;
  }
}

export async function revokeSharedProfile(id: string) {
  try {
    const response = await fetchWithAuth(`${API_URL}/${id}/revoke`, { method: "POST" });
    if (!response.ok) throw new Error(`Failed POST ${API_URL}/${id}/revoke`);
    const revoked = normalizeRecord((await response.json()) as SharedProfileRecord);
    const existing = getSharedProfiles().filter((item) => item.id !== revoked.id);
    persist([revoked, ...existing]);
    return revoked;
  } catch {
    const existing = getSharedProfiles();
    const target = existing.find((item) => item.id === id);
    if (!target) throw new Error("Shared profile not found");
    const revoked = normalizeRecord({ ...target, revokedAt: nowIso(), id });
    const next = [revoked, ...existing.filter((item) => item.id !== id)];
    persist(next);
    return revoked;
  }
}

export async function deleteSharedProfile(id: string) {
  try {
    const response = await fetchWithAuth(`${API_URL}/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error(`Failed DELETE ${API_URL}/${id}`);
  } catch {
    // local fallback below
  }
  const next = getSharedProfiles().filter((item) => item.id !== id);
  persist(next);
  return next;
}

export function getSharedProfileByToken(token: string) {
  return getSharedProfiles().find((item) => item.shareToken === token) ?? null;
}

export async function fetchSharedProfileByToken(token: string) {
  if (!hasWindow()) return null;
  try {
    const response = await fetchWithAuth(`/api/public-shares/${encodeURIComponent(token)}`);
    if (!response.ok) return null;
    return normalizeRecord((await response.json()) as SharedProfileRecord);
  } catch {
    const records = await fetchSharedProfiles();
    return records.find((item) => item.shareToken === token) ?? null;
  }
}

export function getSharedProfilePublicUrl(recordOrToken: Pick<SharedProfileRecord, "shareToken"> | string) {
  const token = typeof recordOrToken === "string" ? recordOrToken : recordOrToken.shareToken;
  const path = APP_ROUTES.sharedPreview(token);
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}
