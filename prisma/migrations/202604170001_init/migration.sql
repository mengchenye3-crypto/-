-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('ANNUAL', 'Q1', 'HALF_YEAR', 'Q3');

-- CreateEnum
CREATE TYPE "SegmentType" AS ENUM ('product', 'region', 'other');

-- CreateTable
CREATE TABLE "companies" (
    "id" SERIAL NOT NULL,
    "symbol" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "exchange" TEXT NOT NULL,
    "industry" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_periods" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "report_date" DATE NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "fiscal_quarter" INTEGER NOT NULL,
    "period_type" "PeriodType" NOT NULL,
    "source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "balance_sheet_items" (
    "id" SERIAL NOT NULL,
    "report_period_id" INTEGER NOT NULL,
    "item_code" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "item_value" DECIMAL(20,4),
    "item_unit" TEXT,
    "parent_code" TEXT,
    "item_level" INTEGER NOT NULL DEFAULT 1,
    "category_type" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "balance_sheet_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "income_statement_items" (
    "id" SERIAL NOT NULL,
    "report_period_id" INTEGER NOT NULL,
    "item_code" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "item_value" DECIMAL(20,4),
    "item_unit" TEXT,
    "parent_code" TEXT,
    "item_level" INTEGER NOT NULL DEFAULT 1,
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "income_statement_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cashflow_statement_items" (
    "id" SERIAL NOT NULL,
    "report_period_id" INTEGER NOT NULL,
    "item_code" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "item_value" DECIMAL(20,4),
    "item_unit" TEXT,
    "parent_code" TEXT,
    "item_level" INTEGER NOT NULL DEFAULT 1,
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "cashflow_statement_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operating_segments" (
    "id" SERIAL NOT NULL,
    "report_period_id" INTEGER NOT NULL,
    "segment_type" "SegmentType" NOT NULL,
    "segment_name" TEXT NOT NULL,
    "revenue" DECIMAL(20,4),
    "cost" DECIMAL(20,4),
    "gross_profit" DECIMAL(20,4),
    "gross_margin" DECIMAL(10,4),
    "proportion_revenue" DECIMAL(10,4),
    "proportion_profit" DECIMAL(10,4),
    "extra_json" JSONB,

    CONSTRAINT "operating_segments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "companies_symbol_idx" ON "companies"("symbol");

-- CreateIndex
CREATE INDEX "companies_company_name_idx" ON "companies"("company_name");

-- CreateIndex
CREATE UNIQUE INDEX "companies_symbol_market_key" ON "companies"("symbol", "market");

-- CreateIndex
CREATE INDEX "report_periods_company_id_report_date_idx" ON "report_periods"("company_id", "report_date");

-- CreateIndex
CREATE UNIQUE INDEX "report_periods_company_id_report_date_period_type_key" ON "report_periods"("company_id", "report_date", "period_type");

-- CreateIndex
CREATE INDEX "balance_sheet_items_report_period_id_display_order_idx" ON "balance_sheet_items"("report_period_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "balance_sheet_items_report_period_id_item_code_key" ON "balance_sheet_items"("report_period_id", "item_code");

-- CreateIndex
CREATE INDEX "income_statement_items_report_period_id_display_order_idx" ON "income_statement_items"("report_period_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "income_statement_items_report_period_id_item_code_key" ON "income_statement_items"("report_period_id", "item_code");

-- CreateIndex
CREATE INDEX "cashflow_statement_items_report_period_id_display_order_idx" ON "cashflow_statement_items"("report_period_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "cashflow_statement_items_report_period_id_item_code_key" ON "cashflow_statement_items"("report_period_id", "item_code");

-- CreateIndex
CREATE INDEX "operating_segments_report_period_id_segment_type_idx" ON "operating_segments"("report_period_id", "segment_type");

-- AddForeignKey
ALTER TABLE "report_periods" ADD CONSTRAINT "report_periods_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balance_sheet_items" ADD CONSTRAINT "balance_sheet_items_report_period_id_fkey" FOREIGN KEY ("report_period_id") REFERENCES "report_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_statement_items" ADD CONSTRAINT "income_statement_items_report_period_id_fkey" FOREIGN KEY ("report_period_id") REFERENCES "report_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashflow_statement_items" ADD CONSTRAINT "cashflow_statement_items_report_period_id_fkey" FOREIGN KEY ("report_period_id") REFERENCES "report_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operating_segments" ADD CONSTRAINT "operating_segments_report_period_id_fkey" FOREIGN KEY ("report_period_id") REFERENCES "report_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

