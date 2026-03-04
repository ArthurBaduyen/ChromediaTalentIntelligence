import { AppRole, Prisma } from "@prisma/client";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "../prismaClient";
import { hashPassword, verifyPassword } from "../utils/passwordHash";
import { hashToken } from "../utils/tokenHash";
import type { DemoUser, ManagedUserRecord, UserRole } from "../types";

function toRole(role: DemoUser["role"]): AppRole {
  if (role === "super_admin") return AppRole.super_admin;
  if (role === "candidate") return AppRole.candidate;
  if (role === "client") return AppRole.client;
  return AppRole.admin;
}

function toManagedRole(role: AppRole): UserRole {
  return role === AppRole.super_admin ? "super_admin" : "admin";
}

function managedRoleToDb(role: UserRole): AppRole {
  return role === "super_admin" ? AppRole.super_admin : AppRole.admin;
}

function defaultNameForRole(role: AppRole) {
  if (role === AppRole.super_admin) return "Super Admin";
  if (role === AppRole.admin) return "Admin User";
  if (role === AppRole.client) return "Client User";
  return "Candidate User";
}

function normalizeUsername(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_");
}

function fromDate(value: Date | null | undefined) {
  return value ? value.toISOString() : undefined;
}

function mapManagedUser(row: {
  id: string;
  email: string;
  username: string;
  role: AppRole;
  isEnabled: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): ManagedUserRecord {
  return {
    id: row.id,
    name: row.username || defaultNameForRole(row.role),
    email: row.email,
    username: row.username,
    role: toManagedRole(row.role),
    isEnabled: row.isEnabled,
    lastLoginAt: fromDate(row.lastLoginAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function toFriendlyError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const fields = Array.isArray(error.meta?.target) ? error.meta?.target.join(", ") : "email/username";
    return new Error(`Duplicate value for ${fields}.`);
  }
  return error instanceof Error ? error : new Error("Unexpected user operation error");
}

export class UserRepository {
  async upsertDemoUser(user: DemoUser) {
    const role = toRole(user.role);
    const passwordHash = await hashPassword(user.password);
    const username = normalizeUsername(user.username ?? user.email.split("@")[0] ?? user.email);

    const dbUser = await prisma.user.upsert({
      where: { email: user.email.toLowerCase() },
      create: {
        email: user.email.toLowerCase(),
        username,
        passwordHash,
        role,
        isEnabled: true,
        deletedAt: null
      },
      update: {
        username,
        role,
        passwordHash,
        isEnabled: true,
        deletedAt: null,
        updatedAt: new Date()
      }
    });

    if (user.role === "candidate" && user.candidateId) {
      const candidate = await prisma.candidate.findFirst({
        where: { legacyId: user.candidateId, deletedAt: null },
        select: { id: true }
      });
      if (candidate) {
        await prisma.candidateAccount.upsert({
          where: { userId: dbUser.id },
          create: { userId: dbUser.id, candidateId: candidate.id },
          update: { candidateId: candidate.id }
        });
      }
    }

    return dbUser;
  }

  async findByEmail(email: string) {
    return prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null, isEnabled: true }
    });
  }

  async verifyUserPassword(email: string, password: string) {
    const user = await this.findByEmail(email);
    if (!user) return null;
    const ok = await verifyPassword(password, user.passwordHash);
    return ok ? user : null;
  }

  async getCandidateLegacyIdForUser(userId: string) {
    const account = await prisma.candidateAccount.findUnique({
      where: { userId },
      include: { candidate: { select: { legacyId: true } } }
    });
    return account?.candidate.legacyId;
  }

  async isUserActive(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, deletedAt: true, isEnabled: true }
    });
    return Boolean(user && !user.deletedAt && user.isEnabled);
  }

  async listManagedUsers(search?: string) {
    const q = search?.trim().toLowerCase();
    const rows = await prisma.user.findMany({
      where: {
        deletedAt: null,
        role: { in: [AppRole.super_admin, AppRole.admin] },
        ...(q
          ? {
              OR: [
                { email: { contains: q, mode: "insensitive" } },
                { username: { contains: q, mode: "insensitive" } }
              ]
            }
          : {})
      },
      include: {
        sessions: {
          where: { deletedAt: null },
          orderBy: [{ lastSeenAt: "desc" }, { createdAt: "desc" }],
          take: 1,
          select: { createdAt: true, lastSeenAt: true }
        }
      },
      orderBy: [{ email: "asc" }]
    });

    return rows.map((row) =>
      mapManagedUser({
        ...row,
        lastLoginAt: row.sessions[0]?.lastSeenAt ?? row.sessions[0]?.createdAt ?? row.lastLoginAt
      })
    );
  }

  async findManagedUserById(userId: string) {
    const row = await prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
        role: { in: [AppRole.super_admin, AppRole.admin] }
      },
      include: {
        sessions: {
          where: { deletedAt: null },
          orderBy: [{ lastSeenAt: "desc" }, { createdAt: "desc" }],
          take: 1,
          select: { createdAt: true, lastSeenAt: true }
        }
      }
    });
    if (!row) return null;
    return mapManagedUser({
      ...row,
      lastLoginAt: row.sessions[0]?.lastSeenAt ?? row.sessions[0]?.createdAt ?? row.lastLoginAt
    });
  }

  async createManagedUser(input: { email: string; username: string; role: UserRole; password: string }) {
    try {
      const created = await prisma.user.create({
        data: {
          email: input.email.toLowerCase(),
          username: normalizeUsername(input.username),
          passwordHash: await hashPassword(input.password),
          role: managedRoleToDb(input.role),
          isEnabled: true
        }
      });
      return mapManagedUser(created);
    } catch (error) {
      throw toFriendlyError(error);
    }
  }

  async updateManagedUser(
    userId: string,
    input: Partial<{ username: string; role: UserRole; isEnabled: boolean }>
  ) {
    const data: Prisma.UserUpdateInput = {};
    if (typeof input.username === "string") data.username = normalizeUsername(input.username);
    if (typeof input.role === "string") data.role = managedRoleToDb(input.role);
    if (typeof input.isEnabled === "boolean") data.isEnabled = input.isEnabled;

    let row;
    try {
      row = await prisma.user.update({
        where: { id: userId },
        data
      });
    } catch (error) {
      throw toFriendlyError(error);
    }

    if (input.isEnabled === false) {
      await this.revokeAllSessionsForUserId(userId);
    }

    return mapManagedUser(row);
  }

  async softDeleteManagedUser(userId: string, actorUserId: string) {
    if (userId === actorUserId) {
      throw new Error("You cannot delete your own account.");
    }

    const row = await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        isEnabled: false
      }
    });

    await this.revokeAllSessionsForUserId(userId);
    return mapManagedUser(row);
  }

  async setPassword(userId: string, newPassword: string) {
    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });
    await this.revokeAllSessionsForUserId(userId);
  }

  async revokeAllSessionsForUserId(userId: string) {
    await prisma.authSession.updateMany({
      where: {
        userId,
        revokedAt: null,
        deletedAt: null
      },
      data: { revokedAt: new Date() }
    });
  }

  async createPasswordResetToken(userId: string, ttlMinutes = 60) {
    const token = `rst_${randomBytes(32).toString("hex")}`;
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt
      }
    });

    return {
      token,
      expiresAt: expiresAt.toISOString()
    };
  }

  async consumePasswordResetToken(token: string, newPassword: string) {
    const hash = hashToken(token);
    const candidate = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash: hash,
        usedAt: null,
        expiresAt: { gt: new Date() }
      },
      include: { user: true },
      orderBy: { createdAt: "desc" }
    });

    if (!candidate) return null;

    const left = Buffer.from(hash, "utf8");
    const right = Buffer.from(candidate.tokenHash, "utf8");
    if (left.length !== right.length || !timingSafeEqual(left, right)) return null;

    await this.applyResetForToken(candidate.id, candidate.userId, newPassword);
    return candidate.user;
  }

  private async applyResetForToken(tokenId: string, userId: string, newPassword: string) {
    const passwordHash = await hashPassword(newPassword);
    await prisma.$transaction([
      prisma.passwordResetToken.update({
        where: { id: tokenId },
        data: { usedAt: new Date() }
      }),
      prisma.user.update({
        where: { id: userId },
        data: { passwordHash }
      })
    ]);
    await this.revokeAllSessionsForUserId(userId);
  }
}
