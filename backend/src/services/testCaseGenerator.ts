import { TEST_CASE_GENERATOR_DEFAULTS, type TestCaseBundleKey } from "../config/testCaseGeneratorConfig";
import type { CreateTestCaseInput, TestCasePriority, TestCaseType } from "../db/types";

export type GenerateTestCasesInput = {
  featureId: string;
  featureName: string;
  description?: string;
  roles: string[];
  platforms: string[];
  browsersOrDevices: string[];
  hasApi: boolean;
  disabledBundles?: TestCaseBundleKey[];
  selectedBundles?: TestCaseBundleKey[];
};

const typeTags: Record<TestCaseType, string> = {
  Smoke: "smoke",
  Functional: "functional",
  Negative: "negative",
  Regression: "regression",
  API: "api",
  Integration: "integration",
  UI: "ui",
  Security: "security",
  Performance: "performance"
};

function normalizeList(values: string[], fallback: string[]) {
  const cleaned = values.map((value) => value.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned : fallback;
}

function makeBase(input: GenerateTestCasesInput) {
  const roles = normalizeList(input.roles, TEST_CASE_GENERATOR_DEFAULTS.roleFallbacks);
  const platforms = normalizeList(input.platforms, TEST_CASE_GENERATOR_DEFAULTS.platformFallbacks);
  const browsers = normalizeList(input.browsersOrDevices, TEST_CASE_GENERATOR_DEFAULTS.browserFallbacks);

  return {
    roles,
    platforms,
    browsers,
    hasApi: input.hasApi,
    featureName: input.featureName.trim() || "Feature",
    featureId: input.featureId,
    description: input.description?.trim() || ""
  };
}

function buildCase(args: {
  featureId: string;
  title: string;
  priority: TestCasePriority;
  type: TestCaseType;
  preconditions: string;
  testData: Record<string, unknown>;
  steps: string[];
  expectedResults: string[];
  postConditions?: string;
  isAutomatable: boolean;
  automationNotes?: string;
  tags: string[];
}): CreateTestCaseInput {
  return {
    featureId: args.featureId,
    title: args.title,
    preconditions: args.preconditions,
    testData: args.testData,
    steps: args.steps,
    expectedResults: args.expectedResults,
    postConditions: args.postConditions ?? "System remains stable and data integrity is preserved.",
    priority: args.priority,
    type: args.type,
    isAutomatable: args.isAutomatable,
    automationNotes: args.automationNotes ?? "",
    tags: args.tags
  };
}

export function generateBaselineTestCases(input: GenerateTestCasesInput): CreateTestCaseInput[] {
  const base = makeBase(input);
  const disabled = new Set(input.disabledBundles ?? []);
  const selected = input.selectedBundles ? new Set(input.selectedBundles) : null;
  const enabledBundles = TEST_CASE_GENERATOR_DEFAULTS.bundles.filter((bundle) => {
    if (!bundle.enabledByDefault) return false;
    if (disabled.has(bundle.key)) return false;
    if (selected && !selected.has(bundle.key)) return false;
    if (bundle.key === "api" && !base.hasApi) return false;
    return true;
  });

  const cases: CreateTestCaseInput[] = [];

  for (const bundle of enabledBundles) {
    if (bundle.key === "smoke") {
      cases.push(
        buildCase({
          featureId: base.featureId,
          title: `${bundle.titlePrefix}: ${base.featureName} critical path succeeds`,
          priority: bundle.priority,
          type: bundle.type,
          preconditions: `Authenticated ${base.roles[0]} session and required seed data are available.`,
          testData: { flow: "critical_path", roles: base.roles, platforms: base.platforms },
          steps: [
            `Open ${base.featureName} on ${base.platforms[0]}.`,
            "Complete the minimum required inputs and submit once.",
            "Observe navigation, status feedback, and resulting saved state."
          ],
          expectedResults: [
            "Submission succeeds without validation or server errors.",
            "A success confirmation is visible and persisted data is retrievable.",
            "No duplicate records are created."
          ],
          isAutomatable: bundle.automatableDefault,
          automationNotes: "Strong candidate for API + UI smoke automation.",
          tags: ["baseline", typeTags[bundle.type], "critical-path"]
        })
      );
    }

    if (bundle.key === "functional") {
      cases.push(
        buildCase({
          featureId: base.featureId,
          title: `${bundle.titlePrefix}: happy path and alternate flow for ${base.featureName}`,
          priority: bundle.priority,
          type: bundle.type,
          preconditions: "User has valid access and reference data exists.",
          testData: { scenario: ["happy_path", "alternate_path"], description: base.description },
          steps: [
            "Execute the primary business flow using valid data.",
            "Repeat using alternate supported values/branch.",
            "Verify persisted entity details from list/detail views."
          ],
          expectedResults: [
            "Both happy and alternate flows satisfy business rules.",
            "Resulting records match expected field values.",
            "No unexpected warnings or hidden side effects appear."
          ],
          isAutomatable: bundle.automatableDefault,
          tags: ["baseline", typeTags[bundle.type], "requirements"]
        })
      );
    }

    if (bundle.key === "negative") {
      cases.push(
        buildCase({
          featureId: base.featureId,
          title: `${bundle.titlePrefix}: validation and edge handling for ${base.featureName}`,
          priority: bundle.priority,
          type: bundle.type,
          preconditions: "Form/input screen is reachable.",
          testData: {
            values: ["", null, "very long string", "special chars !@#$%^&*()", "boundary min/max"],
            actions: ["double-submit", "refresh during submit"]
          },
          steps: [
            "Submit empty/null/boundary values to required and constrained fields.",
            "Submit very long and special-character input in text fields.",
            "Trigger rapid double-submit and browser refresh during active submission."
          ],
          expectedResults: [
            "Inline validation blocks invalid input with clear messages.",
            "Server rejects malformed payloads safely and returns consistent errors.",
            "Double-submit/refresh does not corrupt state or create duplicate records."
          ],
          isAutomatable: bundle.automatableDefault,
          tags: ["baseline", typeTags[bundle.type], "validation", "edge"]
        })
      );
    }

    if (bundle.key === "permissions") {
      cases.push(
        buildCase({
          featureId: base.featureId,
          title: `${bundle.titlePrefix}: unauthorized and boundary access for ${base.featureName}`,
          priority: bundle.priority,
          type: bundle.type,
          preconditions: "At least one authorized and one unauthorized role exist.",
          testData: { authorizedRoles: base.roles, unauthorizedRoles: ["client", "candidate"] },
          steps: [
            "Access feature and related API endpoints as an authorized role.",
            "Repeat with an unauthorized role and without authentication.",
            "If tenant scoping exists, attempt cross-tenant resource access."
          ],
          expectedResults: [
            "Authorized role is allowed only within expected scope.",
            "Unauthorized/unauthenticated requests return 401/403 consistently.",
            "Cross-tenant access is denied and audited where applicable."
          ],
          isAutomatable: bundle.automatableDefault,
          tags: ["baseline", "permissions", "authz"]
        })
      );
    }

    if (bundle.key === "api") {
      cases.push(
        buildCase({
          featureId: base.featureId,
          title: `${bundle.titlePrefix}: contract and idempotency checks for ${base.featureName}`,
          priority: bundle.priority,
          type: bundle.type,
          preconditions: "API credentials/token are available.",
          testData: {
            assertions: ["status codes", "schema", "pagination", "filters", "idempotency", "auth expiry"]
          },
          steps: [
            "Call endpoints with valid/invalid payloads and verify status codes.",
            "Validate response schema and pagination/filter behavior.",
            "Repeat idempotent operations and test expired/invalid auth tokens."
          ],
          expectedResults: [
            "API responses match contract for success and error paths.",
            "Pagination and filters are stable and deterministic.",
            "Idempotent operations are safe; auth expiry is handled predictably."
          ],
          isAutomatable: bundle.automatableDefault,
          tags: ["baseline", "api", "contract"]
        })
      );
    }

    if (bundle.key === "integration") {
      cases.push(
        buildCase({
          featureId: base.featureId,
          title: `${bundle.titlePrefix}: dependency failures/timeouts for ${base.featureName}`,
          priority: bundle.priority,
          type: bundle.type,
          preconditions: "Downstream integrations can be stubbed or simulated.",
          testData: { faultModes: ["timeout", "5xx", "network drop", "retry"] },
          steps: [
            "Trigger workflow that depends on notification/third-party integration.",
            "Simulate timeout/error responses from dependency.",
            "Verify retry/backoff behavior and surfaced user-facing status."
          ],
          expectedResults: [
            "System fails gracefully without data loss.",
            "Retries and timeout handling follow configured behavior.",
            "Actionable error feedback is surfaced for operators/users."
          ],
          isAutomatable: bundle.automatableDefault,
          tags: ["baseline", "integration", "resilience"]
        })
      );
    }

    if (bundle.key === "compatibility") {
      cases.push(
        buildCase({
          featureId: base.featureId,
          title: `${bundle.titlePrefix}: browser/device coverage for ${base.featureName}`,
          priority: bundle.priority,
          type: bundle.type,
          preconditions: "Test matrix includes target browsers/devices.",
          testData: { matrix: base.browsers, platforms: base.platforms },
          steps: [
            "Execute the core feature flow across each target browser/device.",
            "Check layout, interactions, and input behavior for each platform.",
            "Capture browser/device-specific regressions with reproduction steps."
          ],
          expectedResults: [
            "Core flow behaves consistently across target matrix.",
            "No critical UI breakage or unsupported interactions occur.",
            "Known variances are documented with severity."
          ],
          isAutomatable: bundle.automatableDefault,
          tags: ["baseline", "compatibility", "ui"]
        })
      );
    }

    if (bundle.key === "performance") {
      cases.push(
        buildCase({
          featureId: base.featureId,
          title: `${bundle.titlePrefix}: baseline load and large dataset for ${base.featureName}`,
          priority: bundle.priority,
          type: bundle.type,
          preconditions: "Environment supports representative dataset size.",
          testData: { datasetSize: "large", metrics: ["latency", "time-to-interactive"] },
          steps: [
            "Load feature with representative large dataset.",
            "Execute common filters/search/actions under normal load.",
            "Measure response time and UI responsiveness thresholds."
          ],
          expectedResults: [
            "Feature remains usable without timeouts or severe lag.",
            "Key operations stay within agreed baseline thresholds.",
            "No memory leak or sustained error-rate spike is observed."
          ],
          isAutomatable: bundle.automatableDefault,
          tags: ["baseline", "performance", "non-functional"]
        })
      );
    }

    if (bundle.key === "security") {
      cases.push(
        buildCase({
          featureId: base.featureId,
          title: `${bundle.titlePrefix}: XSS/data exposure/CSRF sanity for ${base.featureName}`,
          priority: bundle.priority,
          type: bundle.type,
          preconditions: "Security headers/auth are enabled in target environment.",
          testData: {
            payloads: ["<script>alert(1)</script>", "javascript:alert(1)", "sensitive field probes"],
            csrf: "state-changing request without token"
          },
          steps: [
            "Attempt reflected/stored XSS payloads in user-controlled inputs.",
            "Inspect responses/UI for sensitive data leakage.",
            "Attempt state-changing request with missing/invalid CSRF token where relevant."
          ],
          expectedResults: [
            "XSS payloads are neutralized and not executed.",
            "Sensitive data is never exposed to unauthorized contexts.",
            "CSRF-protected endpoints reject invalid or missing tokens."
          ],
          isAutomatable: bundle.automatableDefault,
          tags: ["baseline", "security", "sanity"]
        })
      );
    }

    if (bundle.key === "regression") {
      cases.push(
        buildCase({
          featureId: base.featureId,
          title: `${bundle.titlePrefix}: stable high-risk regression suite for ${base.featureName}`,
          priority: bundle.priority,
          type: bundle.type,
          preconditions: "Historical defects and critical flows are identified.",
          testData: {
            candidates: ["smoke critical path", "permissions", "core API contract", "high-frequency workflow"]
          },
          steps: [
            "Select stable, deterministic high-risk test candidates.",
            "Execute selected tests after a simulated code change.",
            "Record pass/fail and mark candidates for automation gating."
          ],
          expectedResults: [
            "Selected tests provide fast confidence for high-risk areas.",
            "Failures are actionable and reproducible.",
            "Automation candidates are clearly marked with notes."
          ],
          isAutomatable: bundle.automatableDefault,
          tags: ["baseline", "regression", "candidate-suite"]
        })
      );
    }
  }

  return cases;
}
