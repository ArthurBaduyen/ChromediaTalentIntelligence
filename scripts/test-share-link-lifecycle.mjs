import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const PORT = 4302;
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
      // not ready
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
      store.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
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
    // ignore
  }
  return { response, body };
}

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

async function loginAdmin(jar) {
  const { response } = await request(
    "/api/auth/login",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "admin@chromedia.local", password: "password123" })
    },
    jar
  );
  assert.equal(response.status, 200, "Admin login should succeed");
}

async function runTests() {
  const jar = createCookieJar();
  await loginAdmin(jar);

  const candidates = await request("/api/candidates", {}, jar);
  assert.equal(candidates.response.status, 200, "Should list candidates for admin");
  assert.ok(Array.isArray(candidates.body) && candidates.body.length > 0, "Expected at least one candidate");
  const candidate = candidates.body[0];

  const unique = Date.now().toString(36);
  const shareId = `share-lifecycle-${unique}`;
  const shareToken = `sp_lifecycle_${unique}`;

  const basePayload = {
    id: shareId,
    shareToken,
    candidateId: candidate.id,
    candidateName: candidate.name,
    candidateRole: candidate.role,
    sharedWithName: "Lifecycle Test",
    sharedWithEmail: "lifecycle.test@company.com",
    rateLabel: "$80 - Daily - All Days",
    expirationDate: addDays(7),
    sharedAt: new Date().toISOString()
  };

  const csrf = jar.get("chromedia_csrf") ?? "";

  // 1) create share link
  {
    const { response, body } = await request(
      "/api/shared-profiles",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrf
        },
        body: JSON.stringify(basePayload)
      },
      jar
    );
    assert.equal(response.status, 201, "Share link creation should succeed");
    assert.equal(body?.shareToken, shareToken, "Created share token should match");
  }

  // 2) public share metadata should resolve
  {
    const { response, body } = await request(`/api/public-shares/${encodeURIComponent(shareToken)}`);
    assert.equal(response.status, 200, "Public share metadata should be accessible for valid token");
    assert.equal(body?.candidateId, candidate.id, "Public share should point to expected candidate");
  }

  // 3) public candidate from share token should resolve
  {
    const { response, body } = await request(`/api/public-shares/${encodeURIComponent(shareToken)}/candidate`);
    assert.equal(response.status, 200, "Public share candidate should be accessible for valid token");
    assert.equal(body?.id, candidate.id, "Resolved candidate should match share link candidate");
  }

  // 4) expire link -> public endpoints should fail
  {
    const expiredPayload = {
      ...basePayload,
      expirationDate: addDays(-1)
    };
    const updated = await request(
      `/api/shared-profiles/${encodeURIComponent(shareId)}`,
      {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrf
        },
        body: JSON.stringify(expiredPayload)
      },
      jar
    );
    assert.equal(updated.response.status, 200, "Share update to expired should succeed");

    const meta = await request(`/api/public-shares/${encodeURIComponent(shareToken)}`);
    assert.equal(meta.response.status, 404, "Expired share metadata should be unavailable");

    const candidateView = await request(`/api/public-shares/${encodeURIComponent(shareToken)}/candidate`);
    assert.equal(candidateView.response.status, 404, "Expired share candidate should be unavailable");
  }

  // 5) restore expiry -> public endpoints should work again
  {
    const restoredPayload = {
      ...basePayload,
      expirationDate: addDays(10)
    };
    const updated = await request(
      `/api/shared-profiles/${encodeURIComponent(shareId)}`,
      {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrf
        },
        body: JSON.stringify(restoredPayload)
      },
      jar
    );
    assert.equal(updated.response.status, 200, "Share update to future expiry should succeed");

    const meta = await request(`/api/public-shares/${encodeURIComponent(shareToken)}`);
    assert.equal(meta.response.status, 200, "Restored share metadata should be accessible again");
  }

  // 6) delete share -> public endpoints should fail
  {
    const deleted = await request(
      `/api/shared-profiles/${encodeURIComponent(shareId)}`,
      {
        method: "DELETE",
        headers: { "x-csrf-token": csrf }
      },
      jar
    );
    assert.equal(deleted.response.status, 200, "Share delete should succeed");

    const meta = await request(`/api/public-shares/${encodeURIComponent(shareToken)}`);
    assert.equal(meta.response.status, 404, "Deleted share should be unavailable");
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
    console.log("Share-link lifecycle integration tests passed.");
  } catch (error) {
    console.error("Share-link lifecycle integration tests failed.");
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
