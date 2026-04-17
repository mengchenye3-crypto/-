import { Prisma, ReportPeriod } from "@prisma/client";

import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error-handler";
import {
  CompanyDetail,
  CompanyListItem,
  OperatingSegmentItem,
  OperatingSegmentsResponse,
  PaginatedCompanies,
  ReportPeriodSummary,
  StatementItem,
  StatementResponse
} from "../types/api";

const reportPeriodSelect = {
  id: true,
  companyId: true,
  reportDate: true,
  fiscalYear: true,
  fiscalQuarter: true,
  periodType: true,
  source: true
} satisfies Prisma.ReportPeriodSelect;

function decimalToNumber(value: Prisma.Decimal | null): number | null {
  if (value === null) {
    return null;
  }

  const numericValue = value.toNumber();
  return Number.isFinite(numericValue) ? numericValue : null;
}

function mapCompany(company: {
  id: number;
  symbol: string;
  companyName: string;
  market: string;
  exchange: string;
  industry: string | null;
}): CompanyListItem {
  return {
    id: company.id,
    symbol: company.symbol,
    companyName: company.companyName,
    market: company.market,
    exchange: company.exchange,
    industry: company.industry
  };
}

function mapReportPeriod(period: ReportPeriod): ReportPeriodSummary {
  return {
    id: period.id,
    companyId: period.companyId,
    reportDate: period.reportDate.toISOString().slice(0, 10),
    fiscalYear: period.fiscalYear,
    fiscalQuarter: period.fiscalQuarter,
    periodType: period.periodType,
    source: period.source
  };
}

function assertReportPeriodExists(reportPeriod: ReportPeriod | null): ReportPeriod {
  if (!reportPeriod) {
    throw new AppError("REPORT_PERIOD_NOT_FOUND", "Report period not found", 404);
  }

  return reportPeriod;
}

export async function listCompanies(params: {
  q?: string;
  page: number;
  pageSize: number;
}): Promise<PaginatedCompanies> {
  const where: Prisma.CompanyWhereInput | undefined = params.q
    ? {
        OR: [
          { symbol: { contains: params.q, mode: "insensitive" } },
          { companyName: { contains: params.q, mode: "insensitive" } }
        ]
      }
    : undefined;

  const [items, total] = await Promise.all([
    prisma.company.findMany({
      where,
      orderBy: [{ symbol: "asc" }, { id: "asc" }],
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize
    }),
    prisma.company.count({ where })
  ]);

  return {
    items: items.map(mapCompany),
    total,
    page: params.page,
    pageSize: params.pageSize
  };
}

export async function getCompanyDetail(companyId: number): Promise<CompanyDetail> {
  const company = await prisma.company.findUnique({
    where: { id: companyId }
  });

  if (!company) {
    throw new AppError("COMPANY_NOT_FOUND", "Company not found", 404);
  }

  return {
    ...mapCompany(company),
    createdAt: company.createdAt.toISOString(),
    updatedAt: company.updatedAt.toISOString()
  };
}

export async function listCompanyReportPeriods(companyId: number): Promise<ReportPeriodSummary[]> {
  const companyExists = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true }
  });

  if (!companyExists) {
    throw new AppError("COMPANY_NOT_FOUND", "Company not found", 404);
  }

  const reportPeriods = await prisma.reportPeriod.findMany({
    where: { companyId },
    orderBy: [{ reportDate: "desc" }, { fiscalQuarter: "desc" }, { id: "desc" }]
  });

  return reportPeriods.map(mapReportPeriod);
}

function mapStatementItems<
  T extends {
    id: number;
    itemCode: string;
    itemName: string;
    itemValue: Prisma.Decimal | null;
    itemUnit: string | null;
    parentCode: string | null;
    itemLevel: number;
    displayOrder: number;
    categoryType?: string | null;
  }
>(items: T[]): StatementItem[] {
  return items.map((item) => ({
    id: item.id,
    itemCode: item.itemCode,
    itemName: item.itemName,
    itemValue: decimalToNumber(item.itemValue),
    itemUnit: item.itemUnit,
    parentCode: item.parentCode,
    itemLevel: item.itemLevel,
    displayOrder: item.displayOrder,
    ...(Object.prototype.hasOwnProperty.call(item, "categoryType")
      ? { categoryType: item.categoryType ?? null }
      : {})
  }));
}

async function getReportPeriodOrThrow(reportPeriodId: number): Promise<ReportPeriodSummary> {
  const reportPeriod = assertReportPeriodExists(
    await prisma.reportPeriod.findUnique({
      where: { id: reportPeriodId }
    })
  );

  return mapReportPeriod(reportPeriod);
}

export async function getBalanceSheet(reportPeriodId: number): Promise<StatementResponse> {
  const reportPeriod = await getReportPeriodOrThrow(reportPeriodId);
  const items = await prisma.balanceSheetItem.findMany({
    where: { reportPeriodId },
    orderBy: [{ displayOrder: "asc" }, { id: "asc" }]
  });

  return {
    reportPeriod,
    items: mapStatementItems(items)
  };
}

export async function getIncomeStatement(reportPeriodId: number): Promise<StatementResponse> {
  const reportPeriod = await getReportPeriodOrThrow(reportPeriodId);
  const items = await prisma.incomeStatementItem.findMany({
    where: { reportPeriodId },
    orderBy: [{ displayOrder: "asc" }, { id: "asc" }]
  });

  return {
    reportPeriod,
    items: mapStatementItems(items)
  };
}

export async function getCashflowStatement(reportPeriodId: number): Promise<StatementResponse> {
  const reportPeriod = await getReportPeriodOrThrow(reportPeriodId);
  const items = await prisma.cashflowStatementItem.findMany({
    where: { reportPeriodId },
    orderBy: [{ displayOrder: "asc" }, { id: "asc" }]
  });

  return {
    reportPeriod,
    items: mapStatementItems(items)
  };
}

export async function getOperatingSegments(reportPeriodId: number): Promise<OperatingSegmentsResponse> {
  const reportPeriod = await getReportPeriodOrThrow(reportPeriodId);
  const items = await prisma.operatingSegment.findMany({
    where: { reportPeriodId },
    orderBy: [{ segmentType: "asc" }, { revenue: "desc" }, { id: "asc" }]
  });

  const mappedItems: OperatingSegmentItem[] = items.map((item) => ({
    id: item.id,
    segmentType: item.segmentType,
    segmentName: item.segmentName,
    revenue: decimalToNumber(item.revenue),
    cost: decimalToNumber(item.cost),
    grossProfit: decimalToNumber(item.grossProfit),
    grossMargin: decimalToNumber(item.grossMargin),
    proportionRevenue: decimalToNumber(item.proportionRevenue),
    proportionProfit: decimalToNumber(item.proportionProfit),
    extraJson: item.extraJson
  }));

  return {
    reportPeriod,
    items: mappedItems
  };
}
