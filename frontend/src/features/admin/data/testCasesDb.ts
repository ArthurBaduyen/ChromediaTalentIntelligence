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
