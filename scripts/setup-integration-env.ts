import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const envTestExamplePath = path.join(cwd, ".env.test.example");
const envTestPath = path.join(cwd, ".env.test");

function ensureEnvTest(): void {
  if (!existsSync(envTestExamplePath)) {
    throw new Error("Missing .env.test.example");
  }

  if (!existsSync(envTestPath)) {
    copyFileSync(envTestExamplePath, envTestPath);
    console.log("Created .env.test from .env.test.example");
    return;
  }

  const existingContent = readFileSync(envTestPath, "utf8");
  if (existingContent.includes("company_research_tool_test")) {
    console.log(".env.test already exists and points to the default test database name.");
    return;
  }

  const normalizedContent = existingContent.trim().length > 0 ? existingContent : 'TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/company_research_tool_test?schema=public"\n';
  writeFileSync(envTestPath, normalizedContent, "utf8");
  console.log(".env.test already existed and was left unchanged.");
}

ensureEnvTest();
console.log("Next steps:");
console.log("1. Ensure a PostgreSQL server is running.");
console.log("2. Create database company_research_tool_test if it does not exist.");
console.log("3. Run npm run test:integration:check");
