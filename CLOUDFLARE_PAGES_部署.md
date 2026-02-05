# Cloudflare Pages 部署（geo-content-app）

本仓库是多目录结构，Cloudflare Pages 需要指向真正的 Next.js 项目目录：`geo-content-app/`。

## 推荐做法（最省事）

在 Cloudflare 控制台走 **Workers & Pages → Pages → Create a project（连接 Git）**，然后在 “Set up builds and deployments” 里配置：

- **Root directory**：`geo-content-app`
- **Build command**：`npm run pages:build`
- **Build output directory**：`.vercel/output/static`

说明：
- `pages:build` 由 `@cloudflare/next-on-pages` 生成 Pages/Worker 运行产物，最终输出在 `.vercel/output/static`。
- 选择 `geo-content-app` 作为 Root directory 后，Cloudflare 才能找到 `geo-content-app/package.json` 与 `geo-content-app/package-lock.json`，依赖安装与构建才会正常。

## 运行时必配（D1）

在 Pages 项目里进入 Settings（或 Bindings/Functions 相关页面），添加 D1 绑定：

- **Binding name**：`DB`
- **Database**：选择你的 D1（例如 `geo-db`）

绑定名必须叫 `DB`，因为代码与 `wrangler.toml` 都是按 `DB` 读取。

## 运行时可选（大模型）

项目的 `/api/generate` 会调用大模型接口，需在 Pages → Settings → Variables and Secrets 配置：

- `OPENAI_API_KEY`：必填
- `OPENAI_BASE_URL`：可选（使用 OpenAI 兼容接口时建议填写）
- `OPENAI_MODEL`：可选（默认 `gemini-3-flash-preview`，可按你的接口改成可用模型名）

## Node.js 兼容开关

如果页面提供 “Node.js compatibility / nodejs_compat” 的开关，建议开启（本项目 `wrangler.toml` 已声明 `compatibility_flags = ["nodejs_compat"]`）。

## 常见报错与原因

### 1) `ENOENT: no such file or directory, open '/opt/buildhome/repo/package.json'`

原因：Cloudflare 在仓库根目录执行了 `npm`，但本仓库根目录没有 `package.json`（Next.js 项目在 `geo-content-app/`）。

解决：把 Pages 的 **Root directory** 改为 `geo-content-app`（推荐）；或在 Build command 前手动 `cd geo-content-app`。

### 2) 不要再用 `wrangler deploy`

Pages Git 集成部署不需要 `wrangler deploy`。如果你之前在 “Deploy command” 里配过 `wrangler deploy`，那是 Workers 的流程，建议改为纯 Pages 项目并按上面的 Pages 配置重新创建/重配。

## 快速自检

部署后访问：

- `/api/health`

会返回 D1 绑定/表是否存在，以及 OpenAI 相关变量是否已配置（只返回布尔值，不会泄露密钥）。
