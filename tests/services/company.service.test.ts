import { PeriodType, Prisma, SegmentType } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockPrisma, resetMockPrisma } from "../helpers/mock-prisma";

vi.mock("../../src/lib/prisma", () => ({
  prisma: mockPrisma
}));

import {
  getBalanceSheet,
  getCompanyDetail,
  getOperatingSegments,
  listCompanies,
  listCompanyReportPeriods
} from "../../src/services/company.service";

function createReportPeriod(id: number) {
  return {
    id,
    companyId: 1,
    reportDate: new Date("2023-12-31T00:00:00.000Z"),
    fiscalYear: 2023,
    fiscalQuarter: 4,
    periodType: PeriodType.ANNUAL,
    source: "demo-seed",
    createdAt: new Date("2024-01-01T00:00:00.000Z")
  };
}

describe("company.service", () => {
  beforeEach(() => {
    resetMockPrisma();
  });

  it("lists companies with mapped pagination payload", async () => {
    mockPrisma.company.findMany.mockResolvedValue([
      {
        id: 1,
        symbol: "600519",
        companyName: "贵州茅台股份有限公司",
        market: "CN-A",
        exchange: "SSE",
        industry: "白酒"
      }
    ]);
    mockPrisma.company.count.mockResolvedValue(1);

    const result = await listCompanies({ q: "茅台", page: 2, pageSize: 10 });

    expect(mockPrisma.company.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10
      })
    );
    expect(result).toEqual({
      items: [
        {
          id: 1,
          symbol: "600519",
          companyName: "贵州茅台股份有限公司",
          market: "CN-A",
          exchange: "SSE",
          industry: "白酒"
        }
      ],
      total: 1,
      page: 2,
      pageSize: 10
    });
  });

  it("returns company detail with ISO timestamps", async () => {
    mockPrisma.company.findUnique.mockResolvedValue({
      id: 1,
      symbol: "600519",
      companyName: "贵州茅台股份有限公司",
      market: "CN-A",
      exchange: "SSE",
      industry: "白酒",
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      updatedAt: new Date("2024-01-02T00:00:00.000Z")
    });

    const result = await getCompanyDetail(1);

    expect(result).toEqual({
      id: 1,
      symbol: "600519",
      companyName: "贵州茅台股份有限公司",
      market: "CN-A",
      exchange: "SSE",
      industry: "白酒",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z"
    });
  });

  it("throws 404 when company detail does not exist", async () => {
    mockPrisma.company.findUnique.mockResolvedValue(null);

    await expect(getCompanyDetail(999)).rejects.toMatchObject({
      code: "COMPANY_NOT_FOUND",
      statusCode: 404
    });
  });

  it("lists report periods after checking company existence", async () => {
    mockPrisma.company.findUnique.mockResolvedValue({ id: 1 });
    mockPrisma.reportPeriod.findMany.mockResolvedValue([createReportPeriod(1), createReportPeriod(2)]);

    const result = await listCompanyReportPeriods(1);

    expect(result).toEqual([
      {
        id: 1,
        companyId: 1,
        reportDate: "2023-12-31",
        fiscalYear: 2023,
        fiscalQuarter: 4,
        periodType: "ANNUAL",
        source: "demo-seed"
      },
      {
        id: 2,
        companyId: 1,
        reportDate: "2023-12-31",
        fiscalYear: 2023,
        fiscalQuarter: 4,
        periodType: "ANNUAL",
        source: "demo-seed"
      }
    ]);
  });

  it("maps balance sheet decimals to numbers and keeps categoryType", async () => {
    mockPrisma.reportPeriod.findUnique.mockResolvedValue(createReportPeriod(1));
    mockPrisma.balanceSheetItem.findMany.mockResolvedValue([
      {
        id: 11,
        reportPeriodId: 1,
        itemCode: "assets_total",
        itemName: "资产总计",
        itemValue: new Prisma.Decimal("273122000000"),
        itemUnit: "CNY",
        parentCode: null,
        itemLevel: 1,
        categoryType: "asset",
        displayOrder: 10
      },
      {
        id: 12,
        reportPeriodId: 1,
        itemCode: "liabilities_total",
        itemName: "负债合计",
        itemValue: null,
        itemUnit: "CNY",
        parentCode: null,
        itemLevel: 1,
        categoryType: "liability",
        displayOrder: 20
      }
    ]);

    const result = await getBalanceSheet(1);

    expect(result.reportPeriod.reportDate).toBe("2023-12-31");
    expect(result.items).toEqual([
      {
        id: 11,
        itemCode: "assets_total",
        itemName: "资产总计",
        itemValue: 273122000000,
        itemUnit: "CNY",
        parentCode: null,
        itemLevel: 1,
        categoryType: "asset",
        displayOrder: 10
      },
      {
        id: 12,
        itemCode: "liabilities_total",
        itemName: "负债合计",
        itemValue: null,
        itemUnit: "CNY",
        parentCode: null,
        itemLevel: 1,
        categoryType: "liability",
        displayOrder: 20
      }
    ]);
  });

  it("returns empty statement items when no rows exist", async () => {
    mockPrisma.reportPeriod.findUnique.mockResolvedValue(createReportPeriod(1));
    mockPrisma.balanceSheetItem.findMany.mockResolvedValue([]);

    const result = await getBalanceSheet(1);

    expect(result.items).toEqual([]);
  });

  it("throws 404 when report period is missing for statements", async () => {
    mockPrisma.reportPeriod.findUnique.mockResolvedValue(null);

    await expect(getBalanceSheet(999)).rejects.toMatchObject({
      code: "REPORT_PERIOD_NOT_FOUND",
      statusCode: 404
    });
  });

  it("maps operating segment decimals to numbers", async () => {
    mockPrisma.reportPeriod.findUnique.mockResolvedValue(createReportPeriod(1));
    mockPrisma.operatingSegment.findMany.mockResolvedValue([
      {
        id: 21,
        reportPeriodId: 1,
        segmentType: SegmentType.product,
        segmentName: "茅台酒",
        revenue: new Prisma.Decimal("126590000000"),
        cost: new Prisma.Decimal("10230000000"),
        grossProfit: new Prisma.Decimal("116360000000"),
        grossMargin: new Prisma.Decimal("0.9192"),
        proportionRevenue: new Prisma.Decimal("0.8408"),
        proportionProfit: new Prisma.Decimal("0.8920"),
        extraJson: { notes: "核心产品" }
      }
    ]);

    const result = await getOperatingSegments(1);

    expect(result.items).toEqual([
      {
        id: 21,
        segmentType: "product",
        segmentName: "茅台酒",
        revenue: 126590000000,
        cost: 10230000000,
        grossProfit: 116360000000,
        grossMargin: 0.9192,
        proportionRevenue: 0.8408,
        proportionProfit: 0.892,
        extraJson: { notes: "核心产品" }
      }
    ]);
  });
});
