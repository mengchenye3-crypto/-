import "dotenv/config";

import { AppError } from "../src/middleware/error-handler";
import { importCompanyFromTushare } from "../src/services/import/tushare-import.service";

interface CliArgs {
  tsCode?: string;
  symbol?: string;
  startDate?: string;
  endDate?: string;
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
      default:
        break;
    }
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.tsCode && !args.symbol) {
    throw new AppError(
      "INVALID_IMPORT_ARGUMENT",
      "Usage: npm run import:tushare -- --ts-code 600519.SH or --symbol 600519",
      400
    );
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
