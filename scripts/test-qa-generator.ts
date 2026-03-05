import assert from "node:assert/strict";
import { generateBaselineTestCases } from "../backend/src/services/testCaseGenerator";

function run() {
  const base = generateBaselineTestCases({
    featureId: "feature-1",
    featureName: "Candidate Search",
    description: "Search and filter candidates",
    roles: ["admin"],
    platforms: ["web"],
    browsersOrDevices: ["Chrome latest", "Safari latest"],
    hasApi: true
  });

  const repeat = generateBaselineTestCases({
    featureId: "feature-1",
    featureName: "Candidate Search",
    description: "Search and filter candidates",
    roles: ["admin"],
    platforms: ["web"],
    browsersOrDevices: ["Chrome latest", "Safari latest"],
    hasApi: true
  });

  assert.deepEqual(base, repeat, "Generator should be deterministic");
  assert.ok(base.length >= 10, "Expected default baseline bundles to produce at least one case each");
  assert.ok(base.some((item) => item.type === "Smoke"), "Missing Smoke test case");
  assert.ok(base.some((item) => item.type === "API"), "Missing API test case when hasApi=true");
  assert.ok(base.every((item) => item.title && item.steps.length > 0 && item.expectedResults.length > 0));

  const withoutApi = generateBaselineTestCases({
    featureId: "feature-2",
    featureName: "Profile Editor",
    roles: ["admin"],
    platforms: ["web"],
    browsersOrDevices: [],
    hasApi: false
  });
  assert.equal(
    withoutApi.some((item) => item.type === "API"),
    false,
    "API bundle should not be generated when hasApi=false"
  );

  const disabled = generateBaselineTestCases({
    featureId: "feature-3",
    featureName: "Permissions",
    roles: ["admin"],
    platforms: ["web"],
    browsersOrDevices: [],
    hasApi: true,
    disabledBundles: ["security", "performance"]
  });
  assert.equal(
    disabled.some((item) => item.title.startsWith("Security:")),
    false,
    "Security sanity bundle should be disabled"
  );
  assert.equal(disabled.some((item) => item.type === "Performance"), false, "Performance bundle should be disabled");

  console.log("QA generator tests passed.");
}

run();
