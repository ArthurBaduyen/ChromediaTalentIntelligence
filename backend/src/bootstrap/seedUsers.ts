import { repositories } from "../db/repositories";
import { getAppEnv } from "../config/env";

export async function seedDefaultUsers() {
  const env = getAppEnv();
  await repositories.users.upsertDemoUser({
    role: "super_admin",
    email: "superadmin@chromedia.local",
    username: "superadmin",
    password: env.DEMO_SUPER_ADMIN_PASSWORD,
    name: "Super Admin"
  });
  await repositories.users.upsertDemoUser({
    role: "admin",
    email: "admin@chromedia.local",
    username: "admin",
    password: env.DEMO_ADMIN_PASSWORD,
    name: "Admin User"
  });
}
