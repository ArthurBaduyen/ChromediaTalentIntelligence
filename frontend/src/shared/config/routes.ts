export const APP_ROUTES = {
  design: "/design",
  login: "/login",
  sharedPreview: (shareToken: string) => `/shared/${encodeURIComponent(shareToken)}`,
  admin: {
    dashboard: "/admin/dashboard",
    account: "/admin/account",
    settings: "/admin/settings",
    candidates: "/admin/candidates",
    candidateProfile: (candidateId: string) => `/admin/candidates/${encodeURIComponent(candidateId)}`,
    skills: "/admin/skills",
    sharedProfiles: "/admin/shared-profiles",
    auditLogs: "/admin/audit-logs"
  },
  customer: {
    home: "/customer",
    candidatePreview: (candidateId: string) => `/customer/candidates/${encodeURIComponent(candidateId)}/preview`
  },
  candidate: {
    home: "/candidate",
    start: (candidateId: string) => `/candidate/${encodeURIComponent(candidateId)}/start`,
    skills: (candidateId: string) => `/candidate/${encodeURIComponent(candidateId)}/skills`
  }
} as const;

export function withQuery(path: string, params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (!value) continue;
    search.set(key, value);
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}
