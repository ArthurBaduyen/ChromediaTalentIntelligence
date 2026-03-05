import { fetchWithAuth } from "../../../shared/auth/fetchWithAuth";

export type TestCasePriority = "P0" | "P1" | "P2";
export type TestCaseType = "Smoke" | "Functional" | "Negative" | "Regression" | "API" | "Integration" | "UI" | "Security" | "Performance";
export type TestCaseBundleKey =
  | "smoke"
  | "functional"
  | "negative"
  | "permissions"
  | "api"
  | "integration"
  | "compatibility"
  | "performance"
  | "security"
  | "regression";

export type FeatureRecord = {
  id: string;
  name: string;
  description: string;
  rolesInvolved: string[];
  platforms: string[];
  browsersOrDevices: string[];
  hasApi: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type TestCaseRecord = {
  id: string;
  featureId: string;
  title: string;
  preconditions: string;
  testData: unknown;
  steps: string[];
  expectedResults: string[];
  postConditions: string;
  priority: TestCasePriority;
  type: TestCaseType;
  isAutomatable: boolean;
  automationNotes: string;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type TestCaseInput = Omit<TestCaseRecord, "id" | "createdAt" | "updatedAt">;

export type TestCaseGenerateInput = {
  featureName?: string;
  description?: string;
  userRolesInvolved?: string[];
  platforms?: string[];
  browsersOrDevices?: string[];
  hasApi?: boolean;
  disableBundles?: TestCaseBundleKey[];
  selectedBundles?: TestCaseBundleKey[];
  persist?: boolean;
};

export type TestRunStatus = "InProgress" | "Completed";
export type TestExecutionStatus = "NotRun" | "Pass" | "Fail" | "Blocked";

export type TestRunSummary = {
  total: number;
  pass: number;
  fail: number;
  blocked: number;
  notRun: number;
};

export type TestRunRecord = {
  id: string;
  featureId: string;
  name: string;
  tester: string;
  notes: string;
  status: TestRunStatus;
  startedAt?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  summary: TestRunSummary;
};

export type TestRunResultRecord = {
  id: string;
  runId: string;
  testCaseId: string;
  status: TestExecutionStatus;
  testedBy: string;
  notes: string;
  defectLink: string;
  executedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

const FEATURES_API = "/api/features";

function normalizeList(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  return items.map((item) => String(item).trim()).filter(Boolean);
}

function normalizeFeature(input: FeatureRecord): FeatureRecord {
  return {
    ...input,
    description: input.description ?? "",
    rolesInvolved: normalizeList(input.rolesInvolved),
    platforms: normalizeList(input.platforms),
    browsersOrDevices: normalizeList(input.browsersOrDevices)
  };
}

function normalizeTestCase(input: TestCaseRecord): TestCaseRecord {
  return {
    ...input,
    preconditions: input.preconditions ?? "",
    postConditions: input.postConditions ?? "",
    automationNotes: input.automationNotes ?? "",
    steps: normalizeList(input.steps),
    expectedResults: normalizeList(input.expectedResults),
    tags: normalizeList(input.tags)
  };
}

function normalizeSummary(input: TestRunSummary | undefined, totalFallback = 0): TestRunSummary {
  return {
    total: input?.total ?? totalFallback,
    pass: input?.pass ?? 0,
    fail: input?.fail ?? 0,
    blocked: input?.blocked ?? 0,
    notRun: input?.notRun ?? totalFallback
  };
}

function normalizeTestRun(input: TestRunRecord): TestRunRecord {
  return {
    ...input,
    tester: input.tester ?? "",
    notes: input.notes ?? "",
    summary: normalizeSummary(input.summary)
  };
}

function normalizeTestRunResult(input: TestRunResultRecord): TestRunResultRecord {
  return {
    ...input,
    testedBy: input.testedBy ?? "",
    notes: input.notes ?? "",
    defectLink: input.defectLink ?? ""
  };
}

export async function fetchFeatures() {
  const response = await fetchWithAuth(FEATURES_API);
  if (!response.ok) throw new Error("Failed to fetch features");
  const rows = (await response.json()) as FeatureRecord[];
  return rows.map(normalizeFeature);
}

export async function createFeature(input: Omit<FeatureRecord, "id" | "createdAt" | "updatedAt">) {
  const response = await fetchWithAuth(FEATURES_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) throw new Error("Failed to create feature");
  return normalizeFeature((await response.json()) as FeatureRecord);
}

export async function fetchFeatureTestCases(
  featureId: string,
  query?: { type?: TestCaseType | ""; priority?: TestCasePriority | ""; isAutomatable?: string; q?: string }
) {
  const params = new URLSearchParams();
  if (query?.type) params.set("type", query.type);
  if (query?.priority) params.set("priority", query.priority);
  if (query?.isAutomatable === "true" || query?.isAutomatable === "false") params.set("isAutomatable", query.isAutomatable);
  if (query?.q) params.set("q", query.q);

  const suffix = params.toString() ? `?${params.toString()}` : "";
  const response = await fetchWithAuth(`${FEATURES_API}/${encodeURIComponent(featureId)}/test-cases${suffix}`);
  if (!response.ok) throw new Error("Failed to fetch test cases");
  const rows = (await response.json()) as TestCaseRecord[];
  return rows.map(normalizeTestCase);
}

export async function createFeatureTestCase(featureId: string, input: Omit<TestCaseInput, "featureId">) {
  const response = await fetchWithAuth(`${FEATURES_API}/${encodeURIComponent(featureId)}/test-cases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) throw new Error("Failed to create test case");
  return normalizeTestCase((await response.json()) as TestCaseRecord);
}

export async function updateTestCase(id: string, input: Partial<Omit<TestCaseInput, "featureId">>) {
  const response = await fetchWithAuth(`/api/test-cases/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) throw new Error("Failed to update test case");
  return normalizeTestCase((await response.json()) as TestCaseRecord);
}

export async function deleteTestCase(id: string) {
  const response = await fetchWithAuth(`/api/test-cases/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Failed to delete test case");
  return (await response.json()) as { id: string; deleted: true };
}

export async function generateFeatureTestCases(featureId: string, input: TestCaseGenerateInput) {
  const response = await fetchWithAuth(`${FEATURES_API}/${encodeURIComponent(featureId)}/test-cases/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) throw new Error("Failed to generate baseline test cases");
  const payload = (await response.json()) as { featureId: string; generated: TestCaseRecord[] };
  return { ...payload, generated: payload.generated.map(normalizeTestCase) };
}

export async function fetchFeatureTestRuns(featureId: string) {
  const response = await fetchWithAuth(`${FEATURES_API}/${encodeURIComponent(featureId)}/test-runs`);
  if (!response.ok) throw new Error("Failed to fetch test runs");
  const rows = (await response.json()) as TestRunRecord[];
  return rows.map(normalizeTestRun);
}

export async function createFeatureTestRun(featureId: string, input: { name: string; tester?: string; notes?: string }) {
  const response = await fetchWithAuth(`${FEATURES_API}/${encodeURIComponent(featureId)}/test-runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) throw new Error("Failed to create test run");
  return normalizeTestRun((await response.json()) as TestRunRecord);
}

export async function updateTestRun(runId: string, input: Partial<{ name: string; tester: string; notes: string; status: TestRunStatus; completedAt: string }>) {
  const response = await fetchWithAuth(`/api/test-runs/${encodeURIComponent(runId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) throw new Error("Failed to update test run");
  return normalizeTestRun((await response.json()) as TestRunRecord);
}

export async function fetchTestRunResults(runId: string) {
  const response = await fetchWithAuth(`/api/test-runs/${encodeURIComponent(runId)}/results`);
  if (!response.ok) throw new Error("Failed to fetch test run results");
  const rows = (await response.json()) as TestRunResultRecord[];
  return rows.map(normalizeTestRunResult);
}

export async function upsertTestRunResult(
  runId: string,
  testCaseId: string,
  input: { status: TestExecutionStatus; testedBy?: string; notes?: string; defectLink?: string; executedAt?: string }
) {
  const response = await fetchWithAuth(`/api/test-runs/${encodeURIComponent(runId)}/results/${encodeURIComponent(testCaseId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) throw new Error("Failed to update test run result");
  return normalizeTestRunResult((await response.json()) as TestRunResultRecord);
}

function escapeCsv(value: unknown) {
  const raw = typeof value === "string" ? value : JSON.stringify(value ?? "");
  const escaped = raw.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function buildTestCasesCsv(rows: TestCaseRecord[]) {
  const header = [
    "id",
    "featureId",
    "title",
    "priority",
    "type",
    "isAutomatable",
    "tags",
    "preconditions",
    "steps",
    "expectedResults",
    "postConditions",
    "automationNotes",
    "testData"
  ];

  const lines = rows.map((row) =>
    [
      row.id,
      row.featureId,
      row.title,
      row.priority,
      row.type,
      String(row.isAutomatable),
      row.tags.join("|"),
      row.preconditions,
      row.steps.join("\\n"),
      row.expectedResults.join("\\n"),
      row.postConditions,
      row.automationNotes,
      row.testData
    ]
      .map(escapeCsv)
      .join(",")
  );

  return `${header.join(",")}\n${lines.join("\n")}`;
}

export function downloadTestCasesCsv(filename: string, rows: TestCaseRecord[]) {
  const csv = buildTestCasesCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
