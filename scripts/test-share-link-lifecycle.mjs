import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const PORT = 4178;
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
      // not ready
    }
    await sleep(250);
  }
  throw new Error("Timed out waiting for Vite dev server to start");
}

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, options);
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

async function loginAdmin() {
  const { response, body } = await request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "admin@chromedia.local", password: "password123" })
  });
  assert.equal(response.status, 200, "Admin login should succeed");
  assert.ok(body?.sessionToken, "Session token should exist");
  return body.sessionToken;
}

async function runTests() {
  const token = await loginAdmin();
  const unique = Date.now().toString(36);
  const shareId = `share-lifecycle-${unique}`;
  const shareToken = `sp_lifecycle_${unique}`;

  const basePayload = {
    id: shareId,
    shareToken,
    candidateId: "alex-morgan",
    candidateName: "Alex Morgan",
    candidateRole: "Sr Frontend Developer",
    sharedWithName: "Lifecycle Test",
    sharedWithEmail: "lifecycle.test@company.com",
    rateLabel: "$80 - Daily - All Days",
    expirationDate: addDays(7),
    sharedAt: new Date().toISOString()
  };

  // 1) create share link
  {
    const { response, body } = await request("/api/shared-profiles", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-session-token": token
      },
      body: JSON.stringify(basePayload)
    });
    assert.equal(response.status, 201, "Share link creation should succeed");
    assert.equal(body?.shareToken, shareToken, "Created share token should match");
  }

  // 2) public share metadata should resolve
  {
    const { response, body } = await request(`/api/public-shares/${encodeURIComponent(shareToken)}`);
    assert.equal(response.status, 200, "Public share metadata should be accessible for valid token");
    assert.equal(body?.candidateId, "alex-morgan", "Public share should point to expected candidate");
  }

  // 3) public candidate from share token should resolve
  {
    const { response, body } = await request(`/api/public-shares/${encodeURIComponent(shareToken)}/candidate`);
    assert.equal(response.status, 200, "Public share candidate should be accessible for valid token");
    assert.equal(body?.id, "alex-morgan", "Resolved candidate should match share link candidate");
  }

  // 4) expire link (update to yesterday) -> public endpoints should fail
  {
    const expiredPayload = {
      ...basePayload,
      expirationDate: addDays(-1)
    };
    const updated = await request(`/api/shared-profiles/${encodeURIComponent(shareId)}`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "x-session-token": token
      },
      body: JSON.stringify(expiredPayload)
    });
    assert.equal(updated.response.status, 200, "Share update to expired should succeed");

    const meta = await request(`/api/public-shares/${encodeURIComponent(shareToken)}`);
    assert.equal(meta.response.status, 404, "Expired share metadata should be unavailable");

    const candidate = await request(`/api/public-shares/${encodeURIComponent(shareToken)}/candidate`);
    assert.equal(candidate.response.status, 404, "Expired share candidate should be unavailable");
  }

  // 5) restore expiry -> public endpoints should work again
  {
    const restoredPayload = {
      ...basePayload,
      expirationDate: addDays(10)
    };
    const updated = await request(`/api/shared-profiles/${encodeURIComponent(shareId)}`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "x-session-token": token
      },
      body: JSON.stringify(restoredPayload)
    });
    assert.equal(updated.response.status, 200, "Share update to future expiry should succeed");

    const meta = await request(`/api/public-shares/${encodeURIComponent(shareToken)}`);
    assert.equal(meta.response.status, 200, "Restored share metadata should be accessible again");
  }

  // 6) delete share -> public endpoints should fail not found
  {
    const deleted = await request(`/api/shared-profiles/${encodeURIComponent(shareId)}`, {
      method: "DELETE",
      headers: { "x-session-token": token }
    });
    assert.equal(deleted.response.status, 200, "Share delete should succeed");

    const meta = await request(`/api/public-shares/${encodeURIComponent(shareToken)}`);
    assert.equal(meta.response.status, 404, "Deleted share should be unavailable");
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
    console.log("Share-link lifecycle integration tests passed.");
  } catch (error) {
    console.error("Share-link lifecycle integration tests failed.");
    if (stderr.trim()) {
      console.error("\nVite stderr:\n", stderr);
    }
    throw error;
  } finally {
    vite.kill("SIGTERM");
    await sleep(300);
    if (!vite.killed) vite.kill("SIGKILL");
  }
}

await main();
