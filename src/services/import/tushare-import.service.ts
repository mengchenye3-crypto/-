import { Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/error-handler";
import { TushareClient } from "../../integrations/tushare/client";
import {
  BALANCE_SHEET_DEFINITIONS,
  buildNormalizedPeriods,
  CASHFLOW_STATEMENT_DEFINITIONS,
  INCOME_STATEMENT_DEFINITIONS,
  mapOperatingSegment,
  mapStatementItems
} from "../../integrations/tushare/mappings";
import {
  NormalizedReportPeriod,
  TushareFinancialRecord,
  TushareMainBusinessRecord,
  TushareStockBasicRecord
} from "../../integrations/tushare/types";

export interface ImportTushareOptions {
  tsCode?: string;
  symbol?: string;
  startDate?: string;
  endDate?: string;
  input?: string;
}

export interface ImportTushareResult {
  companyId: number;
  tsCode: string;
  symbol: string;
  importedReportPeriods: number;
  balanceSheetItems: number;
  incomeStatementItems: number;
  cashflowStatementItems: number;
  operatingSegments: number;
}

export interface ImportBatchItemResult {
  input: string;
  status: "success" | "failed";
  message: string;
  result?: ImportTushareResult;
}

export interface ImportBatchSummary {
  total: number;
  succeeded: number;
  failed: number;
  failedInputs: string[];
  results: ImportBatchItemResult[];
}

type ImportCompanyExecutor = (options: ImportTushareOptions) => Promise<ImportTushareResult>;

function inferExchangeFromSymbol(symbol: string): string {
  if (/^(6|9)\d{5}$/.test(symbol)) {
    return "SSE";
  }

  if (/^(0|3)\d{5}$/.test(symbol)) {
    return "SZSE";
  }

  if (/^(4|8)\d{5}$/.test(symbol)) {
    return "BSE";
  }

  throw new AppError("INVALID_SYMBOL", `Cannot infer exchange from symbol ${symbol}`, 400);
}

function buildTsCodeFromSymbol(symbol: string): string {
  const exchange = inferExchangeFromSymbol(symbol);
  const suffix = exchange === "SSE" ? "SH" : exchange === "SZSE" ? "SZ" : "BJ";

  return `${symbol}.${suffix}`;
}

function normalizeStartDate(startDate?: string): string | undefined {
  return startDate?.replaceAll("-", "");
}

function normalizeEndDate(endDate?: string): string | undefined {
  return endDate?.replaceAll("-", "");
}

export function normalizeImportCode(code: string): Pick<ImportTushareOptions, "tsCode" | "symbol"> {
  const normalized = code.trim().toUpperCase();

  if (/^\d{6}\.(SH|SZ|BJ)$/.test(normalized)) {
    return { tsCode: normalized };
  }

  if (/^\d{6}$/.test(normalized)) {
    return { symbol: normalized };
  }

  throw new AppError("INVALID_IMPORT_ARGUMENT", `Unsupported import code: ${code}`, 400);
}

export function parseImportList(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

function getDefaultStartDate(): string {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() - 3);
  return `${date.getUTCFullYear()}0101`;
}

function dedupeFinancialRecords(records: TushareFinancialRecord[]): Map<string, TushareFinancialRecord> {
  const deduped = new Map<string, TushareFinancialRecord>();

  for (const record of records) {
    if (!record.end_date || deduped.has(record.end_date)) {
      continue;
    }

    deduped.set(record.end_date, record);
  }

  return deduped;
}

function groupSegmentsByPeriod(records: TushareMainBusinessRecord[]): Map<string, TushareMainBusinessRecord[]> {
  const grouped = new Map<string, TushareMainBusinessRecord[]>();

  for (const record of records) {
    if (!record.end_date) {
      continue;
    }

    const items = grouped.get(record.end_date) ?? [];
    items.push(record);
    grouped.set(record.end_date, items);
  }

  return grouped;
}

function mapCompanyData(company: TushareStockBasicRecord) {
  return {
    symbol: company.symbol,
    companyName: company.name,
    market: "CN-A",
    exchange: company.exchange ?? inferExchangeFromSymbol(company.symbol),
    industry: company.industry ?? null
  };
}

async function resolveStockBasic(
  client: TushareClient,
  options: ImportTushareOptions
): Promise<TushareStockBasicRecord> {
  const resolvedTsCode = options.tsCode ?? (options.symbol ? buildTsCodeFromSymbol(options.symbol) : null);

  if (!resolvedTsCode) {
    throw new AppError("INVALID_IMPORT_ARGUMENT", "Either --ts-code or --symbol is required", 400);
  }

  const company = await client.stockBasicByTsCode(resolvedTsCode);
  if (!company) {
    throw new AppError("COMPANY_NOT_FOUND", `No company found for ${resolvedTsCode}`, 404);
  }

  if (options.symbol && company.symbol !== options.symbol) {
    throw new AppError(
      "SYMBOL_MISMATCH",
      `Resolved company symbol ${company.symbol} does not match requested symbol ${options.symbol}`,
      400
    );
  }

  return company;
}

export async function importCompanyFromTushare(options: ImportTushareOptions): Promise<ImportTushareResult> {
  const token = process.env.TUSHARE_TOKEN;
  if (!token) {
    throw new AppError("TUSHARE_TOKEN_MISSING", "TUSHARE_TOKEN is required before importing", 500);
  }

  const client = new TushareClient({ token });
  const stockBasic = await resolveStockBasic(client, options);
  const startDate = normalizeStartDate(options.startDate) ?? getDefaultStartDate();
  const endDate = normalizeEndDate(options.endDate);

  const [balanceSheetRows, incomeRows, cashflowRows, mainBusinessRows] = await Promise.all([
    client.balancesheet(stockBasic.ts_code, startDate, endDate),
    client.income(stockBasic.ts_code, startDate, endDate),
    client.cashflow(stockBasic.ts_code, startDate, endDate),
    client.finaMainbz(stockBasic.ts_code, startDate, endDate)
  ]);

  const normalizedPeriods = buildNormalizedPeriods([
    ...balanceSheetRows,
    ...incomeRows,
    ...cashflowRows,
    ...mainBusinessRows
  ]);

  if (normalizedPeriods.length === 0) {
    throw new AppError("TUSHARE_NO_REPORT_PERIODS", `No report periods found for ${stockBasic.ts_code}`, 404);
  }

  return prisma.$transaction(async (tx) => {
    const company = await tx.company.upsert({
      where: {
        symbol_market: {
          symbol: stockBasic.symbol,
          market: "CN-A"
        }
      },
      create: mapCompanyData(stockBasic),
      update: mapCompanyData(stockBasic)
    });

    const reportPeriodIds = new Map<string, number>();
    for (const period of normalizedPeriods) {
      const reportPeriod = await upsertReportPeriod(tx, company.id, period);
      reportPeriodIds.set(period.endDate, reportPeriod.id);
    }

    const balanceSheetCount = await replaceStatementRows(
      tx,
      reportPeriodIds,
      dedupeFinancialRecords(balanceSheetRows),
      BALANCE_SHEET_DEFINITIONS,
      "balanceSheetItem"
    );
    const incomeStatementCount = await replaceStatementRows(
      tx,
      reportPeriodIds,
      dedupeFinancialRecords(incomeRows),
      INCOME_STATEMENT_DEFINITIONS,
      "incomeStatementItem"
    );
    const cashflowStatementCount = await replaceStatementRows(
      tx,
      reportPeriodIds,
      dedupeFinancialRecords(cashflowRows),
      CASHFLOW_STATEMENT_DEFINITIONS,
      "cashflowStatementItem"
    );
    const operatingSegmentCount = await replaceOperatingSegments(tx, reportPeriodIds, mainBusinessRows);

    return {
      companyId: company.id,
      tsCode: stockBasic.ts_code,
      symbol: stockBasic.symbol,
      importedReportPeriods: normalizedPeriods.length,
      balanceSheetItems: balanceSheetCount,
      incomeStatementItems: incomeStatementCount,
      cashflowStatementItems: cashflowStatementCount,
      operatingSegments: operatingSegmentCount
    };
  });
}

export async function importCompaniesFromTushareWithExecutor(
  inputs: string[],
  sharedOptions: Pick<ImportTushareOptions, "startDate" | "endDate">,
  executeImport: ImportCompanyExecutor
): Promise<ImportBatchSummary> {
  const results: ImportBatchItemResult[] = [];

  for (const input of inputs) {
    try {
      const normalized = normalizeImportCode(input);
      const result = await executeImport({
        ...sharedOptions,
        ...normalized,
        input
      });

      results.push({
        input,
        status: "success",
        message: "Imported successfully",
        result
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        input,
        status: "failed",
        message
      });
    }
  }

  const succeeded = results.filter((item) => item.status === "success").length;
  const failedItems = results.filter((item) => item.status === "failed");

  return {
    total: results.length,
    succeeded,
    failed: failedItems.length,
    failedInputs: failedItems.map((item) => item.input),
    results
  };
}

export async function importCompaniesFromTushare(
  inputs: string[],
  sharedOptions: Pick<ImportTushareOptions, "startDate" | "endDate">
): Promise<ImportBatchSummary> {
  return importCompaniesFromTushareWithExecutor(inputs, sharedOptions, importCompanyFromTushare);
}

async function upsertReportPeriod(
  tx: Prisma.TransactionClient,
  companyId: number,
  period: NormalizedReportPeriod
) {
  return tx.reportPeriod.upsert({
    where: {
      companyId_reportDate_periodType: {
        companyId,
        reportDate: new Date(
          `${period.endDate.slice(0, 4)}-${period.endDate.slice(4, 6)}-${period.endDate.slice(6, 8)}T00:00:00.000Z`
        ),
        periodType: period.periodType
      }
    },
    create: {
      companyId,
      reportDate: new Date(
        `${period.endDate.slice(0, 4)}-${period.endDate.slice(4, 6)}-${period.endDate.slice(6, 8)}T00:00:00.000Z`
      ),
      fiscalYear: period.fiscalYear,
      fiscalQuarter: period.fiscalQuarter,
      periodType: period.periodType,
      source: "tushare"
    },
    update: {
      fiscalYear: period.fiscalYear,
      fiscalQuarter: period.fiscalQuarter,
      source: "tushare"
    }
  });
}

async function replaceStatementRows(
  tx: Prisma.TransactionClient,
  reportPeriodIds: Map<string, number>,
  rows: Map<string, TushareFinancialRecord>,
  definitions: Array<{
    itemCode: string;
    itemName: string;
    sourceField: string;
    displayOrder: number;
    categoryType?: string;
  }>,
  modelName: "balanceSheetItem" | "incomeStatementItem" | "cashflowStatementItem"
): Promise<number> {
  let totalCreated = 0;

  for (const [endDate, reportPeriodId] of reportPeriodIds.entries()) {
    if (modelName === "balanceSheetItem") {
      await tx.balanceSheetItem.deleteMany({ where: { reportPeriodId } });
    } else if (modelName === "incomeStatementItem") {
      await tx.incomeStatementItem.deleteMany({ where: { reportPeriodId } });
    } else {
      await tx.cashflowStatementItem.deleteMany({ where: { reportPeriodId } });
    }

    const row = rows.get(endDate);
    if (!row) {
      continue;
    }

    const items = mapStatementItems(row, definitions).map((item) => ({
      reportPeriodId,
      itemCode: item.itemCode,
      itemName: item.itemName,
      itemValue: item.itemValue,
      itemUnit: item.itemUnit,
      parentCode: item.parentCode,
      itemLevel: item.itemLevel,
      displayOrder: item.displayOrder,
      ...(Object.prototype.hasOwnProperty.call(item, "categoryType")
        ? { categoryType: item.categoryType ?? null }
        : {})
    }));

    if (items.length === 0) {
      continue;
    }

    let result;

    if (modelName === "balanceSheetItem") {
      result = await tx.balanceSheetItem.createMany({
        data: items.map((item) => ({
          reportPeriodId: item.reportPeriodId,
          itemCode: item.itemCode,
          itemName: item.itemName,
          itemValue: item.itemValue,
          itemUnit: item.itemUnit,
          parentCode: item.parentCode,
          itemLevel: item.itemLevel,
          displayOrder: item.displayOrder,
          categoryType: item.categoryType ?? null
        }))
      });
    } else if (modelName === "incomeStatementItem") {
      result = await tx.incomeStatementItem.createMany({
        data: items.map((item) => ({
          reportPeriodId: item.reportPeriodId,
          itemCode: item.itemCode,
          itemName: item.itemName,
          itemValue: item.itemValue,
          itemUnit: item.itemUnit,
          parentCode: item.parentCode,
          itemLevel: item.itemLevel,
          displayOrder: item.displayOrder
        }))
      });
    } else {
      result = await tx.cashflowStatementItem.createMany({
        data: items.map((item) => ({
          reportPeriodId: item.reportPeriodId,
          itemCode: item.itemCode,
          itemName: item.itemName,
          itemValue: item.itemValue,
          itemUnit: item.itemUnit,
          parentCode: item.parentCode,
          itemLevel: item.itemLevel,
          displayOrder: item.displayOrder
        }))
      });
    }

    totalCreated += result.count;
  }

  return totalCreated;
}

async function replaceOperatingSegments(
  tx: Prisma.TransactionClient,
  reportPeriodIds: Map<string, number>,
  rows: TushareMainBusinessRecord[]
): Promise<number> {
  const groupedRows = groupSegmentsByPeriod(rows);
  let totalCreated = 0;

  for (const [endDate, reportPeriodId] of reportPeriodIds.entries()) {
    await tx.operatingSegment.deleteMany({ where: { reportPeriodId } });

    const records = groupedRows.get(endDate) ?? [];
    if (records.length === 0) {
      continue;
    }

    const data = records
      .map(mapOperatingSegment)
      .map((record) => ({
        reportPeriodId,
        segmentType: record.segmentType,
        segmentName: record.segmentName,
        revenue: record.revenue,
        cost: record.cost,
        grossProfit: record.grossProfit,
        grossMargin: record.grossMargin,
        proportionRevenue: record.proportionRevenue,
        proportionProfit: record.proportionProfit,
        extraJson: record.extraJson
          ? (record.extraJson as Prisma.InputJsonValue)
          : Prisma.JsonNull
      }));

    if (data.length === 0) {
      continue;
    }

    const result = await tx.operatingSegment.createMany({ data });
    totalCreated += result.count;
  }

  return totalCreated;
}
