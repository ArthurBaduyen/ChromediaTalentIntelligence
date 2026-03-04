import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const PORT = 4177;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServerReady(timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(`${BASE_URL}/`);
      if (response.ok || response.status === 404) return;
    } catch {
      // server not ready yet
    }
    await sleep(250);
  }
  throw new Error("Timed out waiting for Vite dev server to start");
}

function jsonHeaders(extra = {}) {
  return {
    "content-type": "application/json",
    ...extra
  };
}

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, options);
  let body = null;
  try {
    body = await response.json();
  } catch {
    // non-json response
  }
  return { response, body };
}

async function login(email, password) {
  const { response, body } = await request("/api/auth/login", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email, password })
  });
  return { response, body };
}

async function runTests() {
  // 1) unauthenticated guard
  {
    const { response } = await request("/api/candidates");
    assert.equal(response.status, 401, "Expected 401 for unauthenticated /api/candidates");
  }

  // 2) auth payload validation
  {
    const { response, body } = await request("/api/auth/login", {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({})
    });
    assert.equal(response.status, 400, "Expected 400 for invalid login payload");
    assert.equal(body?.message, "Invalid login payload");
    assert.ok(Array.isArray(body?.errors), "Expected field-level errors array");
  }

  // 3) auth credential guard
  {
    const { response } = await login("admin@chromedia.local", "wrong-password");
    assert.equal(response.status, 401, "Expected 401 for invalid login credentials");
  }

  // 4) admin login works
  const adminLogin = await login("admin@chromedia.local", "password123");
  assert.equal(adminLogin.response.status, 200, "Expected successful admin login");
  const adminToken = adminLogin.body?.sessionToken;
  assert.ok(adminToken, "Expected admin session token");

  // 5) client cannot list candidates
  const clientLogin = await login("client@chromedia.local", "password123");
  assert.equal(clientLogin.response.status, 200, "Expected successful client login");
  const clientToken = clientLogin.body?.sessionToken;
  assert.ok(clientToken, "Expected client session token");
  {
    const { response } = await request("/api/candidates", {
      headers: { "x-session-token": clientToken }
    });
    assert.equal(response.status, 403, "Expected 403 when client lists candidates");
  }

  // 6) admin can list candidates
  {
    const { response, body } = await request("/api/candidates", {
      headers: { "x-session-token": adminToken }
    });
    assert.equal(response.status, 200, "Expected 200 for admin candidate list");
    assert.ok(Array.isArray(body), "Expected candidate list array");
    assert.ok(body.length > 0, "Expected non-empty candidate list");
  }

  // 7) candidate ownership guard
  const candidateLogin = await login("candidate@chromedia.local", "password123");
  assert.equal(candidateLogin.response.status, 200, "Expected successful candidate login");
  const candidateToken = candidateLogin.body?.sessionToken;
  assert.ok(candidateToken, "Expected candidate session token");
  {
    const own = await request("/api/candidates/alex-morgan", {
      headers: { "x-session-token": candidateToken }
    });
    assert.equal(own.response.status, 200, "Candidate should access own profile");

    const other = await request("/api/candidates/dianne", {
      headers: { "x-session-token": candidateToken }
    });
    assert.equal(other.response.status, 403, "Candidate should not access other profile");
  }

  // 8) shared profile validation
  {
    const { response, body } = await request("/api/shared-profiles", {
      method: "POST",
      headers: jsonHeaders({ "x-session-token": adminToken }),
      body: JSON.stringify({
        id: "share-test-invalid",
        shareToken: "sp_invalid",
        candidateId: "alex-morgan",
        candidateName: "Alex Morgan",
        candidateRole: "Sr Frontend Developer",
        sharedWithName: "Recipient",
        sharedWithEmail: "not-an-email",
        rateLabel: "$100 - Daily",
        expirationDate: "2026-03-20",
        sharedAt: new Date().toISOString()
      })
    });
    assert.equal(response.status, 400, "Expected 400 for invalid shared profile payload");
    assert.equal(body?.message, "Invalid shared profile payload");
  }

  // 9) skills write guard for candidate role
  {
    const { response } = await request("/api/skills", {
      method: "PUT",
      headers: jsonHeaders({ "x-session-token": candidateToken }),
      body: JSON.stringify({ categories: [] })
    });
    assert.equal(response.status, 403, "Expected 403 when candidate updates skills");
  }

  // 10) public share token not found
  {
    const { response } = await request("/api/public-shares/sp_nonexistent");
    assert.equal(response.status, 404, "Expected 404 for invalid public share token");
  }

  // 11) audit logs are admin-only and populated
  {
    const forbiddenForCandidate = await request("/api/audit-logs", {
      headers: { "x-session-token": candidateToken }
    });
    assert.equal(forbiddenForCandidate.response.status, 403, "Expected 403 for candidate audit-log access");

    const allowedForAdmin = await request("/api/audit-logs", {
      headers: { "x-session-token": adminToken }
    });
    assert.equal(allowedForAdmin.response.status, 200, "Expected 200 for admin audit-log access");
    assert.ok(Array.isArray(allowedForAdmin.body), "Expected audit log list array");
    assert.ok(allowedForAdmin.body.length > 0, "Expected non-empty audit logs");
  }

  // logout smoke
  {
    const { response } = await request("/api/auth/logout", {
      method: "POST",
      headers: { "x-session-token": adminToken }
    });
    assert.equal(response.status, 200, "Expected logout success");
  }
}

async function main() {
  const vite = spawn("npm", ["run", "dev", "--", "--port", String(PORT), "--strictPort"], {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, CI: "1" }
  });

  let stderr = "";
  vite.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  try {
    await waitForServerReady();
    await runTests();
    console.log("API integration tests passed.");
  } catch (error) {
    console.error("API integration tests failed.");
    if (stderr.trim()) {
      console.error("\nVite stderr:\n", stderr);
    }
    throw error;
  } finally {
    vite.kill("SIGTERM");
    await sleep(300);
    if (!vite.killed) {
      vite.kill("SIGKILL");
    }
  }
}

await main();
