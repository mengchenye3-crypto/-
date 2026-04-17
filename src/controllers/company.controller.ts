import { Request, Response } from "express";

import { ApiSuccessResponse, CompanyDetail, OperatingSegmentsResponse, PaginatedCompanies, ReportPeriodSummary, StatementResponse } from "../types/api";
import {
  getBalanceSheet,
  getCashflowStatement,
  getCompanyDetail,
  getIncomeStatement,
  getOperatingSegments,
  listCompanies,
  listCompanyReportPeriods
} from "../services/company.service";
import { parseIdParam, parsePagination, requireSingleParam } from "../utils/validators";

function sendSuccess<T>(res: Response<ApiSuccessResponse<T>>, data: T): void {
  res.json({
    success: true,
    data
  });
}

export async function listCompaniesHandler(req: Request, res: Response<ApiSuccessResponse<PaginatedCompanies>>): Promise<void> {
  const { page, pageSize, q } = parsePagination(req);
  const result = await listCompanies({ page, pageSize, q });
  sendSuccess(res, result);
}

export async function getCompanyDetailHandler(
  req: Request,
  res: Response<ApiSuccessResponse<CompanyDetail>>
): Promise<void> {
  const companyId = parseIdParam(requireSingleParam(req.params.companyId, "companyId"), "companyId");
  const result = await getCompanyDetail(companyId);
  sendSuccess(res, result);
}

export async function listCompanyReportPeriodsHandler(
  req: Request,
  res: Response<ApiSuccessResponse<ReportPeriodSummary[]>>
): Promise<void> {
  const companyId = parseIdParam(requireSingleParam(req.params.companyId, "companyId"), "companyId");
  const result = await listCompanyReportPeriods(companyId);
  sendSuccess(res, result);
}

export async function getBalanceSheetHandler(
  req: Request,
  res: Response<ApiSuccessResponse<StatementResponse>>
): Promise<void> {
  const reportPeriodId = parseIdParam(requireSingleParam(req.params.reportPeriodId, "reportPeriodId"), "reportPeriodId");
  const result = await getBalanceSheet(reportPeriodId);
  sendSuccess(res, result);
}

export async function getIncomeStatementHandler(
  req: Request,
  res: Response<ApiSuccessResponse<StatementResponse>>
): Promise<void> {
  const reportPeriodId = parseIdParam(requireSingleParam(req.params.reportPeriodId, "reportPeriodId"), "reportPeriodId");
  const result = await getIncomeStatement(reportPeriodId);
  sendSuccess(res, result);
}

export async function getCashflowStatementHandler(
  req: Request,
  res: Response<ApiSuccessResponse<StatementResponse>>
): Promise<void> {
  const reportPeriodId = parseIdParam(requireSingleParam(req.params.reportPeriodId, "reportPeriodId"), "reportPeriodId");
  const result = await getCashflowStatement(reportPeriodId);
  sendSuccess(res, result);
}

export async function getOperatingSegmentsHandler(
  req: Request,
  res: Response<ApiSuccessResponse<OperatingSegmentsResponse>>
): Promise<void> {
  const reportPeriodId = parseIdParam(requireSingleParam(req.params.reportPeriodId, "reportPeriodId"), "reportPeriodId");
  const result = await getOperatingSegments(reportPeriodId);
  sendSuccess(res, result);
}
