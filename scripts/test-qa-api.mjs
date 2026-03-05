import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const PORT = 4303;
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
    // ignore non-json
  }
  return { response, body };
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
  assert.equal(response.status, 200, "Expected successful admin login");
}

async function runTests() {
  const jar = createCookieJar();
  await loginAdmin(jar);

  const csrf = jar.get("chromedia_csrf") ?? "";

  const createFeatureRes = await request(
    "/api/features",
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-csrf-token": csrf },
      body: JSON.stringify({
        name: `QA Feature ${Date.now()}`,
        description: "QA baseline generation",
        rolesInvolved: ["admin", "user"],
        platforms: ["web"],
        browsersOrDevices: ["Chrome latest"],
        hasApi: true
      })
    },
    jar
  );
  assert.equal(createFeatureRes.response.status, 201, "Expected feature create to succeed");
  const featureId = createFeatureRes.body.id;

  const generateRes = await request(
    `/api/features/${encodeURIComponent(featureId)}/test-cases/generate`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-csrf-token": csrf },
      body: JSON.stringify({ persist: false })
    },
    jar
  );
  assert.equal(generateRes.response.status, 200, "Expected test-case generation preview to succeed");
  assert.ok(Array.isArray(generateRes.body?.generated) && generateRes.body.generated.length > 0, "Expected generated rows");

  const createCaseRes = await request(
    `/api/features/${encodeURIComponent(featureId)}/test-cases`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-csrf-token": csrf },
      body: JSON.stringify({
        title: "Functional: create feature works",
        preconditions: "Admin logged in",
        testData: { candidateId: "abc" },
        steps: ["Open page", "Submit data"],
        expectedResults: ["Request returns success", "Data appears in list"],
        postConditions: "Feature remains available",
        priority: "P1",
        type: "Functional",
        isAutomatable: true,
        automationNotes: "Add to CI smoke",
        tags: ["functional", "baseline"]
      })
    },
    jar
  );
  assert.equal(createCaseRes.response.status, 201, "Expected test-case create to succeed");
  const testCaseId = createCaseRes.body.id;

  const listRes = await request(`/api/features/${encodeURIComponent(featureId)}/test-cases`, {}, jar);
  assert.equal(listRes.response.status, 200, "Expected list test-cases endpoint to succeed");
  assert.ok(Array.isArray(listRes.body) && listRes.body.length >= 1, "Expected at least one test case");

  const updateRes = await request(
    `/api/test-cases/${encodeURIComponent(testCaseId)}`,
    {
      method: "PUT",
      headers: { "content-type": "application/json", "x-csrf-token": csrf },
      body: JSON.stringify({ priority: "P0", title: "Updated QA test" })
    },
    jar
  );
  assert.equal(updateRes.response.status, 200, "Expected update test-case endpoint to succeed");
  assert.equal(updateRes.body.priority, "P0", "Expected updated priority");

  const deleteRes = await request(
    `/api/test-cases/${encodeURIComponent(testCaseId)}`,
    {
      method: "DELETE",
      headers: { "x-csrf-token": csrf }
    },
    jar
  );
  assert.equal(deleteRes.response.status, 200, "Expected delete test-case endpoint to succeed");
  assert.equal(deleteRes.body?.deleted, true, "Expected deleted flag");

  const createRunRes = await request(
    `/api/features/${encodeURIComponent(featureId)}/test-runs`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-csrf-token": csrf },
      body: JSON.stringify({ name: "Sprint 1 QA Run", tester: "QA User", notes: "Smoke + functional" })
    },
    jar
  );
  assert.equal(createRunRes.response.status, 201, "Expected test-run create endpoint to succeed");
  const runId = createRunRes.body.id;

  const runListRes = await request(`/api/features/${encodeURIComponent(featureId)}/test-runs`, {}, jar);
  assert.equal(runListRes.response.status, 200, "Expected test-run list endpoint to succeed");
  assert.ok(Array.isArray(runListRes.body) && runListRes.body.length >= 1, "Expected at least one run");

  const testCaseForResultRes = await request(
    `/api/features/${encodeURIComponent(featureId)}/test-cases`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-csrf-token": csrf },
      body: JSON.stringify({
        title: "Smoke: record result",
        preconditions: "Admin logged in",
        testData: {},
        steps: ["Open feature"],
        expectedResults: ["Feature works"],
        postConditions: "No side effects",
        priority: "P0",
        type: "Smoke",
        isAutomatable: true,
        automationNotes: "",
        tags: ["smoke"]
      })
    },
    jar
  );
  assert.equal(testCaseForResultRes.response.status, 201, "Expected setup test-case create");
  const resultCaseId = testCaseForResultRes.body.id;

  const saveResultRes = await request(
    `/api/test-runs/${encodeURIComponent(runId)}/results/${encodeURIComponent(resultCaseId)}`,
    {
      method: "PUT",
      headers: { "content-type": "application/json", "x-csrf-token": csrf },
      body: JSON.stringify({
        status: "Fail",
        testedBy: "QA User",
        notes: "Observed bug on submit",
        defectLink: "https://tracker.local/BUG-123"
      })
    },
    jar
  );
  assert.equal(saveResultRes.response.status, 200, "Expected save test-run result endpoint to succeed");
  assert.equal(saveResultRes.body.status, "Fail", "Expected saved fail result");

  const resultListRes = await request(`/api/test-runs/${encodeURIComponent(runId)}/results`, {}, jar);
  assert.equal(resultListRes.response.status, 200, "Expected test-run result list endpoint to succeed");
  assert.ok(Array.isArray(resultListRes.body) && resultListRes.body.length >= 1, "Expected run results");

  const completeRunRes = await request(
    `/api/test-runs/${encodeURIComponent(runId)}`,
    {
      method: "PUT",
      headers: { "content-type": "application/json", "x-csrf-token": csrf },
      body: JSON.stringify({ status: "Completed", completedAt: new Date().toISOString() })
    },
    jar
  );
  assert.equal(completeRunRes.response.status, 200, "Expected test-run completion endpoint to succeed");
  assert.equal(completeRunRes.body.status, "Completed", "Expected completed status");

  console.log("QA API integration tests passed.");
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
  } catch (error) {
    console.error("QA API integration tests failed.");
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
