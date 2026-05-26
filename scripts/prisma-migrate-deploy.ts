import { spawnSync } from "node:child_process";
import { applyEnvDefaults } from "../src/lib/env";

const env = applyEnvDefaults(process.env);

if (!env.DATABASE_URL) {
  console.error("[migrate] DATABASE_URL is required to run Prisma migrations.");
  process.exit(1);
}

if (!process.env.DIRECT_DATABASE_URL && env.DIRECT_DATABASE_URL) {
  console.warn("[migrate] DIRECT_DATABASE_URL is not set; falling back to DATABASE_URL.");
}

const executable = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(executable, ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env,
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
