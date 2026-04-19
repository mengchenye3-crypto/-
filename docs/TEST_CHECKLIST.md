# 最小测试清单

本文档用于验证当前 V1 是否达到“真实可运行、真实可导入、真实可读取、可直接打开只读页面”的状态。

## 1. 环境与安装

- [ ] 已安装 Node.js 20+
- [ ] 已安装并启动 PostgreSQL
- [ ] 已创建开发库 `company_research_tool`
- [ ] 已复制环境文件：`Copy-Item .env.example .env`
- [ ] `.env` 中的 `DATABASE_URL` 可连接开发库
- [ ] 已配置 `TUSHARE_TOKEN`
- [ ] `py -3 -c "import tushare"` 可成功执行
- [ ] `npm install` 成功
- [ ] `npm run prisma:generate` 成功
- [ ] `npm run typecheck` 成功
- [ ] `npm run build` 成功

## 2. 数据库初始化

- [ ] `npm run prisma:migrate` 成功
- [ ] 开发库中存在 6 张业务主表
- [ ] 测试库 `company_research_tool_test` 已创建
- [ ] `npm run test:integration` 成功
- [ ] `npm run test:all` 成功

## 3. 单公司真实导入

- [ ] 执行 `npm run import:tushare -- --ts-code 600519.SH` 成功
- [ ] 返回结果包含：
  - `companyId`
  - `tsCode`
  - `importedReportPeriods`
  - 各报表与经营分部写入条数
- [ ] 二次重复执行同一命令仍然成功
- [ ] 重复导入后没有重复报告期
- [ ] 重复导入后报表与经营分部按报告期覆盖，不累积重复行

## 4. 批量导入

- [ ] 执行 `npm run import:tushare -- --file examples/import-list.txt` 成功
- [ ] 输出每个公司单独结果
- [ ] 输出最终汇总：
  - `total`
  - `succeeded`
  - `failed`
  - `failedInputs`
- [ ] 非法代码不会中断整个批量任务
- [ ] 导入后 `companies` 数量增加
- [ ] 新增公司可通过现有 API 查询

## 5. 服务启动

- [ ] 执行 `npm run dev` 成功
- [ ] `/health` 返回 `200`
- [ ] `/health` 返回：

```json
{
  "success": true,
  "data": {
    "status": "ok"
  }
}
```

## 6. 只读 API 验收

- [ ] `GET /api/companies` 返回 `200`
- [ ] `GET /api/companies/:companyId` 返回 `200`
- [ ] `GET /api/companies/:companyId/report-periods` 返回 `200`
- [ ] `GET /api/companies/:companyId/detail-summary` 返回 `200`
- [ ] `GET /api/report-periods/:reportPeriodId/balance-sheet` 返回 `200`
- [ ] `GET /api/report-periods/:reportPeriodId/income-statement` 返回 `200`
- [ ] `GET /api/report-periods/:reportPeriodId/cashflow-statement` 返回 `200`
- [ ] `GET /api/report-periods/:reportPeriodId/operating-segments` 返回 `200`

## 7. 只读页面验收

- [ ] 打开 [http://localhost:3000](http://localhost:3000) 成功
- [ ] 页面能展示公司列表
- [ ] 搜索框能按代码或名称过滤公司
- [ ] 点击公司后能展示公司详情
- [ ] 页面能展示：
  - 公司基础信息
  - 报告期列表
  - 最新期财报摘要
  - 三大报表
  - 经营分部
- [ ] 报告期切换后，三大报表和经营分部同步刷新
- [ ] 若当前报告期没有经营分部数据，页面正常显示“暂无数据”而不是报错

## 8. 聚合接口验收

- [ ] `detail-summary` 返回：
  - 公司基础信息
  - 报告期列表
  - 最新报告期
  - 最新期财报摘要
  - 最新一期经营分部摘要
- [ ] 若最新一期无经营分部，返回空数组而不是报错
- [ ] 非法 `companyId` 返回 `400`
- [ ] 不存在公司返回 `404`

## 9. 边界与错误处理

- [ ] `GET /api/companies/abc` 返回 `400`
- [ ] `GET /api/report-periods/abc/balance-sheet` 返回 `400`
- [ ] `GET /api/companies?page=0` 返回 `400`
- [ ] `GET /api/companies?pageSize=101` 返回 `400`
- [ ] 不存在公司返回 `404`
- [ ] 不存在报告期返回 `404`
- [ ] 未知路由返回 `404`
- [ ] 空报表或空分部返回空数组，不返回 `500`

## 10. 数据一致性

- [ ] 所有成功响应都有 `success: true`
- [ ] 所有错误响应都有 `success: false`
- [ ] 数值字段保持 `number | null`
- [ ] `reportDate` 保持 `YYYY-MM-DD`
- [ ] `segmentType` 仅出现：
  - `product`
  - `region`
  - `other`
