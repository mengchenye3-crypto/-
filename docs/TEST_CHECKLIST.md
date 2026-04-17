# 最小测试清单

本文档用于验证当前 V1 后端基础是否达到可用标准。

建议测试顺序：

1. 环境与安装
2. 数据库迁移与 seed
3. 服务启动
4. 接口 smoke test
5. 边界与错误处理
6. 数据约束与排序

## 1. 环境与安装

- [ ] 本机已安装 Node.js 20+
- [ ] 本机已安装并启动 PostgreSQL
- [ ] 已创建数据库 `company_research_tool`
- [ ] 已复制环境文件：`Copy-Item .env.example .env`
- [ ] `.env` 中的 `DATABASE_URL` 可正常连接数据库
- [ ] 执行 `npm install` 成功
- [ ] 执行 `npm run prisma:generate` 成功
- [ ] 执行 `npm run typecheck` 成功
- [ ] 执行 `npm run build` 成功

## 2. 数据库迁移与 Seed

- [ ] 执行 `npm run prisma:migrate` 成功
- [ ] 执行 `npm run prisma:seed` 成功
- [ ] 数据库中存在 6 张业务主表
- [ ] `companies` 中至少有 1 条演示公司数据
- [ ] `report_periods` 中至少有 2 条报告期数据
- [ ] 三大报表表中存在演示科目数据
- [ ] `operating_segments` 中存在演示分部数据

## 3. 服务启动

- [ ] 执行 `npm run dev` 成功
- [ ] 终端出现服务启动日志
- [ ] `GET /health` 返回 `200`
- [ ] `/health` 返回结构为：

```json
{
  "success": true,
  "data": {
    "status": "ok"
  }
}
```

## 4. 接口 Smoke Test

### 4.1 公司列表 / 搜索

- [ ] `GET /api/companies` 返回 `200`
- [ ] 返回结构包含：`items`、`total`、`page`、`pageSize`
- [ ] `items` 为数组
- [ ] 默认按 `symbol asc` 排序
- [ ] `GET /api/companies?q=茅台` 能返回命中结果

### 4.2 公司详情

- [ ] `GET /api/companies/1` 返回 `200`
- [ ] 返回结构包含：`id`、`symbol`、`companyName`、`market`、`exchange`
- [ ] 返回 `createdAt`、`updatedAt` 为字符串

### 4.3 报告期列表

- [ ] `GET /api/companies/1/report-periods` 返回 `200`
- [ ] 返回数组项包含：`reportDate`、`fiscalYear`、`fiscalQuarter`、`periodType`
- [ ] 报告期按 `reportDate desc` 排序

### 4.4 资产负债表

- [ ] `GET /api/report-periods/1/balance-sheet` 返回 `200`
- [ ] 返回结构包含：`reportPeriod`、`items`
- [ ] `items` 按 `displayOrder asc` 排序
- [ ] 资产负债表项包含 `categoryType`

### 4.5 利润表

- [ ] `GET /api/report-periods/1/income-statement` 返回 `200`
- [ ] 返回结构包含：`reportPeriod`、`items`
- [ ] `items` 按 `displayOrder asc` 排序

### 4.6 现金流量表

- [ ] `GET /api/report-periods/1/cashflow-statement` 返回 `200`
- [ ] 返回结构包含：`reportPeriod`、`items`
- [ ] `items` 按 `displayOrder asc` 排序

### 4.7 经营分部

- [ ] `GET /api/report-periods/1/operating-segments` 返回 `200`
- [ ] 返回结构包含：`reportPeriod`、`items`
- [ ] `items` 中包含：`segmentType`、`segmentName`、`revenue`、`cost`
- [ ] `segmentType` 只出现 `product`、`region`、`other`

## 5. 边界与错误处理

### 5.1 非法参数

- [ ] `GET /api/companies/abc` 返回 `400`
- [ ] `GET /api/report-periods/abc/balance-sheet` 返回 `400`
- [ ] `GET /api/companies?page=0` 返回 `400`
- [ ] `GET /api/companies?pageSize=101` 返回 `400`

### 5.2 资源不存在

- [ ] `GET /api/companies/999999` 返回 `404`
- [ ] `GET /api/companies/999999/report-periods` 返回 `404`
- [ ] `GET /api/report-periods/999999/balance-sheet` 返回 `404`
- [ ] `GET /api/report-periods/999999/income-statement` 返回 `404`
- [ ] `GET /api/report-periods/999999/cashflow-statement` 返回 `404`
- [ ] `GET /api/report-periods/999999/operating-segments` 返回 `404`

### 5.3 空数据

- [ ] 当报告期存在但某类报表无数据时，接口返回 `200`
- [ ] 无数据时 `items` 返回空数组 `[]`
- [ ] 不会因为空数据抛出 `500`

### 5.4 路由不存在

- [ ] `GET /api/not-found` 返回 `404`

## 6. 数据结构一致性

- [ ] 所有成功响应都包含 `success: true`
- [ ] 所有失败响应都包含 `success: false`
- [ ] 失败响应都包含 `error.code` 和 `error.message`
- [ ] 三大报表中的 `itemValue` 类型一致，为 `number | null`
- [ ] 经营分部中的数值字段类型一致，为 `number | null`
- [ ] `reportDate` 格式统一为 `YYYY-MM-DD`

## 7. 数据库约束验证

以下检查建议使用 Prisma Studio、数据库客户端或手动插入测试数据进行：

- [ ] 重复插入相同 `(symbol, market)` 会失败
- [ ] 重复插入相同 `(company_id, report_date, period_type)` 会失败
- [ ] 重复插入相同 `(report_period_id, item_code)` 到资产负债表会失败
- [ ] 重复插入相同 `(report_period_id, item_code)` 到利润表会失败
- [ ] 重复插入相同 `(report_period_id, item_code)` 到现金流量表会失败
- [ ] 删除公司后，不会留下孤立的报告期数据
- [ ] 删除报告期后，不会留下孤立的报表行或经营分部数据

## 8. 推荐命令

准备环境：

```powershell
Copy-Item .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

启动服务：

```powershell
npm run dev
```

运行 smoke test：

```powershell
npm run smoke:test
```

## 9. 真实 PostgreSQL 集成测试

- [ ] 已创建测试库 `company_research_tool_test`
- [ ] 已复制测试环境文件：`Copy-Item .env.test.example .env.test`
- [ ] `.env.test` 中的 `TEST_DATABASE_URL` 可正常连接测试库
- [ ] 执行 `npm run test:integration` 成功
- [ ] 执行 `npm run test:all` 成功

集成测试应覆盖：

- [ ] migration 能在测试库执行
- [ ] seed 能在测试库写入演示数据
- [ ] 7 个只读接口能在真实 PostgreSQL 上返回正确结构
- [ ] `(symbol, market)` 唯一约束被验证
- [ ] `(company_id, report_date, period_type)` 唯一约束被验证
- [ ] `(report_period_id, item_code)` 唯一约束被验证
- [ ] 删除公司后无孤立报告期和报表行
- [ ] 删除报告期后无孤立报表行和经营分部
