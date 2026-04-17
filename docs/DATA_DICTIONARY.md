# 数据字典

本文档基于当前实现整理，覆盖：

- 6 张业务主表
- 主要约束与索引
- API 返回字段含义

目标是让后续开发、联调和数据导入都能基于同一份字段定义工作。

## 1. companies

表名：

```text
companies
```

用途：

- 存储公司基础信息
- 作为公司详情页和公司列表的主实体

核心字段：

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `Int` | 是 | 主键，自增 |
| `symbol` | `String` | 是 | 股票代码 |
| `company_name` | `String` | 是 | 公司名称 |
| `market` | `String` | 是 | 市场标识，例如 `CN-A` |
| `exchange` | `String` | 是 | 交易所标识，例如 `SSE` |
| `industry` | `String?` | 否 | 所属行业 |
| `created_at` | `DateTime` | 是 | 创建时间 |
| `updated_at` | `DateTime` | 是 | 更新时间 |

约束与索引：

- 主键：`id`
- 唯一约束：`(symbol, market)`
- 索引：`symbol`
- 索引：`company_name`

设计说明：

- 没有使用单列 `symbol` 唯一，是为了避免跨市场代码冲突
- 当前不扩展公司简介、法人、注册地址等字段，保持第一版最小范围

接口映射：

- `GET /api/companies`
- `GET /api/companies/:companyId`

## 2. report_periods

表名：

```text
report_periods
```

用途：

- 存储公司的报告期信息
- 作为三大报表和经营分部数据的统一父表

核心字段：

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `Int` | 是 | 主键，自增 |
| `company_id` | `Int` | 是 | 关联 `companies.id` |
| `report_date` | `Date` | 是 | 报告期日期，例如 `2023-12-31` |
| `fiscal_year` | `Int` | 是 | 财年 |
| `fiscal_quarter` | `Int` | 是 | 财季，当前用于排序和展示 |
| `period_type` | `PeriodType` | 是 | 报告类型 |
| `source` | `String?` | 否 | 数据来源说明 |
| `created_at` | `DateTime` | 是 | 创建时间 |

枚举 `PeriodType`：

- `ANNUAL`
- `Q1`
- `HALF_YEAR`
- `Q3`

约束与索引：

- 主键：`id`
- 外键：`company_id -> companies.id`
- 唯一约束：`(company_id, report_date, period_type)`
- 索引：`(company_id, report_date)`

设计说明：

- `report_periods` 是所有财务明细表的统一挂载点
- 第一版只处理读取，不处理报告期写入冲突合并逻辑

接口映射：

- `GET /api/companies/:companyId/report-periods`
- 所有 `/api/report-periods/:reportPeriodId/*` 接口都会先依赖它

## 3. balance_sheet_items

表名：

```text
balance_sheet_items
```

用途：

- 存储资产负债表的科目行

核心字段：

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `Int` | 是 | 主键，自增 |
| `report_period_id` | `Int` | 是 | 关联 `report_periods.id` |
| `item_code` | `String` | 是 | 科目编码，单个报告期内唯一 |
| `item_name` | `String` | 是 | 科目名称 |
| `item_value` | `Decimal?` | 否 | 科目值 |
| `item_unit` | `String?` | 否 | 单位，例如 `CNY` |
| `parent_code` | `String?` | 否 | 父级科目编码 |
| `item_level` | `Int` | 是 | 层级深度 |
| `category_type` | `String?` | 否 | 分类，例如 `asset` / `liability` / `equity` |
| `display_order` | `Int` | 是 | 展示排序 |

约束与索引：

- 主键：`id`
- 外键：`report_period_id -> report_periods.id`
- 唯一约束：`(report_period_id, item_code)`
- 索引：`(report_period_id, display_order)`

设计说明：

- 使用“科目行”结构，不做超宽表
- `parent_code` 和 `item_level` 保留层级信息，但第一版不强制后端输出树结构

接口映射：

- `GET /api/report-periods/:reportPeriodId/balance-sheet`

## 4. income_statement_items

表名：

```text
income_statement_items
```

用途：

- 存储利润表的科目行

核心字段：

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `Int` | 是 | 主键，自增 |
| `report_period_id` | `Int` | 是 | 关联 `report_periods.id` |
| `item_code` | `String` | 是 | 科目编码，单个报告期内唯一 |
| `item_name` | `String` | 是 | 科目名称 |
| `item_value` | `Decimal?` | 否 | 科目值 |
| `item_unit` | `String?` | 否 | 单位 |
| `parent_code` | `String?` | 否 | 父级科目编码 |
| `item_level` | `Int` | 是 | 层级深度 |
| `display_order` | `Int` | 是 | 展示排序 |

约束与索引：

- 主键：`id`
- 外键：`report_period_id -> report_periods.id`
- 唯一约束：`(report_period_id, item_code)`
- 索引：`(report_period_id, display_order)`

