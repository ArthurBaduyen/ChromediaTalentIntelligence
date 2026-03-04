import { AuditActorRole, AuditEntityType, Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { prisma } from "../prismaClient";
import type { AuditLogRecord, CreateAuditLogInput } from "../types";

function fromEntityType(value: AuditLogRecord["entityType"]): AuditEntityType {
  if (value === "candidate") return AuditEntityType.candidate;
  if (value === "skills") return AuditEntityType.skills;
  if (value === "shared_profile") return AuditEntityType.shared_profile;
  return AuditEntityType.auth;
}

function fromActorRole(value: AuditLogRecord["actorRole"]): AuditActorRole {
  if (value === "candidate") return AuditActorRole.candidate;
  if (value === "client") return AuditActorRole.client;
  if (value === "system") return AuditActorRole.system;
  return AuditActorRole.admin;
}

function toEntityType(value: AuditEntityType): AuditLogRecord["entityType"] {
  if (value === AuditEntityType.candidate) return "candidate";
  if (value === AuditEntityType.skills) return "skills";
  if (value === AuditEntityType.shared_profile) return "shared_profile";
  return "auth";
}

function toActorRole(value: AuditActorRole): AuditLogRecord["actorRole"] {
  if (value === AuditActorRole.candidate) return "candidate";
  if (value === AuditActorRole.client) return "client";
  if (value === AuditActorRole.system) return "system";
  return "admin";
}

function mapLog(row: {
  legacyId: string | null;
  action: string;
  entityType: AuditEntityType;
  entityId: string;
  actorRole: AuditActorRole;
  actorEmail: string;
  beforeState: Prisma.JsonValue | null;
  afterState: Prisma.JsonValue | null;
  metadata: Prisma.JsonValue;
  createdAt: Date;
}): AuditLogRecord {
  return {
    id: row.legacyId ?? `audit_${row.createdAt.getTime()}_${randomUUID().slice(0, 8)}`,
    action: row.action,
    entityType: toEntityType(row.entityType),
    entityId: row.entityId,
    actorRole: toActorRole(row.actorRole),
    actorEmail: row.actorEmail,
    beforeState: row.beforeState,
    afterState: row.afterState,
    metadata: (row.metadata && typeof row.metadata === "object" ? (row.metadata as Record<string, unknown>) : undefined),
    createdAt: row.createdAt.toISOString()
  };
}

export class AuditLogRepository {
  async list() {
    const rows = await prisma.auditLog.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" }
    });
    return rows.map(mapLog);
  }

  async append(input: CreateAuditLogInput) {
    const row = await prisma.auditLog.create({
      data: {
        legacyId: `audit_${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`,
        action: input.action,
        entityType: fromEntityType(input.entityType),
        entityId: input.entityId,
        actorRole: fromActorRole(input.actorRole),
        actorEmail: input.actorEmail,
        beforeState: input.beforeState as Prisma.InputJsonValue,
        afterState: input.afterState as Prisma.InputJsonValue,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue
      }
    });

    return mapLog(row);
  }

  async importOne(record: AuditLogRecord) {
    const row = await prisma.auditLog.upsert({
      where: { legacyId: record.id },
      create: {
        legacyId: record.id,
        action: record.action,
        entityType: fromEntityType(record.entityType),
        entityId: record.entityId,
        actorRole: fromActorRole(record.actorRole),
        actorEmail: record.actorEmail,
        beforeState: record.beforeState as Prisma.InputJsonValue,
        afterState: record.afterState as Prisma.InputJsonValue,
        metadata: (record.metadata ?? {}) as Prisma.InputJsonValue,
        createdAt: new Date(record.createdAt)
      },
      update: {
        action: record.action,
        entityType: fromEntityType(record.entityType),
        entityId: record.entityId,
        actorRole: fromActorRole(record.actorRole),
        actorEmail: record.actorEmail,
        beforeState: record.beforeState as Prisma.InputJsonValue,
        afterState: record.afterState as Prisma.InputJsonValue,
        metadata: (record.metadata ?? {}) as Prisma.InputJsonValue,
        createdAt: new Date(record.createdAt),
        deletedAt: null
      }
    });
    return mapLog(row);
  }
}
