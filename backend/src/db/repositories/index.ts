import { CandidateRepository } from "./CandidateRepository";
import { SkillRepository } from "./SkillRepository";
import { SharedProfileRepository } from "./SharedProfileRepository";
import { AuditLogRepository } from "./AuditLogRepository";
import { AuthSessionRepository } from "./AuthSessionRepository";
import { UserRepository } from "./UserRepository";
import { CandidateInviteLinkRepository } from "./CandidateInviteLinkRepository";
import { FeatureRepository } from "./FeatureRepository";
import { TestCaseRepository } from "./TestCaseRepository";
import { TestRunRepository } from "./TestRunRepository";

export const repositories = {
  candidates: new CandidateRepository(),
  skills: new SkillRepository(),
  sharedProfiles: new SharedProfileRepository(),
  auditLogs: new AuditLogRepository(),
  authSessions: new AuthSessionRepository(),
  users: new UserRepository(),
  candidateInviteLinks: new CandidateInviteLinkRepository(),
  features: new FeatureRepository(),
  testCases: new TestCaseRepository(),
  testRuns: new TestRunRepository()
};