接口映射：

- `GET /api/report-periods/:reportPeriodId/income-statement`

## 5. cashflow_statement_items

表名：

```text
cashflow_statement_items
```

用途：

- 存储现金流量表的科目行

核心字段：

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `Int` | 是 | 主键，自增 |
| `report_period_id` | `Int` | 是 | 关联 `report_periods.id` |
| `item_code` | `String` | 是 | 科目编码，单个报告期内唯一 |
| `item_name` | `String` | 是 | 科目名称 |
| `item_value` | `Decimal?` | 否 | 科目值 |
| `item_unit` | `String?` | 否 | 单位 |
| `parent_code` | `String?` | 否 | 父级科目编码 |
| `item_level` | `Int` | 是 | 层级深度 |
| `display_order` | `Int` | 是 | 展示排序 |

约束与索引：

- 主键：`id`
- 外键：`report_period_id -> report_periods.id`
- 唯一约束：`(report_period_id, item_code)`
- 索引：`(report_period_id, display_order)`

接口映射：

- `GET /api/report-periods/:reportPeriodId/cashflow-statement`

## 6. operating_segments

表名：

```text
operating_segments
```

用途：

- 存储经营分部数据
- 用一张表同时支持按产品、按地区、其他分类

核心字段：

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `Int` | 是 | 主键，自增 |
| `report_period_id` | `Int` | 是 | 关联 `report_periods.id` |
| `segment_type` | `SegmentType` | 是 | 分部类型 |
| `segment_name` | `String` | 是 | 分部名称 |
| `revenue` | `Decimal?` | 否 | 营业收入 |
| `cost` | `Decimal?` | 否 | 营业成本 |
| `gross_profit` | `Decimal?` | 否 | 毛利 |
| `gross_margin` | `Decimal?` | 否 | 毛利率 |
| `proportion_revenue` | `Decimal?` | 否 | 收入占比 |
| `proportion_profit` | `Decimal?` | 否 | 利润占比 |
| `extra_json` | `Json?` | 否 | 扩展字段，存放暂不固定的补充信息 |

枚举 `SegmentType`：

- `product`
- `region`
- `other`

约束与索引：

- 主键：`id`
- 外键：`report_period_id -> report_periods.id`
- 索引：`(report_period_id, segment_type)`

设计说明：

- 第一版用 `segment_type` 区分类型，不拆多张分部表
- `extra_json` 用于承载当前不适合固化成列的少量补充字段

接口映射：

- `GET /api/report-periods/:reportPeriodId/operating-segments`

## API 返回字段字典

## CompanyListItem

对应接口：

- `GET /api/companies`

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `number` | 公司 ID |
| `symbol` | `string` | 股票代码 |
| `companyName` | `string` | 公司名称 |
| `market` | `string` | 市场标识 |
| `exchange` | `string` | 交易所标识 |
| `industry` | `string \| null` | 行业 |

## CompanyDetail

对应接口：

- `GET /api/companies/:companyId`

在 `CompanyListItem` 基础上增加：

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| `createdAt` | `string` | ISO 时间字符串 |
| `updatedAt` | `string` | ISO 时间字符串 |

## ReportPeriodSummary

对应接口：

- `GET /api/companies/:companyId/report-periods`
- 所有报表和经营分部接口的 `reportPeriod`

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `number` | 报告期 ID |
| `companyId` | `number` | 所属公司 ID |
| `reportDate` | `string` | `YYYY-MM-DD` |
| `fiscalYear` | `number` | 财年 |
| `fiscalQuarter` | `number` | 财季 |
| `periodType` | `string` | 报告类型枚举值 |
| `source` | `string \| null` | 数据来源 |

## StatementItem

对应接口：

- 资产负债表
- 利润表
- 现金流量表

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `number` | 行 ID |
| `itemCode` | `string` | 科目编码 |
| `itemName` | `string` | 科目名称 |
| `itemValue` | `number \| null` | 科目值 |
| `itemUnit` | `string \| null` | 单位 |
| `parentCode` | `string \| null` | 父级科目编码 |
| `itemLevel` | `number` | 层级深度 |
| `displayOrder` | `number` | 排序值 |
| `categoryType` | `string \| null` | 仅资产负债表可能返回 |

## OperatingSegmentItem

对应接口：

- `GET /api/report-periods/:reportPeriodId/operating-segments`

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `number` | 行 ID |
| `segmentType` | `string` | 分部类型 |
| `segmentName` | `string` | 分部名称 |
| `revenue` | `number \| null` | 收入 |
| `cost` | `number \| null` | 成本 |
| `grossProfit` | `number \| null` | 毛利 |
| `grossMargin` | `number \| null` | 毛利率 |
| `proportionRevenue` | `number \| null` | 收入占比 |
| `proportionProfit` | `number \| null` | 利润占比 |
| `extraJson` | `unknown` | 扩展信息 |
