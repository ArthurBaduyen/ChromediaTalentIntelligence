function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split(";").map((entry) => entry.trim());
  const token = parts.find((entry) => entry.startsWith(`${name}=`));
  if (!token) return null;
  return decodeURIComponent(token.slice(name.length + 1));
}

const REQUEST_TIMEOUT_MS = 12000;

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(new Error("Request timeout")), timeoutMs);
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal
    });
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

async function tryRefreshSession() {
  const response = await fetchWithTimeout("/api/auth/refresh", {
    method: "POST",
    credentials: "include"
  });
  return response.ok;
}

export async function fetchWithAuth(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers ?? {});
  const method = (init.method ?? "GET").toUpperCase();
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrf = getCookie("chromedia_csrf");
    if (csrf) headers.set("x-csrf-token", csrf);
  }

  const doFetch = () =>
    fetchWithTimeout(input, {
      ...init,
      credentials: "include",
      headers
    });

  const response = await doFetch();
  if (response.status === 401) {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      return doFetch();
    }
  }
  return response;
}
