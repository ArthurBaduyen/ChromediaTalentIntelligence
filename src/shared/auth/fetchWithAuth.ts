import { getStoredAuthSession } from "./session";

export async function fetchWithAuth(input: RequestInfo | URL, init: RequestInit = {}) {
  const session = getStoredAuthSession();
  const headers = new Headers(init.headers ?? {});
  if (session?.sessionToken) {
    headers.set("x-session-token", session.sessionToken);
  }
  return fetch(input, { ...init, headers });
}
