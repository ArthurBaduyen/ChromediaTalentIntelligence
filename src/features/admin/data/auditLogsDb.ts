import { fetchWithAuth } from "../../../shared/auth/fetchWithAuth";
import type { PaginatedResult } from "../../../shared/types/pagination";

export type AuditLogRecord = {
  id: string;
  action: string;
  entityType: "candidate" | "skills" | "shared_profile" | "auth";
  entityId: string;
  actorRole: "admin" | "candidate" | "client" | "system";
  actorEmail: string;
  beforeState: unknown;
  afterState: unknown;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

const API_URL = "/api/audit-logs";
const QUERY_API_URL = "/api/audit-logs/query";

export type AuditLogsQuery = {
  page?: number;
  pageSize?: number;
  q?: string;
  action?: string;
  entity?: string;
  sortBy?: "createdAt" | "action" | "entityType" | "entityId" | "actorEmail";
  sortDir?: "asc" | "desc";
};

export async function fetchAuditLogs() {
  const response = await fetchWithAuth(API_URL);
  if (!response.ok) {
    throw new Error(`Failed GET ${API_URL}`);
  }
  return (await response.json()) as AuditLogRecord[];
}

export async function fetchAuditLogsPage(query: AuditLogsQuery) {
  const params = new URLSearchParams();
  params.set("page", String(query.page ?? 1));
  params.set("pageSize", String(query.pageSize ?? 20));
  if (query.q) params.set("q", query.q);
  if (query.action) params.set("action", query.action);
  if (query.entity) params.set("entity", query.entity);
  if (query.sortBy) params.set("sortBy", query.sortBy);
  if (query.sortDir) params.set("sortDir", query.sortDir);
  const response = await fetchWithAuth(`${QUERY_API_URL}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed GET ${QUERY_API_URL}`);
  }
  return (await response.json()) as PaginatedResult<AuditLogRecord>;
}
