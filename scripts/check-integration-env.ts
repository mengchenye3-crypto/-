import { existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";

import { config } from "dotenv";

function pickConfiguredUrl(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim();
}

function loadEnv(): { parsed?: Record<string, string> } {
  const cwd = process.cwd();
  const envTestPath = path.join(cwd, ".env.test");

  if (existsSync(envTestPath)) {
    const result = config({ path: envTestPath });
    console.log("Loaded .env.test");
    return result;
  }

  const result = config();
  console.log("Loaded default environment (.env if present)");
  console.log("Hint: run `npm run test:integration:setup` to create .env.test.");
  return result;
}

function parseDatabaseUrl(rawUrl: string): URL {
  try {
    return new URL(rawUrl);
  } catch {
    throw new Error("TEST_DATABASE_URL is not a valid PostgreSQL URL.");
  }
}

function checkTcp(host: string, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port, timeout: 3000 });

    socket.once("connect", () => {
      socket.end();
      resolve();
    });

    socket.once("timeout", () => {
      socket.destroy();
      reject(new Error(`Timed out connecting to ${host}:${port}`));
    });

    socket.once("error", (error) => {
      const message = error instanceof Error ? error.message : String(error);
      reject(new Error(`Could not connect to ${host}:${port}. ${message}`));
    });
  });
}

async function main(): Promise<void> {
  const envResult = loadEnv();

  const databaseUrl = pickConfiguredUrl(
    envResult.parsed?.TEST_DATABASE_URL,
    envResult.parsed?.DATABASE_URL,
    process.env.TEST_DATABASE_URL,
    process.env.DATABASE_URL
  );

  if (!databaseUrl) {
    throw new Error(
      "Missing TEST_DATABASE_URL or DATABASE_URL. Run `npm run test:integration:setup`, then fill in the test database connection."
    );
  }

  const parsed = parseDatabaseUrl(databaseUrl);
  const host = parsed.hostname || "localhost";
  const port = Number(parsed.port || "5432");
  const databaseName = parsed.pathname.replace(/^\//, "");

  console.log(`Database host: ${host}`);
  console.log(`Database port: ${port}`);
  console.log(`Database name: ${databaseName || "(missing)"}`);

  await checkTcp(host, port);

  console.log("TCP connection check passed.");
}

main().catch((error) => {
  console.error("Integration test preflight failed.");
  const message = error instanceof Error ? error.message : String(error);
  if (message.trim().length > 0) {
    console.error(message);
  }
  console.error("Recommended next steps:");
  console.error("1. Start PostgreSQL or confirm the configured host/port are reachable.");
  console.error("2. Run npm run test:integration:create-db");
  console.error("3. Run npm run test:integration");
  process.exitCode = 1;
});
