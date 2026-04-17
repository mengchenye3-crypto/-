import "dotenv/config";

import { PrismaClient, PeriodType, SegmentType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.operatingSegment.deleteMany();
  await prisma.cashflowStatementItem.deleteMany();
  await prisma.incomeStatementItem.deleteMany();
  await prisma.balanceSheetItem.deleteMany();
  await prisma.reportPeriod.deleteMany();
  await prisma.company.deleteMany();

  const company = await prisma.company.create({
    data: {
      symbol: "600519",
      companyName: "贵州茅台股份有限公司",
      market: "CN-A",
      exchange: "SSE",
      industry: "白酒"
    }
  });

  const annual2023 = await prisma.reportPeriod.create({
    data: {
      companyId: company.id,
      reportDate: new Date("2023-12-31"),
      fiscalYear: 2023,
      fiscalQuarter: 4,
      periodType: PeriodType.ANNUAL,
      source: "demo-seed"
    }
  });

  const q12024 = await prisma.reportPeriod.create({
    data: {
      companyId: company.id,
      reportDate: new Date("2024-03-31"),
      fiscalYear: 2024,
      fiscalQuarter: 1,
      periodType: PeriodType.Q1,
      source: "demo-seed"
    }
  });

  await prisma.balanceSheetItem.createMany({
    data: [
      {
        reportPeriodId: annual2023.id,
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
        reportPeriodId: annual2023.id,
        itemCode: "liabilities_total",
        itemName: "负债合计",
        itemValue: "90612000000",
        itemUnit: "CNY",
        parentCode: null,
        itemLevel: 1,
        categoryType: "liability",
        displayOrder: 20
      },
      {
        reportPeriodId: annual2023.id,
        itemCode: "equity_total",
        itemName: "所有者权益合计",
        itemValue: "182510000000",
        itemUnit: "CNY",
        parentCode: null,
        itemLevel: 1,
        categoryType: "equity",
        displayOrder: 30
      },
      {
        reportPeriodId: q12024.id,
        itemCode: "assets_total",
        itemName: "资产总计",
        itemValue: "285000000000",
        itemUnit: "CNY",
        parentCode: null,
        itemLevel: 1,
        categoryType: "asset",
        displayOrder: 10
      }
    ]
  });

  await prisma.incomeStatementItem.createMany({
    data: [
      {
        reportPeriodId: annual2023.id,
        itemCode: "revenue",
        itemName: "营业收入",
        itemValue: "150560000000",
        itemUnit: "CNY",
        parentCode: null,
        itemLevel: 1,
        displayOrder: 10
      },
      {
        reportPeriodId: annual2023.id,
        itemCode: "operating_profit",
        itemName: "营业利润",
        itemValue: "103420000000",
        itemUnit: "CNY",
        parentCode: null,
        itemLevel: 1,
        displayOrder: 20
      },
      {
        reportPeriodId: q12024.id,
        itemCode: "revenue",
        itemName: "营业收入",
        itemValue: "45600000000",
        itemUnit: "CNY",
        parentCode: null,
        itemLevel: 1,
        displayOrder: 10
      }
    ]
  });

  await prisma.cashflowStatementItem.createMany({
    data: [
      {
        reportPeriodId: annual2023.id,
        itemCode: "net_cash_operating",
        itemName: "经营活动产生的现金流量净额",
        itemValue: "66520000000",
        itemUnit: "CNY",
        parentCode: null,
        itemLevel: 1,
        displayOrder: 10
      },
      {
        reportPeriodId: annual2023.id,
        itemCode: "net_cash_investing",
        itemName: "投资活动产生的现金流量净额",
        itemValue: "-12130000000",
        itemUnit: "CNY",
        parentCode: null,
        itemLevel: 1,
        displayOrder: 20
      },
      {
        reportPeriodId: q12024.id,
        itemCode: "net_cash_operating",
        itemName: "经营活动产生的现金流量净额",
        itemValue: "19400000000",
        itemUnit: "CNY",
        parentCode: null,
        itemLevel: 1,
        displayOrder: 10
      }
    ]
  });

  await prisma.operatingSegment.createMany({
    data: [
      {
        reportPeriodId: annual2023.id,
        segmentType: SegmentType.product,
        segmentName: "茅台酒",
        revenue: "126590000000",
        cost: "10230000000",
        grossProfit: "116360000000",
        grossMargin: "0.9192",
        proportionRevenue: "0.8408",
        proportionProfit: "0.8920",
        extraJson: { notes: "核心产品" }
      },
      {
        reportPeriodId: annual2023.id,
        segmentType: SegmentType.region,
        segmentName: "国内",
        revenue: "142300000000",
        cost: "13890000000",
        grossProfit: "128410000000",
        grossMargin: "0.9024",
        proportionRevenue: "0.9451",
        proportionProfit: "0.9600",
        extraJson: { regionCode: "CN" }
      },
      {
        reportPeriodId: q12024.id,
        segmentType: SegmentType.other,
        segmentName: "其他业务",
        revenue: "980000000",
        cost: "260000000",
        grossProfit: "720000000",
        grossMargin: "0.7347",
        proportionRevenue: "0.0215",
        proportionProfit: "0.0180",
        extraJson: { notes: "演示数据" }
      }
    ]
  });
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
