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
