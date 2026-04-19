import { describe, expect, it, vi } from "vitest";

import {
  importCompaniesFromTushareWithExecutor,
  normalizeImportCode,
  parseImportList
} from "../../src/services/import/tushare-import.service";

describe("tushare import batch", () => {
  it("parses import list and ignores comments", () => {
    expect(
      parseImportList(`
# comment
600519.SH

000001
      `)
    ).toEqual(["600519.SH", "000001"]);
  });

  it("normalizes ts_code and symbol inputs", () => {
    expect(normalizeImportCode("600519.SH")).toEqual({ tsCode: "600519.SH" });
    expect(normalizeImportCode("000001")).toEqual({ symbol: "000001" });
  });

  it("continues after failed items and returns batch summary", async () => {
    const executeImport = vi
      .fn()
      .mockResolvedValueOnce({
        companyId: 1,
        tsCode: "600519.SH",
        symbol: "600519",
        importedReportPeriods: 12,
        balanceSheetItems: 36,
        incomeStatementItems: 36,
        cashflowStatementItems: 36,
        operatingSegments: 40
      })
      .mockRejectedValueOnce(new Error("boom"));

    const result = await importCompaniesFromTushareWithExecutor(["600519.SH", "000001"], {}, executeImport);

    expect(result.total).toBe(2);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.failedInputs).toEqual(["000001"]);
    expect(result.results[0]).toMatchObject({
      input: "600519.SH",
      status: "success"
    });
    expect(result.results[1]).toMatchObject({
      input: "000001",
      status: "failed",
      message: "boom"
    });
  });
});
