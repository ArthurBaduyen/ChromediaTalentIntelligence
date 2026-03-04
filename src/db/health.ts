import { prisma } from "./prismaClient";

export async function checkDatabaseHealth() {
  await prisma.$queryRaw`SELECT 1`;
  return { ok: true };
}
