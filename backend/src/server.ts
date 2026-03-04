import "dotenv/config";
import { createApp } from "./app";
import { getAppEnv } from "./config/env";
import { seedDefaultUsers } from "./bootstrap/seedUsers";

async function main() {
  const env = getAppEnv();
  await seedDefaultUsers();
  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`Backend API listening on http://localhost:${env.PORT}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
