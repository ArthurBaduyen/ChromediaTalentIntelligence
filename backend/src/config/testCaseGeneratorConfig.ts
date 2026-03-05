import type { TestCasePriority, TestCaseType } from "../db/types";

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

export type BundleTemplate = {
  key: TestCaseBundleKey;
  enabledByDefault: boolean;
  titlePrefix: string;
  priority: TestCasePriority;
  type: TestCaseType;
  automatableDefault: boolean;
  description: string;
};

export type GeneratorDefaults = {
  bundles: BundleTemplate[];
  roleFallbacks: string[];
  platformFallbacks: string[];
  browserFallbacks: string[];
};

export const TEST_CASE_GENERATOR_DEFAULTS: GeneratorDefaults = {
  roleFallbacks: ["admin", "user"],
  platformFallbacks: ["web"],
  browserFallbacks: ["Chrome latest"],
  bundles: [
    {
      key: "smoke",
      enabledByDefault: true,
      titlePrefix: "Smoke",
      priority: "P0",
      type: "Smoke",
      automatableDefault: true,
      description: "Critical path checks for the primary feature flow"
    },
    {
      key: "functional",
      enabledByDefault: true,
      titlePrefix: "Functional",
      priority: "P1",
      type: "Functional",
      automatableDefault: true,
      description: "Requirement-based happy and alternate paths"
    },
    {
      key: "negative",
      enabledByDefault: true,
      titlePrefix: "Negative/Edge",
      priority: "P1",
      type: "Negative",
      automatableDefault: true,
      description: "Validation, boundary, and edge behavior"
    },
    {
      key: "permissions",
      enabledByDefault: true,
      titlePrefix: "Permissions",
      priority: "P0",
      type: "Security",
      automatableDefault: true,
      description: "Role and access boundary checks"
    },
    {
      key: "api",
      enabledByDefault: true,
      titlePrefix: "API",
      priority: "P1",
      type: "API",
      automatableDefault: true,
      description: "API contract and reliability checks"
    },
    {
      key: "integration",
      enabledByDefault: true,
      titlePrefix: "Integration",
      priority: "P1",
      type: "Integration",
      automatableDefault: false,
      description: "Dependent systems and service integration checks"
    },
    {
      key: "compatibility",
      enabledByDefault: true,
      titlePrefix: "Compatibility",
      priority: "P2",
      type: "UI",
      automatableDefault: true,
      description: "Cross-browser/device behavior checks"
    },
    {
      key: "performance",
      enabledByDefault: true,
      titlePrefix: "Performance",
      priority: "P2",
      type: "Performance",
      automatableDefault: true,
      description: "Baseline performance and load sanity"
    },
    {
      key: "security",
      enabledByDefault: true,
      titlePrefix: "Security",
      priority: "P0",
      type: "Security",
      automatableDefault: true,
      description: "Security sanity checks for common vulnerabilities"
    },
    {
      key: "regression",
      enabledByDefault: true,
      titlePrefix: "Regression",
      priority: "P1",
      type: "Regression",
      automatableDefault: true,
      description: "Stable and high-risk regression candidates"
    }
  ]
};
