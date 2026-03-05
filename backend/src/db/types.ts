export type CandidateRecord = {
  id: string;
  name: string;
  role: string;
  technologies: string;
  expectedSalary: string;
  available: string;
  status: "Active" | "Inactive" | "Pending";
  contact?: {
    phoneCountryCode: "+63";
    phoneNumber: string;
    email: string;
    iMessage?: string;
  };
  location?: {
    address: string;
    city: string;
    region: string;
    zipCode: string;
    country: string;
  };
  compensation?: {
    expectedAmount: number;
    expectedRate: "Hourly" | "Daily" | "Monthly";
    offeredAmount?: number;
    offeredRate?: "Hourly" | "Daily" | "Monthly";
    currency: "USD";
  };
  employment?: {
    contract: string;
    availability: string;
  };
  profile?: {
    about: string;
    experience: string;
    education: Array<{ year: string; degree: string; school: string }>;
    projects: Array<{
      name: string;
      role: string;
      duration: string;
      summary: string;
      responsibilities: string[];
      technologies: string[];
    }>;
    skillSelections?: Array<{
      categoryId: string;
      selectedSubSkills: Array<{
        skillId: string;
        level: string;
        capabilityId: string;
        text?: string;
      }>;
    }>;
    videoTitle?: string;
    videoUrl?: string;
    coderbyteScore?: string;
    coderbyteLink?: string;
  };
  schemaVersion?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type SkillsState = {
  taxonomyVersion?: number;
  updatedAt?: string;
  categories: Array<{
    id: string;
    name: string;
    slug?: string;
    description?: string;
    skills: Array<{
      id: string;
      name: string;
      code?: string;
      description?: string;
      capabilities: Array<{ level: string; entries: string[] }>;
      createdAt?: string;
      updatedAt?: string;
    }>;
    createdAt?: string;
    updatedAt?: string;
  }>;
};

export type SharedProfileRecord = {
  id: string;
  shareToken?: string;
  candidateId: string;
  candidateName: string;
  candidateRole: string;
  sharedWithName: string;
  sharedWithEmail: string;
  rateLabel: string;
  expirationDate: string;
  sharedAt: string;
  revokedAt?: string;
  accessCount?: number;
  lastAccessedAt?: string;
};

export type CandidateInviteLinkRecord = {
  token: string;
  candidateId: string;
  expiresAt: string;
  revokedAt?: string;
  accessCount?: number;
  lastAccessedAt?: string;
};

export type AuthSessionRecord = {
  token: string;
  userId?: string;
  role: "super_admin" | "admin" | "candidate" | "client";
  email: string;
  name: string;
  candidateId?: string;
  expiresAt: string;
  revokedAt?: string;
  createdAt: string;
  lastSeenAt?: string;
};

export type AuditLogRecord = {
  id: string;
  action: string;
  entityType: "candidate" | "skills" | "shared_profile" | "auth";
  entityId: string;
  actorRole: "admin" | "candidate" | "client" | "system";
  actorEmail: string;
  beforeState: unknown;
  afterState: unknown;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type CreateAuditLogInput = Omit<AuditLogRecord, "id" | "createdAt">;

export type TestCasePriority = "P0" | "P1" | "P2";

export type TestCaseType =
  | "Smoke"
  | "Functional"
  | "Negative"
  | "Regression"
  | "API"
  | "Integration"
  | "UI"
  | "Security"
  | "Performance";

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

export type CreateFeatureInput = Omit<FeatureRecord, "id" | "createdAt" | "updatedAt">;
export type UpdateFeatureInput = Partial<CreateFeatureInput>;

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

export type CreateTestCaseInput = Omit<TestCaseRecord, "id" | "createdAt" | "updatedAt">;
export type UpdateTestCaseInput = Partial<Omit<TestCaseRecord, "id" | "featureId" | "createdAt" | "updatedAt">>;

export type TestCaseFilters = {
  type?: TestCaseType;
  priority?: TestCasePriority;
  isAutomatable?: boolean;
  search: string;
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

export type CreateTestRunInput = {
  featureId: string;
  name: string;
  tester?: string;
  notes?: string;
};

export type UpdateTestRunInput = Partial<{
  name: string;
  tester: string;
  notes: string;
  status: TestRunStatus;
  completedAt: string;
}>;

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

export type UpsertTestRunResultInput = Omit<TestRunResultRecord, "id" | "createdAt" | "updatedAt">;

export type DemoUser = {
  role: "super_admin" | "admin" | "candidate" | "client";
  email: string;
  username?: string;
  password: string;
  name: string;
  candidateId?: string;
};

export type UserRole = "super_admin" | "admin";

export type ManagedUserRecord = {
  id: string;
  name: string;
  email: string;
  username: string;
  role: UserRole;
  isEnabled: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
};
