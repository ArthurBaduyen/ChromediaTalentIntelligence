import assert from "node:assert/strict";

const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:4000";

function collectCookies(response) {
  const header = response.headers.get("set-cookie");
  if (!header) return [];
  return header
    .split(/,(?=\s*[A-Za-z0-9_]+=)/g)
    .map((item) => item.split(";")[0].trim())
    .filter(Boolean);
}

function mergeCookieJar(current, setCookies) {
  const jar = new Map();
  for (const entry of current.split(";").map((item) => item.trim()).filter(Boolean)) {
    const [name, ...rest] = entry.split("=");
    jar.set(name, rest.join("="));
  }
  for (const entry of setCookies) {
    const [name, ...rest] = entry.split("=");
    jar.set(name, rest.join("="));
  }
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

function readCookie(cookieJar, key) {
  for (const part of cookieJar.split(";").map((item) => item.trim())) {
    if (part.startsWith(`${key}=`)) return part.slice(key.length + 1);
  }
  return null;
}

async function login(email, password) {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  let cookieJar = mergeCookieJar("", collectCookies(response));
  if (response.status === 200) {
    const sessionRes = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: { cookie: cookieJar }
    });
    cookieJar = mergeCookieJar(cookieJar, collectCookies(sessionRes));
  }
  return { response, cookieJar };
}

async function authedRequest(path, cookieJar, init = {}) {
  const headers = new Headers(init.headers ?? {});
  headers.set("cookie", cookieJar);
  const method = (init.method ?? "GET").toUpperCase();
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrf = readCookie(cookieJar, "chromedia_csrf");
    if (csrf) headers.set("x-csrf-token", decodeURIComponent(csrf));
  }
  return fetch(`${BASE_URL}${path}`, { ...init, headers });
}

async function main() {
  const superLogin = await login("superadmin@chromedia.local", "password123");
  assert.equal(superLogin.response.status, 200, "super admin login should succeed");

  const adminLogin = await login("admin@chromedia.local", "password123");
  assert.equal(adminLogin.response.status, 200, "admin login should succeed");

  const usersForSuper = await authedRequest("/api/users", superLogin.cookieJar);
  assert.equal(usersForSuper.status, 200, "super admin should list users");

  const usersForAdmin = await authedRequest("/api/users", adminLogin.cookieJar);
  assert.equal(usersForAdmin.status, 403, "admin should be forbidden on user endpoint");

  const auditForAdmin = await authedRequest("/api/audit-logs", adminLogin.cookieJar);
  assert.equal(auditForAdmin.status, 403, "admin should be forbidden on audit logs");

  const createRes = await authedRequest("/api/users", superLogin.cookieJar, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "tmp-disabled@chromedia.local",
      username: "tmpdisabled",
      role: "admin",
      password: "password123"
    })
  });
  assert.equal(createRes.status, 201, "super admin should create user");
  const created = await createRes.json();

  const disableRes = await authedRequest(`/api/users/${created.id}`, superLogin.cookieJar, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isEnabled: false })
  });
  assert.equal(disableRes.status, 200, "super admin should disable user");

  const disabledLogin = await login("tmp-disabled@chromedia.local", "password123");
  assert.equal(disabledLogin.response.status, 401, "disabled user login must fail");

  const deleteRes = await authedRequest(`/api/users/${created.id}`, superLogin.cookieJar, {
    method: "DELETE"
  });
  assert.equal(deleteRes.status, 200, "super admin should delete user");

  console.log("RBAC smoke checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

