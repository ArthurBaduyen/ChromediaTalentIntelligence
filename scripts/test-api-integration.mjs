import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const PORT = 4301;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServerReady(timeoutMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(`${BASE_URL}/api/health`);
      if (response.ok) return;
    } catch {
      // server not ready yet
    }
    await sleep(250);
  }
  throw new Error("Timed out waiting for backend server to start");
}

function createCookieJar() {
  const store = new Map();

  function updateFromResponse(response) {
    const setCookies =
      typeof response.headers.getSetCookie === "function"
        ? response.headers.getSetCookie()
        : [response.headers.get("set-cookie")].filter(Boolean);

    for (const raw of setCookies) {
      const pair = raw.split(";")[0];
      const idx = pair.indexOf("=");
      if (idx <= 0) continue;
      const key = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1).trim();
      store.set(key, value);
    }
  }

  function toHeader() {
    if (store.size === 0) return "";
    return Array.from(store.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  function get(name) {
    return store.get(name);
  }

  return { updateFromResponse, toHeader, get };
}

async function request(path, options = {}, jar) {
  const headers = new Headers(options.headers ?? {});
  if (jar) {
    const cookieHeader = jar.toHeader();
    if (cookieHeader) headers.set("cookie", cookieHeader);
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (jar) jar.updateFromResponse(response);

  let body = null;
  try {
    body = await response.json();
  } catch {
    // ignore non-JSON
  }
  return { response, body };
}

async function loginAdmin(jar) {
  const { response, body } = await request(
    "/api/auth/login",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "admin@chromedia.local", password: "password123" })
    },
    jar
  );
  assert.equal(response.status, 200, "Expected successful admin login");
  assert.equal(body?.role, "admin", "Expected admin role in session payload");
  assert.ok(jar.get("chromedia_access"), "Expected access cookie");
  assert.ok(jar.get("chromedia_refresh"), "Expected refresh cookie");
  assert.ok(jar.get("chromedia_csrf"), "Expected csrf cookie");
}

async function runTests() {
  const adminJar = createCookieJar();

  // 1) unauthenticated guard
  {
    const { response } = await request("/api/candidates");
    assert.equal(response.status, 401, "Expected 401 for unauthenticated /api/candidates");
  }

  // 2) auth payload validation
  {
    const { response, body } = await request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    });
    assert.equal(response.status, 400, "Expected 400 for invalid login payload");
    assert.equal(body?.message, "Invalid request body");
    assert.ok(Array.isArray(body?.errors), "Expected field-level errors array");
  }

  // 3) auth credential guard
  {
    const { response } = await request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "admin@chromedia.local", password: "wrong-password" })
    });
    assert.equal(response.status, 401, "Expected 401 for invalid login credentials");
  }

  // 4) admin login works
  await loginAdmin(adminJar);

  // 5) admin can list candidates
  const candidatesResult = await request("/api/candidates", {}, adminJar);
  assert.equal(candidatesResult.response.status, 200, "Expected 200 for admin candidate list");
  assert.ok(Array.isArray(candidatesResult.body), "Expected candidate list array");
  assert.ok(candidatesResult.body.length > 0, "Expected non-empty candidate list");

  const targetCandidateId = candidatesResult.body[0].id;

  // 6) create candidate invite link
  {
    const { response, body } = await request(
      "/api/candidate-links",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": adminJar.get("chromedia_csrf") ?? ""
        },
        body: JSON.stringify({ candidateId: targetCandidateId })
      },
      adminJar
    );
    assert.equal(response.status, 201, "Expected candidate invite creation");
    assert.equal(body?.candidateId, targetCandidateId, "Expected candidateId in invite response");
    assert.ok(body?.token, "Expected invite token");

    // 7) public candidate can resolve by token
    const publicCandidate = await request(`/api/public-candidate/${encodeURIComponent(body.token)}`);
    assert.equal(publicCandidate.response.status, 200, "Expected public candidate lookup to succeed");
    assert.equal(publicCandidate.body?.id, targetCandidateId, "Expected matching candidate id");

    // 8) public candidate skills update works without app login
    const selections = [
      {
        categoryId: "cat-frontend",
        selectedSubSkills: [
          {
            skillId: "skill-react",
            level: "Entry Level",
            capabilityId: "skill-react::Entry Level::0"
          }
        ]
      }
    ];

    const update = await request(`/api/public-candidate/${encodeURIComponent(body.token)}/skills`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ skillSelections: selections })
    });
    assert.equal(update.response.status, 200, "Expected candidate skill update via public link");
    assert.ok(Array.isArray(update.body?.profile?.skillSelections), "Expected skillSelections array in updated candidate");
  }

  // 9) public share token invalid returns 404
  {
    const { response } = await request("/api/public-shares/sp_nonexistent");
    assert.equal(response.status, 404, "Expected 404 for invalid public share token");
  }

  // 10) audit logs are super-admin only
  {
    const { response } = await request("/api/audit-logs", {}, adminJar);
    assert.equal(response.status, 403, "Expected admin to be forbidden from super-admin audit endpoint");
  }

  // 11) logout
  {
    const { response } = await request(
      "/api/auth/logout",
      {
        method: "POST",
        headers: {
          "x-csrf-token": adminJar.get("chromedia_csrf") ?? ""
        }
      },
      adminJar
    );
    assert.equal(response.status, 200, "Expected logout success");
  }
}

async function main() {
  const backend = spawn("npm", ["run", "start:backend"], {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, PORT: String(PORT), CI: "1" }
  });

  let stderr = "";
  backend.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  try {
    await waitForServerReady();
    await runTests();
    console.log("API integration tests passed.");
  } catch (error) {
    console.error("API integration tests failed.");
    if (stderr.trim()) {
      console.error("\nBackend stderr:\n", stderr);
    }
    throw error;
  } finally {
    backend.kill("SIGTERM");
    await sleep(300);
    if (!backend.killed) backend.kill("SIGKILL");
  }
}

await main();
