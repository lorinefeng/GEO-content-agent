# AGENTS（geo-content-app）

本项目是一个运行在 Cloudflare Pages（Functions）上的 Next.js 应用，用于导入商品信息并通过多策略生成内容，支持 Markdown 渲染与历史记录（D1）。

## 代码仓库

- https://github.com/lorinefeng/GEO-content-agent/

## 运行环境与绑定

### Cloudflare Pages Variables（推荐全部放这里）

**必填**
- `OPENAI_API_KEY`：大模型接口 Key（OpenAI 兼容）
- `DB`：D1 数据库绑定名（Pages → Bindings → D1 database）

**可选**
- `OPENAI_BASE_URL`：OpenAI 兼容网关地址（例如自建/第三方网关）
- `OPENAI_MODEL`：模型名（默认 `gemini-3-flash-preview`）

## 核心能力（后端 API）

所有 API Route 都运行在 Edge Runtime（`runtime = 'edge'`）。

- `POST /api/generate`
  - 作用：基于商品信息 + 策略列表生成文章内容
  - 依赖：`OPENAI_API_KEY`（必填），`OPENAI_BASE_URL`（可选），`OPENAI_MODEL`（可选）
- `GET /api/articles?strategy=...`
  - 作用：按策略拉取文章列表（默认最近 50 条）
  - 依赖：D1 绑定 `DB`，并存在 `Article` 表
- `POST /api/articles`
  - 作用：保存文章到 D1（用于“历史记录”）
  - 依赖：D1 绑定 `DB`，并存在 `Article` 表
- `DELETE /api/articles/:id`
  - 作用：删除指定文章
  - 依赖：D1 绑定 `DB`
- `GET /api/templates`
  - 作用：读取模板（Prompt）列表
  - 依赖：D1 绑定 `DB`，并存在 `Template` 表
- `PUT /api/templates/:strategy`
  - 作用：写入/更新某个策略的模板（Prompt）
  - 依赖：D1 绑定 `DB`
- `GET /api/health`
  - 作用：线上自检（不会泄露密钥，只返回布尔值）
  - 检查项：OpenAI 变量是否配置、D1 是否绑定、`Article/Template` 表是否存在

## 数据模型（D1 / SQLite）

本项目直接用 D1 SQL 读写（不是 Prisma 运行时）。表结构与字段命名保持简洁：

- `Article`
  - `id`（uuid）
  - `product_name`
  - `product_price`（float）
  - `strategy`
  - `strategy_name`
  - `content`
  - `created_at`（datetime）
- `Template`
  - `strategy`（primary key）
  - `name`
  - `prompt`

## 本地开发

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建（Cloudflare Pages 产物）

```bash
npm run pages:build
```

输出目录为：
- `.vercel/output/static`

## Cloudflare Pages 部署要点

在 Cloudflare Pages 里创建项目时，建议使用以下配置：
- Root directory：`geo-content-app`
- Build command：`npm run pages:build`
- Build output directory：`.vercel/output/static`

部署与排错的更详细说明见仓库根目录文档：
- `CLOUDFLARE_PAGES_部署.md`

## 安全与密钥管理

- 不要把任何 Key/Token 写进仓库：一律使用 Pages Variables（线上）或本地 `.env`（本地调试，且已被 `.gitignore` 忽略）。
- 如果 Key 曾经提交过，请立即作废并重新生成，再替换到 Pages Variables。
