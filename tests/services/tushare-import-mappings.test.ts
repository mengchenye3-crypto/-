import { describe, expect, it } from "vitest";

import {
  BALANCE_SHEET_DEFINITIONS,
  buildNormalizedPeriods,
  inferPeriodTypeFromEndDate,
  mapOperatingSegment,
  mapStatementItems,
  mapTushareSegmentType
} from "../../src/integrations/tushare/mappings";

describe("tushare import mappings", () => {
  it("infers report period from quarter-end date", () => {
    expect(inferPeriodTypeFromEndDate("20240331")).toEqual({
      endDate: "20240331",
      fiscalYear: 2024,
      fiscalQuarter: 1,
      periodType: "Q1"
    });

    expect(inferPeriodTypeFromEndDate("20240630")).toEqual({
      endDate: "20240630",
      fiscalYear: 2024,
      fiscalQuarter: 2,
      periodType: "HALF_YEAR"
    });

    expect(inferPeriodTypeFromEndDate("20240531")).toBeNull();
  });

  it("builds deduplicated sorted normalized periods", () => {
    const result = buildNormalizedPeriods([
      { end_date: "20231231" },
      { end_date: "20240331" },
      { end_date: "20231231" },
      { end_date: "20240115" }
    ]);

    expect(result).toEqual([
      {
        endDate: "20240331",
        fiscalYear: 2024,
        fiscalQuarter: 1,
        periodType: "Q1"
      },
      {
        endDate: "20231231",
        fiscalYear: 2023,
        fiscalQuarter: 4,
        periodType: "ANNUAL"
      }
    ]);
  });

  it("maps statement rows into line items and skips null values", () => {
    const result = mapStatementItems(
      {
        ts_code: "600519.SH",
        end_date: "20231231",
        total_assets: 273122000000,
        total_liab: "",
        total_hldr_eqy_inc_min_int: "182510000000"
      },
      BALANCE_SHEET_DEFINITIONS
    );

    expect(result).toEqual([
      {
        itemCode: "assets_total",
        itemName: "资产总计",
        itemValue: "273122000000",
        itemUnit: "CNY",
        parentCode: null,
        itemLevel: 1,
        categoryType: "asset",
        displayOrder: 10
      },
      {
        itemCode: "equity_total",
        itemName: "股东权益合计(含少数股东权益)",
        itemValue: "182510000000",
        itemUnit: "CNY",
        parentCode: null,
        itemLevel: 1,
        categoryType: "equity",
        displayOrder: 30
      }
    ]);
  });

  it("maps main business segment types and preserves extra fields", () => {
    expect(mapTushareSegmentType("P")).toBe("product");
    expect(mapTushareSegmentType("D")).toBe("region");
    expect(mapTushareSegmentType("I")).toBe("other");

    expect(
      mapOperatingSegment({
        ts_code: "600519.SH",
        end_date: "20231231",
        bz_item: "茅台酒",
        bz_sales: 126590000000,
        bz_profit: 116360000000,
        bz_cost: 10230000000,
        curr_type: "CNY",
        update_flag: "1",
        type: "P"
      })
    ).toEqual({
      segmentType: "product",
      segmentName: "茅台酒",
      revenue: "126590000000",
      cost: "10230000000",
      grossProfit: "116360000000",
      grossMargin: null,
      proportionRevenue: null,
      proportionProfit: null,
      extraJson: {
        currType: "CNY",
        updateFlag: "1",
        sourceType: "P"
      }
    });
  });
});
