import { execFile } from "node:child_process";

import { AppError } from "../../middleware/error-handler";
import {
  TushareFinancialRecord,
  TushareMainBusinessRecord,
  TushareRecord,
  TushareStockBasicRecord
} from "./types";

const DEFAULT_TUSHARE_HTTP_URL = "http://118.89.66.41:8020/";

export interface TushareClientOptions {
  token: string;
  baseUrl?: string;
  pythonBin?: string;
  bridgeScriptPath?: string;
}

export class TushareClient {
  private readonly token: string;
  private readonly baseUrl: string;
  private readonly pythonBin: string;
  private readonly bridgeScriptPath: string;

  constructor(options: TushareClientOptions) {
    if (!options.token) {
      throw new AppError("TUSHARE_TOKEN_MISSING", "TUSHARE_TOKEN is required", 500);
    }

    this.token = options.token;
    this.baseUrl = options.baseUrl ?? process.env.TUSHARE_HTTP_URL ?? DEFAULT_TUSHARE_HTTP_URL;
    this.pythonBin = options.pythonBin ?? process.env.TUSHARE_PYTHON_BIN ?? "py";
    this.bridgeScriptPath = options.bridgeScriptPath ?? "scripts/tushare_bridge.py";
  }

  async stockBasicByTsCode(tsCode: string): Promise<TushareStockBasicRecord | null> {
    const rows = await this.request<TushareStockBasicRecord>("stock_basic", { ts_code: tsCode }, [
      "ts_code",
      "symbol",
      "name",
      "industry",
      "market",
      "exchange"
    ]);

    return rows[0] ?? null;
  }

  async balancesheet(tsCode: string, startDate?: string, endDate?: string): Promise<TushareFinancialRecord[]> {
    return this.request<TushareFinancialRecord>(
      "balancesheet",
      { ts_code: tsCode, ...(startDate ? { start_date: startDate } : {}), ...(endDate ? { end_date: endDate } : {}) },
      ["ts_code", "ann_date", "f_ann_date", "end_date", "total_assets", "total_liab", "total_hldr_eqy_inc_min_int"]
    );
  }

  async income(tsCode: string, startDate?: string, endDate?: string): Promise<TushareFinancialRecord[]> {
    return this.request<TushareFinancialRecord>(
      "income",
      { ts_code: tsCode, ...(startDate ? { start_date: startDate } : {}), ...(endDate ? { end_date: endDate } : {}) },
      ["ts_code", "ann_date", "f_ann_date", "end_date", "total_revenue", "operate_profit", "n_income"]
    );
  }

  async cashflow(tsCode: string, startDate?: string, endDate?: string): Promise<TushareFinancialRecord[]> {
    return this.request<TushareFinancialRecord>(
      "cashflow",
      { ts_code: tsCode, ...(startDate ? { start_date: startDate } : {}), ...(endDate ? { end_date: endDate } : {}) },
      ["ts_code", "ann_date", "f_ann_date", "end_date", "n_cashflow_act", "n_cashflow_inv_act", "n_cash_flows_fnc_act"]
    );
  }

  async finaMainbz(tsCode: string, startDate?: string, endDate?: string): Promise<TushareMainBusinessRecord[]> {
    const [productRows, regionRows, industryRows] = await Promise.all([
      this.request<TushareMainBusinessRecord>(
        "fina_mainbz",
        {
          ts_code: tsCode,
          type: "P",
          ...(startDate ? { start_date: startDate } : {}),
          ...(endDate ? { end_date: endDate } : {})
        },
        ["ts_code", "end_date", "bz_item", "bz_sales", "bz_profit", "bz_cost", "curr_type", "update_flag", "type"]
      ),
      this.request<TushareMainBusinessRecord>(
        "fina_mainbz",
        {
          ts_code: tsCode,
          type: "D",
          ...(startDate ? { start_date: startDate } : {}),
          ...(endDate ? { end_date: endDate } : {})
        },
        ["ts_code", "end_date", "bz_item", "bz_sales", "bz_profit", "bz_cost", "curr_type", "update_flag", "type"]
      ),
      this.request<TushareMainBusinessRecord>(
        "fina_mainbz",
        {
          ts_code: tsCode,
          type: "I",
          ...(startDate ? { start_date: startDate } : {}),
          ...(endDate ? { end_date: endDate } : {})
        },
        ["ts_code", "end_date", "bz_item", "bz_sales", "bz_profit", "bz_cost", "curr_type", "update_flag", "type"]
      )
    ]);

    return [...productRows, ...regionRows, ...industryRows];
  }

  private async request<TRecord extends TushareRecord>(
    apiName: string,
    params: Record<string, string>,
    fields: string[]
  ): Promise<TRecord[]> {
    try {
      const { stdout, stderr } = await execFilePromise(
        this.pythonBin,
        ["-3", this.bridgeScriptPath, apiName, JSON.stringify(params), JSON.stringify(fields)],
        {
          env: {
            ...process.env,
            TUSHARE_TOKEN: this.token,
            TUSHARE_HTTP_URL: this.baseUrl
          },
          windowsHide: true,
          maxBuffer: 10 * 1024 * 1024
        }
      );

      if (stderr) {
        const parsedError = tryParseBridgeError(stderr);
        if (parsedError) {
          throw parsedError;
        }
      }

      const payload = JSON.parse(stdout) as { data?: TRecord[]; error?: { code: string; message: string } };
      if (payload.error) {
        throw new AppError(payload.error.code, payload.error.message, 502);
      }

      return payload.data ?? [];
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      const parsedError = tryParseBridgeError(getErrorOutput(error));
      if (parsedError) {
        throw parsedError;
      }

      throw new AppError("TUSHARE_REQUEST_FAILED", "Failed to execute official Tushare bridge", 502, {
        cause: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

function execFilePromise(
  file: string,
  args: string[],
  options: {
    env: NodeJS.ProcessEnv;
    windowsHide: boolean;
    maxBuffer: number;
  }
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(file, args, options, (error, stdout, stderr) => {
      if (error) {
        reject(
          Object.assign(error, {
            stdout,
            stderr
          })
        );
        return;
      }

      resolve({ stdout, stderr });
    });
  });
}

function getErrorOutput(error: unknown): string {
  if (typeof error === "object" && error !== null && "stderr" in error) {
    const stderr = Reflect.get(error, "stderr");
    return typeof stderr === "string" ? stderr : "";
  }

  return error instanceof Error ? error.message : String(error);
}

function tryParseBridgeError(raw: string): AppError | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as {
      error?: {
        code?: string;
        message?: string;
      };
    };

    if (!parsed.error?.code || !parsed.error.message) {
      return null;
    }

    const statusCode =
      parsed.error.code === "TUSHARE_TOKEN_MISSING" || parsed.error.code === "INVALID_ARGUMENT" ? 500 : 502;

    return new AppError(parsed.error.code, parsed.error.message, statusCode);
  } catch {
    return null;
  }
}
