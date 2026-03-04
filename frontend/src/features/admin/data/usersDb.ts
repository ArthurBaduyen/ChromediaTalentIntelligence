import { fetchWithAuth } from "../../../shared/auth/fetchWithAuth";

export type ManagedUserRole = "super_admin" | "admin";

export type ManagedUserRecord = {
  id: string;
  name: string;
  email: string;
  username: string;
  role: ManagedUserRole;
  isEnabled: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
};

const API_URL = "/api/users";

async function parseError(response: Response, fallback: string): Promise<never> {
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;
  throw new Error(payload?.message ?? fallback);
}

export async function fetchUsers(q?: string) {
  const params = new URLSearchParams();
  if (q?.trim()) params.set("q", q.trim());
  const response = await fetchWithAuth(`${API_URL}${params.toString() ? `?${params.toString()}` : ""}`);
  if (!response.ok) return parseError(response, `Failed GET ${API_URL}`);
  return (await response.json()) as ManagedUserRecord[];
}

export async function createUser(input: { email: string; username: string; role: ManagedUserRole; password: string }) {
  const response = await fetchWithAuth(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) return parseError(response, `Failed POST ${API_URL}`);
  return (await response.json()) as ManagedUserRecord;
}

export async function updateUser(userId: string, input: Partial<{ username: string; role: ManagedUserRole; isEnabled: boolean }>) {
  const response = await fetchWithAuth(`${API_URL}/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) return parseError(response, `Failed PATCH ${API_URL}/${userId}`);
  return (await response.json()) as ManagedUserRecord;
}

export async function requestUserPasswordReset(userId: string) {
  const response = await fetchWithAuth(`${API_URL}/${encodeURIComponent(userId)}/reset-password`, {
    method: "POST"
  });
  if (!response.ok) return parseError(response, `Failed POST ${API_URL}/${userId}/reset-password`);
  return (await response.json()) as { resetLink: string; expiresAt: string };
}

export async function setUserPassword(userId: string, password: string) {
  const response = await fetchWithAuth(`${API_URL}/${encodeURIComponent(userId)}/set-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password })
  });
  if (!response.ok) return parseError(response, `Failed POST ${API_URL}/${userId}/set-password`);
  return (await response.json()) as { ok: true };
}

export async function deleteUser(userId: string) {
  const response = await fetchWithAuth(`${API_URL}/${encodeURIComponent(userId)}`, {
    method: "DELETE"
  });
  if (!response.ok) return parseError(response, `Failed DELETE ${API_URL}/${userId}`);
  return (await response.json()) as { id: string; deleted: boolean };
}
