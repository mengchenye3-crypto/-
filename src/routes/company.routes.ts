import { Router } from "express";

import {
  getBalanceSheetHandler,
  getCashflowStatementHandler,
  getCompanyDetailHandler,
  getCompanyDetailSummaryHandler,
  getIncomeStatementHandler,
  getOperatingSegmentsHandler,
  listCompaniesHandler,
  listCompanyReportPeriodsHandler
} from "../controllers/company.controller";
import { asyncHandler } from "../utils/async-handler";

export const companyRouter = Router();

companyRouter.get("/companies", asyncHandler(listCompaniesHandler));
companyRouter.get("/companies/:companyId", asyncHandler(getCompanyDetailHandler));
companyRouter.get("/companies/:companyId/detail-summary", asyncHandler(getCompanyDetailSummaryHandler));
companyRouter.get("/companies/:companyId/report-periods", asyncHandler(listCompanyReportPeriodsHandler));
companyRouter.get("/report-periods/:reportPeriodId/balance-sheet", asyncHandler(getBalanceSheetHandler));
companyRouter.get("/report-periods/:reportPeriodId/income-statement", asyncHandler(getIncomeStatementHandler));
companyRouter.get("/report-periods/:reportPeriodId/cashflow-statement", asyncHandler(getCashflowStatementHandler));
companyRouter.get("/report-periods/:reportPeriodId/operating-segments", asyncHandler(getOperatingSegmentsHandler));
