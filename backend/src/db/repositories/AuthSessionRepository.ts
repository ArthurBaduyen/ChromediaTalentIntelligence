import { AppRole } from "@prisma/client";
import { prisma } from "../prismaClient";
import { hashToken } from "../utils/tokenHash";
import type { AuthSessionRecord } from "../types";
import { UserRepository } from "./UserRepository";

function toRole(role: AuthSessionRecord["role"]) {
  if (role === "super_admin") return AppRole.super_admin;
  if (role === "candidate") return AppRole.candidate;
  if (role === "client") return AppRole.client;
  return AppRole.admin;
}

function fromRole(role: AppRole): AuthSessionRecord["role"] {
  if (role === AppRole.super_admin) return "super_admin";
  if (role === AppRole.candidate) return "candidate";
  if (role === AppRole.client) return "client";
  return "admin";
}

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : undefined;
}

function mapSession(row: {
  role: AppRole;
  userId: string | null;
  email: string;
  name: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  lastSeenAt: Date | null;
  candidate: { legacyId: string } | null;
  user?: { isEnabled: boolean; deletedAt: Date | null } | null;
}): Omit<AuthSessionRecord, "token"> {
  return {
    userId: row.userId ?? undefined,
    role: fromRole(row.role),
    email: row.email,
    name: row.name,
    candidateId: row.candidate?.legacyId,
    expiresAt: row.expiresAt.toISOString(),
    revokedAt: toIso(row.revokedAt),
    createdAt: row.createdAt.toISOString(),
    lastSeenAt: toIso(row.lastSeenAt)
  };
}

export class AuthSessionRepository {
  private readonly users = new UserRepository();

  async create(input: AuthSessionRecord) {
    const tokenHash = hashToken(input.token);
    const user = await this.users.findByEmail(input.email);
    const candidate = input.candidateId
      ? await prisma.candidate.findFirst({ where: { legacyId: input.candidateId, deletedAt: null }, select: { id: true } })
      : null;

    await prisma.authSession.upsert({
      where: { tokenHash },
      create: {
        tokenHash,
        role: toRole(input.role),
        email: input.email.toLowerCase(),
        name: input.name,
        userId: input.userId ?? user?.id,
        candidateId: candidate?.id ?? null,
        expiresAt: new Date(input.expiresAt),
        revokedAt: input.revokedAt ? new Date(input.revokedAt) : null,
        createdAt: new Date(input.createdAt),
        lastSeenAt: input.lastSeenAt ? new Date(input.lastSeenAt) : null,
        deletedAt: null
      },
      update: {
        role: toRole(input.role),
        email: input.email.toLowerCase(),
        name: input.name,
        userId: input.userId ?? user?.id,
        candidateId: candidate?.id ?? null,
        expiresAt: new Date(input.expiresAt),
        revokedAt: input.revokedAt ? new Date(input.revokedAt) : null,
        createdAt: new Date(input.createdAt),
        lastSeenAt: input.lastSeenAt ? new Date(input.lastSeenAt) : null,
        deletedAt: null
      }
    });
  }

  async revokeActiveSessionsForEmail(email: string) {
    await prisma.authSession.updateMany({
      where: {
        email: email.toLowerCase(),
        revokedAt: null,
        deletedAt: null
      },
      data: { revokedAt: new Date() }
    });
  }

  async findActiveByToken(token: string) {
    const tokenHash = hashToken(token);
    const row = await prisma.authSession.findFirst({
      where: {
        tokenHash,
        deletedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() }
      },
      include: {
        candidate: { select: { legacyId: true } },
        user: { select: { isEnabled: true, deletedAt: true } }
      }
    });
    if (!row) return null;
    if (row.user && (!row.user.isEnabled || row.user.deletedAt)) return null;

    return {
      ...mapSession(row),
      token
    };
  }

  async revokeByToken(token: string) {
    const tokenHash = hashToken(token);
    const row = await prisma.authSession.findFirst({
      where: { tokenHash, deletedAt: null },
      include: {
        candidate: { select: { legacyId: true } },
        user: { select: { isEnabled: true, deletedAt: true } }
      }
    });
    if (!row) return null;

    const updated = await prisma.authSession.update({
      where: { id: row.id },
      data: { revokedAt: new Date() },
      include: {
        candidate: { select: { legacyId: true } },
        user: { select: { isEnabled: true, deletedAt: true } }
      }
    });

    return {
      ...mapSession(updated),
      token
    };
  }
}
