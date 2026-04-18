import { PeriodType, SegmentType } from "@prisma/client";

import {
  FinancialItemDefinition,
  NormalizedOperatingSegment,
  NormalizedReportPeriod,
  NormalizedStatementItem,
  TushareFinancialRecord,
  TushareMainBusinessRecord
} from "./types";

export const BALANCE_SHEET_DEFINITIONS: FinancialItemDefinition[] = [
  {
    itemCode: "assets_total",
    itemName: "资产总计",
    sourceField: "total_assets",
    displayOrder: 10,
    categoryType: "asset"
  },
  {
    itemCode: "liabilities_total",
    itemName: "负债合计",
    sourceField: "total_liab",
    displayOrder: 20,
    categoryType: "liability"
  },
  {
    itemCode: "equity_total",
    itemName: "股东权益合计(含少数股东权益)",
    sourceField: "total_hldr_eqy_inc_min_int",
    displayOrder: 30,
    categoryType: "equity"
  }
];

export const INCOME_STATEMENT_DEFINITIONS: FinancialItemDefinition[] = [
  {
    itemCode: "revenue",
    itemName: "营业总收入",
    sourceField: "total_revenue",
    displayOrder: 10
  },
  {
    itemCode: "operating_profit",
    itemName: "营业利润",
    sourceField: "operate_profit",
    displayOrder: 20
  },
  {
    itemCode: "net_income",
    itemName: "净利润(含少数股东损益)",
    sourceField: "n_income",
    displayOrder: 30
  }
];

export const CASHFLOW_STATEMENT_DEFINITIONS: FinancialItemDefinition[] = [
  {
    itemCode: "net_cash_operating",
    itemName: "经营活动产生的现金流量净额",
    sourceField: "n_cashflow_act",
    displayOrder: 10
  },
  {
    itemCode: "net_cash_investing",
    itemName: "投资活动产生的现金流量净额",
    sourceField: "n_cashflow_inv_act",
    displayOrder: 20
  },
  {
    itemCode: "net_cash_financing",
    itemName: "筹资活动产生的现金流量净额",
    sourceField: "n_cash_flows_fnc_act",
    displayOrder: 30
  }
];

function isQuarterEnd(endDate: string): boolean {
  return /^(?:\d{4})(0331|0630|0930|1231)$/.test(endDate);
}

export function inferPeriodTypeFromEndDate(endDate: string): NormalizedReportPeriod | null {
  if (!isQuarterEnd(endDate)) {
    return null;
  }

  const year = Number(endDate.slice(0, 4));
  const monthDay = endDate.slice(4, 8);

  switch (monthDay) {
    case "0331":
      return {
        endDate,
        fiscalYear: year,
        fiscalQuarter: 1,
        periodType: PeriodType.Q1
      };
    case "0630":
      return {
        endDate,
        fiscalYear: year,
        fiscalQuarter: 2,
        periodType: PeriodType.HALF_YEAR
      };
    case "0930":
      return {
        endDate,
        fiscalYear: year,
        fiscalQuarter: 3,
        periodType: PeriodType.Q3
      };
    case "1231":
      return {
        endDate,
        fiscalYear: year,
        fiscalQuarter: 4,
        periodType: PeriodType.ANNUAL
      };
    default:
      return null;
  }
}

function toNullableString(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return String(value);
}

export function mapStatementItems(
  record: TushareFinancialRecord,
  definitions: FinancialItemDefinition[]
): NormalizedStatementItem[] {
  const items: NormalizedStatementItem[] = [];

  for (const definition of definitions) {
    const itemValue = toNullableString(record[definition.sourceField]);
    if (itemValue === null) {
      continue;
    }

    items.push({
      itemCode: definition.itemCode,
      itemName: definition.itemName,
      itemValue,
      itemUnit: "CNY",
      parentCode: null,
      itemLevel: 1,
      displayOrder: definition.displayOrder,
      ...(definition.categoryType ? { categoryType: definition.categoryType } : {})
    });
  }

  return items;
}

export function mapTushareSegmentType(rawType: string | null | undefined): SegmentType {
  switch ((rawType ?? "").toUpperCase()) {
    case "P":
      return SegmentType.product;
    case "D":
      return SegmentType.region;
    default:
      return SegmentType.other;
  }
}

export function mapOperatingSegment(record: TushareMainBusinessRecord): NormalizedOperatingSegment {
  const extraJson: Record<string, unknown> = {};

  if (record.curr_type) {
    extraJson.currType = record.curr_type;
  }

  if (record.update_flag) {
    extraJson.updateFlag = record.update_flag;
  }

  if (record.type) {
    extraJson.sourceType = record.type;
  }

  return {
    segmentType: mapTushareSegmentType(record.type),
    segmentName: record.bz_item,
    revenue: toNullableString(record.bz_sales),
    cost: toNullableString(record.bz_cost),
    grossProfit: toNullableString(record.bz_profit),
    grossMargin: null,
    proportionRevenue: null,
    proportionProfit: null,
    extraJson: Object.keys(extraJson).length > 0 ? extraJson : null
  };
}

export function buildNormalizedPeriods(records: Array<{ end_date?: string | null }>): NormalizedReportPeriod[] {
  const uniquePeriods = new Map<string, NormalizedReportPeriod>();

  for (const record of records) {
    if (!record.end_date) {
      continue;
    }

    const normalized = inferPeriodTypeFromEndDate(record.end_date);
    if (!normalized) {
      continue;
    }

    uniquePeriods.set(normalized.endDate, normalized);
  }

  return [...uniquePeriods.values()].sort((left, right) => right.endDate.localeCompare(left.endDate));
}
