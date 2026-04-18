import { PeriodType, SegmentType } from "@prisma/client";

export type TushareRecord = Record<string, string | number | null | undefined>;

export interface TushareStockBasicRecord extends TushareRecord {
  ts_code: string;
  symbol: string;
  name: string;
  industry?: string | null;
  market?: string | null;
  exchange?: string | null;
}

export interface TushareFinancialRecord extends TushareRecord {
  ts_code: string;
  end_date: string;
  ann_date?: string | null;
  f_ann_date?: string | null;
}

export interface TushareMainBusinessRecord extends TushareRecord {
  ts_code: string;
  end_date: string;
  bz_item: string;
  bz_sales?: string | number | null;
  bz_profit?: string | number | null;
  bz_cost?: string | number | null;
  curr_type?: string | null;
  update_flag?: string | null;
  type?: string | null;
}

export interface FinancialItemDefinition {
  itemCode: string;
  itemName: string;
  sourceField: string;
  displayOrder: number;
  categoryType?: string;
}

export interface NormalizedReportPeriod {
  endDate: string;
  fiscalYear: number;
  fiscalQuarter: number;
  periodType: PeriodType;
}

export interface NormalizedStatementItem {
  itemCode: string;
  itemName: string;
  itemValue: string | null;
  itemUnit: string;
  parentCode: string | null;
  itemLevel: number;
  displayOrder: number;
  categoryType?: string | null;
}

export interface NormalizedOperatingSegment {
  segmentType: SegmentType;
  segmentName: string;
  revenue: string | null;
  cost: string | null;
  grossProfit: string | null;
  grossMargin: null;
  proportionRevenue: null;
  proportionProfit: null;
  extraJson: Record<string, unknown> | null;
}
