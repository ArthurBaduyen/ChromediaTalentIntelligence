export const APP_ROUTES = {
  design: "/design",
  login: "/login",
  sharedPreview: (shareToken: string) => `/shared/${encodeURIComponent(shareToken)}`,
  admin: {
    dashboard: "/admin/dashboard",
    account: "/admin/account",
    settings: "/admin/settings",
    candidates: "/admin/candidates",
    candidateProfilePath: "/admin/candidates/:candidateId",
    candidateProfile: (candidateId: string) => `/admin/candidates/${encodeURIComponent(candidateId)}`,
    testCases: "/admin/test-cases",
    skills: "/admin/skills",
    sharedProfiles: "/admin/shared-profiles",
    auditLogs: "/admin/audit-logs"
  },
  customer: {
    candidatePreviewPath: "/customer/candidates/:candidateId/preview",
    candidatePreview: (candidateId: string) => `/customer/candidates/${encodeURIComponent(candidateId)}/preview`
  },
  candidate: {
    startPath: "/candidate/:token/start",
    skillsPath: "/candidate/:token/skills",
    start: (token: string) => `/candidate/${encodeURIComponent(token)}/start`,
    skills: (token: string) => `/candidate/${encodeURIComponent(token)}/skills`
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
