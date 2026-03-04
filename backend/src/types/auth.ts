import type { AppRole } from "@prisma/client";

export type AuthUser = {
  userId: string;
  role: AppRole;
  email: string;
  name: string;
  candidateId?: string;
};

export type AccessTokenPayload = AuthUser & {
  type: "access";
};
