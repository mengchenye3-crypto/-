# A股公司分析软件 V1

当前仓库已经完成：

- 6 张业务主表的 Prisma schema、migration、seed
- 7 个只读 API
- Tushare 官方 Python 库接入
- 单公司与小批量真实导入
- 公司详情聚合接口 `detail-summary`
- 一个最小只读页面，用于浏览公司列表和公司详情
- unit test、真实 PostgreSQL integration test、CI

当前阶段明确不做：

- 用户系统
- 鉴权
- AI 分析
- 任务调度
- 完整前端工程化重构

## 技术栈

- Node.js 20+
- TypeScript
- Express
- Prisma
- PostgreSQL
- Tushare Python 官方库

## 业务主表

仅使用以下 6 张业务主表：

- `companies`
- `report_periods`
- `balance_sheet_items`
- `income_statement_items`
- `cashflow_statement_items`
- `operating_segments`

## 环境准备

复制环境文件：

```powershell
Copy-Item .env.example .env
```

关键环境变量：

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/company_research_tool?schema=public"
PORT=3000
TUSHARE_TOKEN=""
TUSHARE_HTTP_URL="http://118.89.66.41:8020/"
TUSHARE_PYTHON_BIN="py"
```

说明：

- `DATABASE_URL` 指向开发库 `company_research_tool`
- `TUSHARE_TOKEN` 只保存在本地 `.env`，不要提交到仓库
- `TUSHARE_HTTP_URL` 使用当前可用的 Tushare 地址
- 本机需要安装 Python 与 `tushare`

## 启动与验收

安装依赖：

```powershell
npm install
npm run prisma:generate
```

初始化开发库：

```powershell
npm run prisma:migrate
```

基础回归：

```powershell
npm run typecheck
npm run test:all
```

单公司真实导入：

```powershell
npm run import:tushare -- --ts-code 600519.SH
```

批量导入：

```powershell
npm run import:tushare -- --file examples/import-list.txt
```

启动服务：

```powershell
npm run dev
```

打开只读页面：

- [http://localhost:3000](http://localhost:3000)

你可以直接在页面里完成：

- 公司列表浏览
- 名称或代码搜索
- 公司详情查看
- 报告期切换
- 三大报表 tab 切换
- 经营分部查看

## 只读 API

- `GET /api/companies`
- `GET /api/companies/:companyId`
- `GET /api/companies/:companyId/report-periods`
- `GET /api/companies/:companyId/detail-summary`
- `GET /api/report-periods/:reportPeriodId/balance-sheet`
- `GET /api/report-periods/:reportPeriodId/income-statement`
- `GET /api/report-periods/:reportPeriodId/cashflow-statement`
- `GET /api/report-periods/:reportPeriodId/operating-segments`

说明：

- `detail-summary` 用于前端公司详情页首屏聚合
- `operating-segments` 返回空数组在真实数据里是合法结果

## 批量导入规则

支持三种输入方式：

```powershell
npm run import:tushare -- --ts-code 600519.SH
npm run import:tushare -- --symbol 600519
npm run import:tushare -- --file examples/import-list.txt
```

文件格式规则：

- 一行一个代码
- 支持 `ts_code` 或 6 位 `symbol`
- 空行忽略
- `#` 注释行忽略

导入策略：

- 默认串行执行
- 单个公司失败不终止整体任务
- 重复导入按报告期覆盖更新，不累积重复数据

## 测试与 CI

本地：

```powershell
npm run typecheck
npm run test:unit
npm run test:all
```

真实 PostgreSQL 集成测试：

```powershell
Copy-Item .env.test.example .env.test
npm run test:integration
```

GitHub Actions：

- [ci.yml](/D:/Download/公司研究工具/.github/workflows/ci.yml)

## 文档

- [API_EXAMPLES.md](/D:/Download/公司研究工具/docs/API_EXAMPLES.md)
- [DATA_DICTIONARY.md](/D:/Download/公司研究工具/docs/DATA_DICTIONARY.md)
- [TEST_CHECKLIST.md](/D:/Download/公司研究工具/docs/TEST_CHECKLIST.md)
