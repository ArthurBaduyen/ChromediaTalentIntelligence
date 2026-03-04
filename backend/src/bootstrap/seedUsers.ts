import { repositories } from "../db/repositories";
import { getAppEnv } from "../config/env";

export async function seedDefaultUsers() {
  const env = getAppEnv();
  await repositories.users.upsertDemoUser({
    role: "admin",
    email: "admin@chromedia.local",
    password: env.DEMO_ADMIN_PASSWORD,
    name: "Admin User"
  });
  await repositories.users.upsertDemoUser({
    role: "client",
    email: "client@chromedia.local",
    password: env.DEMO_CLIENT_PASSWORD,
    name: "Client User"
  });
  await repositories.users.upsertDemoUser({
    role: "candidate",
    email: "candidate@chromedia.local",
    password: env.DEMO_CANDIDATE_PASSWORD,
    name: "Alex Morgan",
    candidateId: "alex-morgan"
  });
}
