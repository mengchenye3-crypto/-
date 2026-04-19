import "dotenv/config";

import { readFile } from "node:fs/promises";

import { AppError } from "../src/middleware/error-handler";
import {
  importCompaniesFromTushare,
  importCompanyFromTushare,
  parseImportList
} from "../src/services/import/tushare-import.service";

interface CliArgs {
  tsCode?: string;
  symbol?: string;
  startDate?: string;
  endDate?: string;
  file?: string;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];

    switch (current) {
      case "--ts-code":
        args.tsCode = next;
        index += 1;
        break;
      case "--symbol":
        args.symbol = next;
        index += 1;
        break;
      case "--start-date":
        args.startDate = next;
        index += 1;
        break;
      case "--end-date":
        args.endDate = next;
        index += 1;
        break;
      case "--file":
        args.file = next;
        index += 1;
        break;
      default:
        break;
    }
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.file && (args.tsCode || args.symbol)) {
    throw new AppError(
      "INVALID_IMPORT_ARGUMENT",
      "Use either --file or a single --ts-code/--symbol input, not both",
      400
    );
  }

  if (!args.file && !args.tsCode && !args.symbol) {
    throw new AppError(
      "INVALID_IMPORT_ARGUMENT",
      "Usage: npm run import:tushare -- --ts-code 600519.SH | --symbol 600519 | --file examples/import-list.txt",
      400
    );
  }

  if (args.file) {
    const fileContent = await readFile(args.file, "utf8");
    const inputs = parseImportList(fileContent);

    if (inputs.length === 0) {
      throw new AppError("INVALID_IMPORT_ARGUMENT", "Import file does not contain any usable codes", 400);
    }

    const summary = await importCompaniesFromTushare(inputs, {
      startDate: args.startDate,
      endDate: args.endDate
    });

    console.log("Tushare batch import completed:");
    console.log(JSON.stringify(summary, null, 2));

    if (summary.failed > 0) {
      process.exitCode = 1;
    }

    return;
  }

  const result = await importCompanyFromTushare(args);

  console.log("Tushare import completed:");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error: unknown) => {
  if (error instanceof AppError) {
    console.error(`[${error.code}] ${error.message}`);
  } else {
    console.error(error);
  }

  process.exitCode = 1;
});
