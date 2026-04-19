export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface CompanyListItem {
  id: number;
  symbol: string;
  companyName: string;
  market: string;
  exchange: string;
  industry: string | null;
}

export interface CompanyDetail extends CompanyListItem {
  createdAt: string;
  updatedAt: string;
}

export interface FinancialHighlights {
  assetsTotal: number | null;
  liabilitiesTotal: number | null;
  equityTotal: number | null;
  revenue: number | null;
  operatingProfit: number | null;
  netIncome: number | null;
  netCashOperating: number | null;
  netCashInvesting: number | null;
  netCashFinancing: number | null;
}

export interface CompanyDetailSummary {
  company: CompanyDetail;
  reportPeriods: ReportPeriodSummary[];
  latestReportPeriod: ReportPeriodSummary | null;
  financialHighlights: FinancialHighlights | null;
  operatingSegments: OperatingSegmentItem[];
}

export interface ReportPeriodSummary {
  id: number;
  companyId: number;
  reportDate: string;
  fiscalYear: number;
  fiscalQuarter: number;
  periodType: string;
  source: string | null;
}

export interface StatementItem {
  id: number;
  itemCode: string;
  itemName: string;
  itemValue: number | null;
  itemUnit: string | null;
  parentCode: string | null;
  itemLevel: number;
  displayOrder: number;
  categoryType?: string | null;
}

export interface OperatingSegmentItem {
  id: number;
  segmentType: string;
  segmentName: string;
  revenue: number | null;
  cost: number | null;
  grossProfit: number | null;
  grossMargin: number | null;
  proportionRevenue: number | null;
  proportionProfit: number | null;
  extraJson: unknown;
}

export interface PaginatedCompanies {
  items: CompanyListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface StatementResponse {
  reportPeriod: ReportPeriodSummary;
  items: StatementItem[];
}

export interface OperatingSegmentsResponse {
  reportPeriod: ReportPeriodSummary;
  items: OperatingSegmentItem[];
}
