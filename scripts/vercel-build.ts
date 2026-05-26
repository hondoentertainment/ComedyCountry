import { spawnSync } from "node:child_process";
import { applyEnvDefaults, validateEnv } from "../src/lib/env";

function run(command: string, args: string[], env: NodeJS.ProcessEnv) {
  const executable = process.platform === "win32" ? `${command}.cmd` : command;
  const result = spawnSync(executable, args, {
    stdio: "inherit",
    env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const env = applyEnvDefaults(process.env);
const validation = validateEnv(env);

for (const warning of validation.warnings) {
  console.warn(`[build] ${warning}`);
}

if (!validation.valid) {
  console.error("[build] Production environment validation failed.");

  for (const missing of validation.missing) {
    if (missing === "DATABASE_URL") {
      console.error("[build] Set DATABASE_URL in Vercel to your production Postgres connection string.");
      continue;
    }

    if (missing === "NEXTAUTH_SECRET") {
      console.error("[build] Set NEXTAUTH_SECRET in Vercel to a 32+ character random secret.");
      continue;
    }

    if (missing === "NEXTAUTH_URL") {
      console.error("[build] Set NEXTAUTH_URL in Vercel to your canonical production URL.");
      continue;
    }

    console.error(`[build] Missing required env: ${missing}`);
  }

  for (const error of validation.errors) {
    console.error(`[build] ${error}`);
  }

  process.exit(1);
}

run("npm", ["run", "db:migrate:deploy"], env);
run("npx", ["next", "build"], env);
