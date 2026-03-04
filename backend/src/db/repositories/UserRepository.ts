import { AppRole } from "@prisma/client";
import { prisma } from "../prismaClient";
import { hashPassword, verifyPassword } from "../utils/passwordHash";
import type { DemoUser } from "../types";

function toRole(role: DemoUser["role"]): AppRole {
  if (role === "candidate") return AppRole.candidate;
  if (role === "client") return AppRole.client;
  return AppRole.admin;
}

export class UserRepository {
  async upsertDemoUser(user: DemoUser) {
    const role = toRole(user.role);
    const passwordHash = await hashPassword(user.password);

    const dbUser = await prisma.user.upsert({
      where: { email: user.email.toLowerCase() },
      create: {
        email: user.email.toLowerCase(),
        passwordHash,
        role,
        isActive: true,
        deletedAt: null
      },
      update: {
        role,
        passwordHash,
        isActive: true,
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
      where: { email: email.toLowerCase(), deletedAt: null, isActive: true }
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
}
