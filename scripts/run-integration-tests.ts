import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

import { config } from "dotenv";

function pickConfiguredUrl(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim();
}

const cwd = process.cwd();
const envTestPath = path.join(cwd, ".env.test");
let parsedEnv: Record<string, string> | undefined;

if (existsSync(envTestPath)) {
  parsedEnv = config({ path: envTestPath }).parsed;
} else {
  parsedEnv = config().parsed;
}

const databaseUrl = pickConfiguredUrl(
  parsedEnv?.TEST_DATABASE_URL,
  parsedEnv?.DATABASE_URL,
  process.env.TEST_DATABASE_URL,
  process.env.DATABASE_URL
);

if (!databaseUrl) {
  throw new Error(
    "Missing TEST_DATABASE_URL or DATABASE_URL for integration tests. Run `npm run test:integration:setup`, then `npm run test:integration:check`."
  );
}

const env = {
  ...process.env,
  NODE_ENV: "test",
  DATABASE_URL: databaseUrl
};

execSync("npx prisma migrate reset --force --skip-generate", {
  cwd,
  stdio: "inherit",
  env
});

execSync("npx tsx prisma/seed.ts", {
  cwd,
  stdio: "inherit",
  env
});

execSync("npx vitest run tests/integration", {
  cwd,
  stdio: "inherit",
  env
});
