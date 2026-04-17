import "../integration/setup-env";

import { Prisma, PrismaClient } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { app } from "../../src/app";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

describe("company integration", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("has all six business tables after migrations", async () => {
    const rows = await prisma.$queryRaw<Array<{ table_name: string }>>(Prisma.sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'companies',
          'report_periods',
          'balance_sheet_items',
          'income_statement_items',
          'cashflow_statement_items',
          'operating_segments'
        )
    `);

    const tableNames = rows.map((row) => row.table_name).sort();

    expect(tableNames).toEqual([
      "balance_sheet_items",
      "cashflow_statement_items",
      "companies",
      "income_statement_items",
      "operating_segments",
      "report_periods"
    ]);
  });

  it("seeds demo data into the test database", async () => {
    const companyCount = await prisma.company.count();
    const reportPeriodCount = await prisma.reportPeriod.count();
    const segmentCount = await prisma.operatingSegment.count();

    expect(companyCount).toBeGreaterThanOrEqual(1);
    expect(reportPeriodCount).toBeGreaterThanOrEqual(2);
    expect(segmentCount).toBeGreaterThanOrEqual(1);
  });

  it("returns company list from the real database", async () => {
    const response = await request(app).get("/api/companies");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.total).toBeGreaterThanOrEqual(1);
    expect(response.body.data.items[0]).toMatchObject({
      symbol: "600519",
      market: "CN-A"
    });
  });

  it("returns company detail from the real database", async () => {
    const company = await prisma.company.findFirstOrThrow({
      orderBy: { id: "asc" }
    });

    const response = await request(app).get(`/api/companies/${company.id}`);

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(company.id);
    expect(response.body.data.symbol).toBe(company.symbol);
  });

  it("returns report periods from the real database", async () => {
    const company = await prisma.company.findFirstOrThrow({
      orderBy: { id: "asc" }
    });

    const response = await request(app).get(`/api/companies/${company.id}/report-periods`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    expect(response.body.data[0]).toHaveProperty("reportDate");
  });

  it("returns real balance sheet data", async () => {
    const reportPeriod = await prisma.reportPeriod.findFirstOrThrow({
      orderBy: { id: "asc" }
    });

    const response = await request(app).get(`/api/report-periods/${reportPeriod.id}/balance-sheet`);

    expect(response.status).toBe(200);
    expect(response.body.data.reportPeriod.id).toBe(reportPeriod.id);
    expect(Array.isArray(response.body.data.items)).toBe(true);
    expect(typeof response.body.data.items[0].itemValue).toBe("number");
  });

  it("returns real income statement data", async () => {
    const reportPeriod = await prisma.reportPeriod.findFirstOrThrow({
      orderBy: { id: "asc" }
    });

    const response = await request(app).get(`/api/report-periods/${reportPeriod.id}/income-statement`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data.items)).toBe(true);
    expect(response.body.data.items[0]).toHaveProperty("itemCode");
  });

  it("returns real cashflow statement data", async () => {
    const reportPeriod = await prisma.reportPeriod.findFirstOrThrow({
      orderBy: { id: "asc" }
    });

    const response = await request(app).get(`/api/report-periods/${reportPeriod.id}/cashflow-statement`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data.items)).toBe(true);
    expect(response.body.data.items[0]).toHaveProperty("displayOrder");
  });

  it("returns real operating segment data", async () => {
    const reportPeriod = await prisma.reportPeriod.findFirstOrThrow({
      where: {
        operatingSegments: {
          some: {}
        }
      },
      orderBy: { id: "asc" }
    });

    const response = await request(app).get(`/api/report-periods/${reportPeriod.id}/operating-segments`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data.items)).toBe(true);
    expect(typeof response.body.data.items[0].revenue).toBe("number");
  });

  it("returns 404 for a missing company", async () => {
    const response = await request(app).get("/api/companies/999999");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("COMPANY_NOT_FOUND");
  });

  it("returns 404 for a missing report period", async () => {
    const response = await request(app).get("/api/report-periods/999999/balance-sheet");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("REPORT_PERIOD_NOT_FOUND");
  });

  it("returns empty arrays for a valid report period without statement rows", async () => {
    const company = await prisma.company.findFirstOrThrow({
      orderBy: { id: "asc" }
    });

    const emptyReportPeriod = await prisma.reportPeriod.create({
      data: {
        companyId: company.id,
        reportDate: new Date("2025-03-31"),
        fiscalYear: 2025,
        fiscalQuarter: 1,
        periodType: "Q1",
        source: "integration-test-empty"
      }
    });

    const response = await request(app).get(`/api/report-periods/${emptyReportPeriod.id}/income-statement`);

    expect(response.status).toBe(200);
    expect(response.body.data.items).toEqual([]);
  });

  it("enforces unique company symbol and market", async () => {
    await expect(
      prisma.company.create({
        data: {
          symbol: "600519",
          companyName: "duplicate",
          market: "CN-A",
          exchange: "SSE",
          industry: "test"
        }
      })
    ).rejects.toHaveProperty("code", "P2002");
  });

  it("enforces unique company report period", async () => {
    const company = await prisma.company.findFirstOrThrow({
      orderBy: { id: "asc" }
    });

    await expect(
      prisma.reportPeriod.create({
        data: {
          companyId: company.id,
          reportDate: new Date("2023-12-31"),
          fiscalYear: 2023,
          fiscalQuarter: 4,
          periodType: "ANNUAL",
          source: "duplicate"
        }
      })
    ).rejects.toHaveProperty("code", "P2002");
  });

  it("enforces unique statement item per report period", async () => {
    const reportPeriod = await prisma.reportPeriod.findFirstOrThrow({
      orderBy: { id: "asc" }
    });

    await expect(
      prisma.balanceSheetItem.create({
        data: {
          reportPeriodId: reportPeriod.id,
          itemCode: "assets_total",
          itemName: "duplicate_assets_total",
          itemValue: new Prisma.Decimal("1"),
          itemUnit: "CNY",
          itemLevel: 1,
          categoryType: "asset",
          displayOrder: 99
        }
      })
    ).rejects.toHaveProperty("code", "P2002");
  });

  it("cascades delete from company to report periods and child rows", async () => {
    const company = await prisma.company.create({
      data: {
        symbol: "INT-CASCADE-COMPANY",
        companyName: "integration cascade company",
        market: "CN-A",
        exchange: "SSE",
        industry: "test"
      }
    });

    const reportPeriod = await prisma.reportPeriod.create({
      data: {
        companyId: company.id,
        reportDate: new Date("2025-12-31"),
        fiscalYear: 2025,
        fiscalQuarter: 4,
        periodType: "ANNUAL",
        source: "integration-cascade"
      }
    });

    await prisma.balanceSheetItem.create({
      data: {
        reportPeriodId: reportPeriod.id,
        itemCode: "cascade_assets",
        itemName: "cascade assets",
        itemValue: new Prisma.Decimal("100"),
        itemUnit: "CNY",
        itemLevel: 1,
        categoryType: "asset",
        displayOrder: 1
      }
    });

    await prisma.company.delete({
      where: { id: company.id }
    });

    expect(await prisma.reportPeriod.count({ where: { id: reportPeriod.id } })).toBe(0);
    expect(await prisma.balanceSheetItem.count({ where: { reportPeriodId: reportPeriod.id } })).toBe(0);
  });

  it("cascades delete from report period to statements and segments", async () => {
    const company = await prisma.company.create({
      data: {
        symbol: "INT-CASCADE-PERIOD",
        companyName: "integration cascade period",
        market: "CN-A",
        exchange: "SSE",
        industry: "test"
      }
    });

    const reportPeriod = await prisma.reportPeriod.create({
      data: {
        companyId: company.id,
        reportDate: new Date("2026-03-31"),
        fiscalYear: 2026,
        fiscalQuarter: 1,
        periodType: "Q1",
        source: "integration-cascade"
      }
    });

    await prisma.incomeStatementItem.create({
      data: {
        reportPeriodId: reportPeriod.id,
        itemCode: "cascade_revenue",
        itemName: "cascade revenue",
        itemValue: new Prisma.Decimal("100"),
        itemUnit: "CNY",
        itemLevel: 1,
        displayOrder: 1
      }
    });

    await prisma.cashflowStatementItem.create({
      data: {
        reportPeriodId: reportPeriod.id,
        itemCode: "cascade_cash",
        itemName: "cascade cash",
        itemValue: new Prisma.Decimal("50"),
        itemUnit: "CNY",
        itemLevel: 1,
        displayOrder: 1
      }
    });

    await prisma.operatingSegment.create({
      data: {
        reportPeriodId: reportPeriod.id,
        segmentType: "other",
        segmentName: "cascade segment",
        revenue: new Prisma.Decimal("10"),
        cost: new Prisma.Decimal("2"),
        grossProfit: new Prisma.Decimal("8"),
        grossMargin: new Prisma.Decimal("0.8"),
        proportionRevenue: new Prisma.Decimal("1"),
        proportionProfit: new Prisma.Decimal("1"),
        extraJson: Prisma.JsonNull
      }
    });

    await prisma.reportPeriod.delete({
      where: { id: reportPeriod.id }
    });

    expect(await prisma.incomeStatementItem.count({ where: { reportPeriodId: reportPeriod.id } })).toBe(0);
    expect(await prisma.cashflowStatementItem.count({ where: { reportPeriodId: reportPeriod.id } })).toBe(0);
    expect(await prisma.operatingSegment.count({ where: { reportPeriodId: reportPeriod.id } })).toBe(0);
  });
});
