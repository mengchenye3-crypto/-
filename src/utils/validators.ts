import { Request } from "express";

import { AppError } from "../middleware/error-handler";

function parsePositiveInteger(value: string, fieldName: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError("INVALID_PARAMETER", `${fieldName} must be a positive integer`, 400);
  }

  return parsed;
}

export function parseIdParam(value: string, fieldName: string): number {
  return parsePositiveInteger(value, fieldName);
}

export function requireSingleParam(value: string | string[] | undefined, fieldName: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError("INVALID_PARAMETER", `${fieldName} is required`, 400);
  }

  return value;
}

export function parsePagination(req: Request): { page: number; pageSize: number; q: string | undefined } {
  const page = req.query.page ? parsePositiveInteger(String(req.query.page), "page") : 1;
  const pageSize = req.query.pageSize ? parsePositiveInteger(String(req.query.pageSize), "pageSize") : 20;

  if (pageSize > 100) {
    throw new AppError("INVALID_PARAMETER", "pageSize must not exceed 100", 400);
  }

  const q = typeof req.query.q === "string" && req.query.q.trim() ? req.query.q.trim() : undefined;

  return { page, pageSize, q };
}
