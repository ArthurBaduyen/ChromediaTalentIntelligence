import { CandidateRepository } from "./CandidateRepository";
import { SkillRepository } from "./SkillRepository";
import { SharedProfileRepository } from "./SharedProfileRepository";
import { AuditLogRepository } from "./AuditLogRepository";
import { AuthSessionRepository } from "./AuthSessionRepository";
import { UserRepository } from "./UserRepository";
import { CandidateInviteLinkRepository } from "./CandidateInviteLinkRepository";

export const repositories = {
  candidates: new CandidateRepository(),
  skills: new SkillRepository(),
  sharedProfiles: new SharedProfileRepository(),
  auditLogs: new AuditLogRepository(),
  authSessions: new AuthSessionRepository(),
  users: new UserRepository(),
  candidateInviteLinks: new CandidateInviteLinkRepository()
};
