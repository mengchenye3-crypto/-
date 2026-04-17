# API 示例响应

本文档基于当前 seed 数据编写，便于前端联调和接口验收。

基础前缀：

```text
http://localhost:3000/api
```

## 1. 获取公司列表 / 搜索

请求：

```http
GET /api/companies?q=茅台&page=1&pageSize=20
```

示例响应：

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "symbol": "600519",
        "companyName": "贵州茅台股份有限公司",
        "market": "CN-A",
        "exchange": "SSE",
        "industry": "白酒"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 20
  }
}
```

## 2. 获取公司详情

请求：

```http
GET /api/companies/1
```

示例响应：

```json
{
  "success": true,
  "data": {
    "id": 1,
    "symbol": "600519",
    "companyName": "贵州茅台股份有限公司",
    "market": "CN-A",
    "exchange": "SSE",
    "industry": "白酒",
    "createdAt": "2026-04-17T00:00:00.000Z",
    "updatedAt": "2026-04-17T00:00:00.000Z"
  }
}
```

说明：

- `createdAt` 和 `updatedAt` 为示例时间，实际以数据库写入时间为准

## 3. 获取公司可用报告期列表

请求：

```http
GET /api/companies/1/report-periods
```

示例响应：

```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "companyId": 1,
      "reportDate": "2024-03-31",
      "fiscalYear": 2024,
      "fiscalQuarter": 1,
      "periodType": "Q1",
      "source": "demo-seed"
    },
    {
      "id": 1,
      "companyId": 1,
      "reportDate": "2023-12-31",
      "fiscalYear": 2023,
      "fiscalQuarter": 4,
      "periodType": "ANNUAL",
      "source": "demo-seed"
    }
  ]
}
```

## 4. 获取某报告期资产负债表

请求：

```http
GET /api/report-periods/1/balance-sheet
```

示例响应：

```json
{
  "success": true,
  "data": {
    "reportPeriod": {
      "id": 1,
      "companyId": 1,
      "reportDate": "2023-12-31",
      "fiscalYear": 2023,
      "fiscalQuarter": 4,
      "periodType": "ANNUAL",
      "source": "demo-seed"
    },
    "items": [
      {
        "id": 1,
        "itemCode": "assets_total",
        "itemName": "资产总计",
        "itemValue": 273122000000,
        "itemUnit": "CNY",
        "parentCode": null,
        "itemLevel": 1,
        "displayOrder": 10,
        "categoryType": "asset"
      },
      {
        "id": 2,
        "itemCode": "liabilities_total",
        "itemName": "负债合计",
        "itemValue": 90612000000,
        "itemUnit": "CNY",
        "parentCode": null,
        "itemLevel": 1,
        "displayOrder": 20,
        "categoryType": "liability"
      },
      {
        "id": 3,
        "itemCode": "equity_total",
        "itemName": "所有者权益合计",
        "itemValue": 182510000000,
        "itemUnit": "CNY",
        "parentCode": null,
        "itemLevel": 1,
        "displayOrder": 30,
        "categoryType": "equity"
      }
    ]
  }
}
```

## 5. 获取某报告期利润表

请求：

```http
GET /api/report-periods/1/income-statement
```

示例响应：

```json
{
  "success": true,
  "data": {
    "reportPeriod": {
      "id": 1,
      "companyId": 1,
      "reportDate": "2023-12-31",
      "fiscalYear": 2023,
      "fiscalQuarter": 4,
      "periodType": "ANNUAL",
      "source": "demo-seed"
    },
    "items": [
      {
        "id": 1,
        "itemCode": "revenue",
        "itemName": "营业收入",
        "itemValue": 150560000000,
        "itemUnit": "CNY",
        "parentCode": null,
        "itemLevel": 1,
        "displayOrder": 10
      },
      {
        "id": 2,
        "itemCode": "operating_profit",
        "itemName": "营业利润",
        "itemValue": 103420000000,
        "itemUnit": "CNY",
        "parentCode": null,
        "itemLevel": 1,
        "displayOrder": 20
      }
    ]
  }
}
```

## 6. 获取某报告期现金流量表

请求：

```http
GET /api/report-periods/1/cashflow-statement
```

示例响应：

```json
{
  "success": true,
  "data": {
    "reportPeriod": {
      "id": 1,
      "companyId": 1,
      "reportDate": "2023-12-31",
      "fiscalYear": 2023,
      "fiscalQuarter": 4,
      "periodType": "ANNUAL",
      "source": "demo-seed"
    },
    "items": [
      {
        "id": 1,
        "itemCode": "net_cash_operating",
        "itemName": "经营活动产生的现金流量净额",
        "itemValue": 66520000000,
        "itemUnit": "CNY",
        "parentCode": null,
        "itemLevel": 1,
        "displayOrder": 10
      },
      {
        "id": 2,
        "itemCode": "net_cash_investing",
        "itemName": "投资活动产生的现金流量净额",
        "itemValue": -12130000000,
        "itemUnit": "CNY",
        "parentCode": null,
        "itemLevel": 1,
        "displayOrder": 20
      }
    ]
  }
}
```

## 7. 获取某报告期经营分部数据

请求：

```http
GET /api/report-periods/1/operating-segments
```

示例响应：

```json
{
  "success": true,
  "data": {
    "reportPeriod": {
      "id": 1,
      "companyId": 1,
      "reportDate": "2023-12-31",
      "fiscalYear": 2023,
      "fiscalQuarter": 4,
      "periodType": "ANNUAL",
      "source": "demo-seed"
    },
    "items": [
      {
        "id": 1,
        "segmentType": "product",
        "segmentName": "茅台酒",
        "revenue": 126590000000,
        "cost": 10230000000,
        "grossProfit": 116360000000,
        "grossMargin": 0.9192,
        "proportionRevenue": 0.8408,
        "proportionProfit": 0.892,
        "extraJson": {
          "notes": "核心产品"
        }
      },
      {
        "id": 2,
        "segmentType": "region",
        "segmentName": "国内",
        "revenue": 142300000000,
        "cost": 13890000000,
        "grossProfit": 128410000000,
        "grossMargin": 0.9024,
        "proportionRevenue": 0.9451,
        "proportionProfit": 0.96,
        "extraJson": {
          "regionCode": "CN"
        }
      }
    ]
  }
}
```

## 常见错误响应

### 参数非法

请求：

```http
GET /api/companies/abc
```

示例响应：

```json
{
  "success": false,
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "companyId must be a positive integer"
  }
}
```

### 公司不存在

请求：

```http
GET /api/companies/999
```

示例响应：

```json
{
  "success": false,
  "error": {
    "code": "COMPANY_NOT_FOUND",
    "message": "Company not found"
  }
}
```

### 报告期不存在

请求：

```http
GET /api/report-periods/999/balance-sheet
```

示例响应：

```json
{
  "success": false,
  "error": {
    "code": "REPORT_PERIOD_NOT_FOUND",
    "message": "Report period not found"
  }
}
```
