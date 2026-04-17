import { existsSync } from "node:fs";
import path from "node:path";

import { config } from "dotenv";

const cwd = process.cwd();
const envTestPath = path.join(cwd, ".env.test");

if (existsSync(envTestPath)) {
  config({ path: envTestPath });
} else {
  config();
}

if (process.env.TEST_DATABASE_URL && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

process.env.NODE_ENV = "test";
