# GEO内容生成应用部署准备计划 (Cloudflare Pages + D1)

为了将应用成功部署到 Cloudflare Pages 并使用 D1 数据库，我们需要完成从本地开发环境（Next.js + FastAPI + SQLite）向云原生环境（Next.js Fullstack + D1）的迁移。

## 1. 数据库支持与后端迁移 (Cloudflare D1)
我们将把原有的 FastAPI 后端逻辑整合进 Next.js 的 API Routes 中，以便于在 Cloudflare Pages 上统一部署。

### Prisma 与 D1 配置
1.  **模型更新**: 在 [schema.prisma](file:///Users/karpsie/SkuGeo/geo-content-app/prisma/schema.prisma) 中添加 `Article` (历史记录) 和 `Template` (Prompt模板) 模型。
2.  **驱动适配**: 安装并配置 `@prisma/adapter-d1`，确保 Prisma 可以通过 Cloudflare 的边缘环境访问 D1 数据库。
3.  **Wrangler 配置**: 创建 `wrangler.toml` 文件，定义 D1 数据库绑定（Binding）。

### API 路由实现 (移植自 Python 后端)
1.  **历史记录接口**: 实现 `src/app/api/articles/route.ts`，支持对生成内容的存储与查询。
2.  **模板管理接口**: 实现 `src/app/api/templates/route.ts`，支持自定义 Prompt 模板的保存。
3.  **内容生成接口**: 实现 `src/app/api/generate/route.ts`，将 [generate_content.py](file:///Users/karpsie/SkuGeo/agents/generate_content.py) 等脚本中的 Prompt 逻辑移植到 TypeScript 中，直接调用 AI 接口。

### 前端适配
- 修改 [HistoryPage](file:///Users/karpsie/SkuGeo/geo-content-app/src/app/history/page.tsx) 等组件，将 `API_BASE` 修改为相对路径 `/api`，使前端直接调用本地 API 路由。

## 2. 代码收集与推送 (GitHub)
我们将把整个项目推送到您的 GitHub 仓库。

1.  **Git 初始化**: 在根目录 `/Users/karpsie/SkuGeo/` 执行 `git init`。
2.  **配置 .gitignore**: 确保排除 `.venv`, `node_modules`, `.next`, `*.db` 等无用文件。
3.  **远程关联**: 添加远程仓库 `https://github.com/lorinefeng/GEO-content-agent`。
4.  **执行推送**: 提交并推送所有核心代码（前端应用、后端逻辑脚本、配置文件）。

## 3. 必要配置信息 (需要您手动操作)
部署完成后，我将为您汇总以下配置，需要您在浏览器中完成：

### Cloudflare 侧配置
- **创建 D1 数据库**: 在 Cloudflare 控制台或通过命令行创建一个名为 `geo-db` 的 D1 实例。
- **环境变量**: 在 Pages 项目设置中添加 `OPENAI_API_KEY` 和 `DATABASE_URL`（如适用）。
- **绑定 D1**: 在 Pages 的 "Functions" 设置中手动绑定 D1 数据库。

### GitHub 侧配置
- **仓库权限**: 确保您的仓库已开启 Cloudflare Pages 的读取权限。

---
**如果您确认以上方案，请告诉我，我将开始执行准备工作。**
