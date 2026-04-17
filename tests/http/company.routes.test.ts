import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMocks = vi.hoisted(() => ({
  listCompanies: vi.fn(),
  getCompanyDetail: vi.fn(),
  listCompanyReportPeriods: vi.fn(),
  getBalanceSheet: vi.fn(),
  getIncomeStatement: vi.fn(),
  getCashflowStatement: vi.fn(),
  getOperatingSegments: vi.fn()
}));

vi.mock("../../src/services/company.service", () => serviceMocks);

import { app } from "../../src/app";
import { AppError } from "../../src/middleware/error-handler";

describe("company routes", () => {
  beforeEach(() => {
    Object.values(serviceMocks).forEach((mockFn) => mockFn.mockReset());
  });

  it("returns health status", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        status: "ok"
      }
    });
  });

  it("returns company list payload", async () => {
    serviceMocks.listCompanies.mockResolvedValue({
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
      page: 1,
      pageSize: 20
    });

    const response = await request(app).get("/api/companies?q=茅台&page=1&pageSize=20");

    expect(response.status).toBe(200);
    expect(serviceMocks.listCompanies).toHaveBeenCalledWith({
      q: "茅台",
      page: 1,
      pageSize: 20
    });
    expect(response.body.success).toBe(true);
  });

  it("returns 400 for invalid pagination", async () => {
    const response = await request(app).get("/api/companies?page=0");

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: "INVALID_PARAMETER"
      }
    });
  });

  it("returns company detail", async () => {
    serviceMocks.getCompanyDetail.mockResolvedValue({
      id: 1,
      symbol: "600519",
      companyName: "贵州茅台股份有限公司",
      market: "CN-A",
      exchange: "SSE",
      industry: "白酒",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z"
    });

    const response = await request(app).get("/api/companies/1");

    expect(response.status).toBe(200);
    expect(serviceMocks.getCompanyDetail).toHaveBeenCalledWith(1);
  });

  it("returns 400 for invalid company id", async () => {
    const response = await request(app).get("/api/companies/abc");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_PARAMETER");
  });

  it("returns 404 when company does not exist", async () => {
    serviceMocks.getCompanyDetail.mockRejectedValue(new AppError("COMPANY_NOT_FOUND", "Company not found", 404));

    const response = await request(app).get("/api/companies/999");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("COMPANY_NOT_FOUND");
  });

  it("returns company report periods", async () => {
    serviceMocks.listCompanyReportPeriods.mockResolvedValue([
      {
        id: 2,
        companyId: 1,
        reportDate: "2024-03-31",
        fiscalYear: 2024,
        fiscalQuarter: 1,
        periodType: "Q1",
        source: "demo-seed"
      }
    ]);

    const response = await request(app).get("/api/companies/1/report-periods");

    expect(response.status).toBe(200);
    expect(serviceMocks.listCompanyReportPeriods).toHaveBeenCalledWith(1);
  });

  it("returns balance sheet payload", async () => {
    serviceMocks.getBalanceSheet.mockResolvedValue({
      reportPeriod: {
        id: 1,
        companyId: 1,
        reportDate: "2023-12-31",
        fiscalYear: 2023,
        fiscalQuarter: 4,
        periodType: "ANNUAL",
        source: "demo-seed"
      },
      items: []
    });

    const response = await request(app).get("/api/report-periods/1/balance-sheet");

    expect(response.status).toBe(200);
    expect(serviceMocks.getBalanceSheet).toHaveBeenCalledWith(1);
    expect(response.body.data.items).toEqual([]);
  });

  it("returns income statement payload", async () => {
    serviceMocks.getIncomeStatement.mockResolvedValue({
      reportPeriod: {
        id: 1,
        companyId: 1,
        reportDate: "2023-12-31",
        fiscalYear: 2023,
        fiscalQuarter: 4,
        periodType: "ANNUAL",
        source: "demo-seed"
      },
      items: [
        {
          id: 1,
          itemCode: "revenue",
          itemName: "营业收入",
          itemValue: 100,
          itemUnit: "CNY",
          parentCode: null,
          itemLevel: 1,
          displayOrder: 10
        }
      ]
    });

    const response = await request(app).get("/api/report-periods/1/income-statement");

    expect(response.status).toBe(200);
    expect(response.body.data.items[0].itemValue).toBe(100);
  });

  it("returns cashflow statement payload", async () => {
    serviceMocks.getCashflowStatement.mockResolvedValue({
      reportPeriod: {
        id: 1,
        companyId: 1,
        reportDate: "2023-12-31",
        fiscalYear: 2023,
        fiscalQuarter: 4,
        periodType: "ANNUAL",
        source: "demo-seed"
      },
      items: []
    });

    const response = await request(app).get("/api/report-periods/1/cashflow-statement");

    expect(response.status).toBe(200);
    expect(serviceMocks.getCashflowStatement).toHaveBeenCalledWith(1);
  });

  it("returns operating segments payload", async () => {
    serviceMocks.getOperatingSegments.mockResolvedValue({
      reportPeriod: {
        id: 1,
        companyId: 1,
        reportDate: "2023-12-31",
        fiscalYear: 2023,
        fiscalQuarter: 4,
        periodType: "ANNUAL",
        source: "demo-seed"
      },
      items: [
        {
          id: 1,
          segmentType: "product",
          segmentName: "茅台酒",
          revenue: 100,
          cost: 10,
          grossProfit: 90,
          grossMargin: 0.9,
          proportionRevenue: 1,
          proportionProfit: 1,
          extraJson: null
        }
      ]
    });

    const response = await request(app).get("/api/report-periods/1/operating-segments");

    expect(response.status).toBe(200);
    expect(response.body.data.items[0].segmentType).toBe("product");
  });

  it("returns 404 when report period does not exist", async () => {
    serviceMocks.getBalanceSheet.mockRejectedValue(
      new AppError("REPORT_PERIOD_NOT_FOUND", "Report period not found", 404)
    );

    const response = await request(app).get("/api/report-periods/999/balance-sheet");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("REPORT_PERIOD_NOT_FOUND");
  });

  it("returns 500 when an unexpected error escapes", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    serviceMocks.listCompanies.mockRejectedValue(new Error("boom"));

    const response = await request(app).get("/api/companies");

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe("INTERNAL_SERVER_ERROR");
    spy.mockRestore();
  });

  it("returns 404 for unknown routes", async () => {
    const response = await request(app).get("/api/not-found");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});
