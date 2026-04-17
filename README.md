# A股公司分析软件 V1 后端基础

最小可运行后端基础，当前只覆盖：

- 公司列表 / 搜索
- 公司详情
- 报告期列表
- 资产负债表
- 利润表
- 现金流量表
- 经营分部

当前技术栈：

- Node.js 20+
- TypeScript
- Express
- Prisma
- PostgreSQL

## 当前业务范围

数据库业务主表严格限定为 6 张：

- `companies`
- `report_periods`
- `balance_sheet_items`
- `income_statement_items`
- `cashflow_statement_items`
- `operating_segments`

当前不包含：

- 用户系统
- 登录鉴权
- 收藏 / 关注
- AI 分析
- 任务 / jobs
- 前端页面
- 外部数据采集

## 目录结构

```text
prisma/
  migrations/
  schema.prisma
  seed.ts
scripts/
  smoke-test.ps1
src/
  controllers/
  lib/
  middleware/
  routes/
  services/
  types/
  utils/
  app.ts
  server.ts
```

## 环境要求

需要本地可用 PostgreSQL，并提供连接串。

示例环境变量见：

- [.env.example](D:/Download/公司研究工具/.env.example)

初始化本地环境文件：

```powershell
Copy-Item .env.example .env
```

然后修改 `.env` 中的 `DATABASE_URL`。

推荐示例：

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/company_research_tool?schema=public"
PORT=3000
```

## PostgreSQL 本地建库

如果你本机还没有目标数据库，先创建：

- 数据库名：`company_research_tool`
- 默认用户示例：`postgres`
- 默认端口：`5432`

已提供初始化 SQL：

- [init-database.sql](D:/Download/公司研究工具/scripts/init-database.sql)

### 方案 1：用 pgAdmin / DBeaver / Navicat 执行

连接到本地 PostgreSQL 后，执行下面这句 SQL：

```sql
CREATE DATABASE company_research_tool;
```

### 方案 2：如果你本机后续安装了 psql

```powershell
psql -U postgres -h localhost -p 5432 -f scripts/init-database.sql
```

如果你的数据库用户或密码不是 `postgres`，把 `.env` 里的连接串同步改掉即可。

## 安装与启动

安装依赖：

```powershell
npm install
```

生成 Prisma Client：

```powershell
npm run prisma:generate
```

执行数据库迁移：

```powershell
npm run prisma:migrate
```

写入演示数据：

```powershell
npm run prisma:seed
```

开发模式启动：

```powershell
npm run dev
```

构建：

```powershell
npm run build
```

生产方式启动：

```powershell
npm start
```

## 验证命令

类型检查：

```powershell
npm run typecheck
```

应用层单元 / HTTP 测试：

```powershell
npm run test
```

或显式执行：

```powershell
npm run test:unit
```

健康检查：

```powershell
Invoke-RestMethod http://localhost:3000/health
```

运行 smoke test：

```powershell
npm run smoke:test
```

## 真实 PostgreSQL 集成测试

集成测试会使用独立测试库，不会复用默认开发库。

### 测试库快速开始

```powershell
npm run test:integration:setup
npm run test:integration:create-db
npm run test:integration:check
npm run test:integration
```

如果本机没有 `psql`，请用 pgAdmin / DBeaver / Navicat 手动执行：

```sql
CREATE DATABASE company_research_tool_test;
```

测试环境模板：

- [.env.test.example](D:/Download/公司研究工具/.env.test.example)

初始化测试环境文件：

```powershell
Copy-Item .env.test.example .env.test
```

推荐测试库名：

- `company_research_tool_test`

示例连接串：

```env
TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/company_research_tool_test?schema=public"
```

执行顺序：

1. 创建测试库
2. 配置 `.env.test`
3. 运行集成测试

运行真实数据库集成测试：

```powershell
npm run test:integration
```

该命令会自动：

- 读取 `.env.test`
- 把 `TEST_DATABASE_URL` 作为测试库连接
- 执行 `prisma migrate reset --force --skip-generate`
- 重新写入 seed
- 运行 `tests/integration`

运行完整回归：

```powershell
npm run test:all
```

完整建议顺序：

```powershell
Copy-Item .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

然后新开一个 PowerShell 窗口执行：

```powershell
npm run smoke:test
```

如果要一起验证真实数据库集成测试，补充：

```powershell
Copy-Item .env.test.example .env.test
npm run test:integration
```

## API 清单

基础前缀：`/api`

- `GET /companies`
- `GET /companies/:companyId`
- `GET /companies/:companyId/report-periods`
- `GET /report-periods/:reportPeriodId/balance-sheet`
- `GET /report-periods/:reportPeriodId/income-statement`
- `GET /report-periods/:reportPeriodId/cashflow-statement`
- `GET /report-periods/:reportPeriodId/operating-segments`

更完整的请求/响应示例见：

- [API_EXAMPLES.md](D:/Download/公司研究工具/docs/API_EXAMPLES.md)

字段说明和表结构说明见：

- [DATA_DICTIONARY.md](D:/Download/公司研究工具/docs/DATA_DICTIONARY.md)

验收与手工测试清单见：

- [TEST_CHECKLIST.md](D:/Download/公司研究工具/docs/TEST_CHECKLIST.md)

### 1. 获取公司列表 / 搜索

```http
GET /api/companies?q=茅台&page=1&pageSize=20
```

返回结构：

```json
{
  "success": true,
  "data": {
    "items": [],
    "total": 0,
    "page": 1,
    "pageSize": 20
  }
}
```

### 2. 获取公司详情

```http
GET /api/companies/1
```

### 3. 获取公司可用报告期列表

```http
GET /api/companies/1/report-periods
```

### 4. 获取某报告期资产负债表

```http
GET /api/report-periods/1/balance-sheet
```

### 5. 获取某报告期利润表

```http
GET /api/report-periods/1/income-statement
```

### 6. 获取某报告期现金流量表

```http
GET /api/report-periods/1/cashflow-statement
```

### 7. 获取某报告期经营分部数据

```http
GET /api/report-periods/1/operating-segments
```

## 错误处理约定

成功响应：

```json
{
  "success": true,
  "data": {}
}
```

失败响应：

```json
{
  "success": false,
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "companyId must be a positive integer"
  }
}
```

常见状态：

- `400` 参数非法
- `404` 公司、报告期或路由不存在
- `500` 服务内部错误

## 当前演示数据

Seed 默认会写入：

- 1 家公司：`600519 / 贵州茅台股份有限公司`
- 2 个报告期
- 三大报表最小展示数据
- 经营分部示例数据

## 已完成校验

当前项目已完成以下校验：

- `npm install`
- `npm run typecheck`
- `npm run build`
- `npx prisma validate`
- 服务启动
- `/health` 健康检查

未在当前环境完成的步骤：

- 实际 PostgreSQL 落库迁移
- 实际 seed 入库
- 带数据库数据的 7 个接口联调

原因是当前环境未提供可直接连接的 PostgreSQL 实例。

## CI

仓库现在包含最小 GitHub Actions 工作流：

- [ci.yml](D:/Download/公司研究工具/.github/workflows/ci.yml)

这条工作流会自动执行：

- `npm ci`
- `npm run prisma:generate`
- `npm run typecheck`
- `npm run test:all`

CI 内部使用 PostgreSQL 17 service，并通过 `TEST_DATABASE_URL` 跑真实集成测试。
本地开发命令不需要变化，仍然按 README 里的方式执行即可。
