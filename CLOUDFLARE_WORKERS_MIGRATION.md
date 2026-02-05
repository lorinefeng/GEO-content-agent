# GEO Content Agent - Cloudflare Workers 迁移任务

## 背景

当前项目架构：
- **前端**: Next.js 应用，已部署到 Cloudflare Pages ✅
- **后端**: FastAPI (Python)，位于 `/Users/karpsie/SkuGeo/api/`，**未部署** ❌

问题：Cloudflare Pages 只支持静态前端，无法运行 Python 后端。前端调用 `/api/*` 时返回错误。

## 目标

将 Python 后端逻辑迁移到 **Cloudflare Workers**（TypeScript），实现与 Pages 的无缝集成。

---

## 现有后端分析

### 核心 API 端点

| 端点 | 方法 | 功能 | 对应文件 |
|------|------|------|----------|
| `/api/generate` | POST | 调用 LLM 生成多策略内容 | `api/routers/generate.py` |
| `/api/articles` | GET/POST | 历史记录 CRUD | `api/routers/articles.py` |
| `/api/articles/{id}` | DELETE | 删除记录 | `api/routers/articles.py` |
| `/api/templates` | GET | 获取 Prompt 模板 | `api/routers/templates.py` |
| `/api/templates/{strategy}` | PUT | 更新模板 | `api/routers/templates.py` |

### 核心 Agent 逻辑

位于 `/Users/karpsie/SkuGeo/agents/`:
- `generate_content.py` - 评测对比型、用户画像型
- `generate_smzdm_content.py` - SMZDM 深度评测、短评测

这些 Agent 使用 `langchain_openai.ChatOpenAI` 调用 LLM API。

### 环境变量

```
OPENAI_API_KEY=xxx
OPENAI_BASE_URL=http://ai-api.applesay.cn/v1
OPENAI_MODEL=gemini-3-flash-preview
```

---

## 迁移方案

### Phase 1: 创建 Cloudflare Workers 项目

1. 在 `geo-content-app/` 下创建 `functions/` 目录（Pages Functions）
2. 或使用独立 Workers 项目（推荐用于复杂逻辑）

### Phase 2: 实现 API 端点

将 Python 逻辑改写为 TypeScript：

```
functions/
├── api/
│   ├── generate.ts      # POST /api/generate
│   ├── articles/
│   │   ├── index.ts     # GET/POST /api/articles
│   │   └── [id].ts      # DELETE /api/articles/:id
│   └── templates/
│       ├── index.ts     # GET /api/templates
│       └── [strategy].ts # PUT /api/templates/:strategy
```

### Phase 3: LLM 调用适配

在 Workers 中调用 OpenAI 兼容 API：
```typescript
const response = await fetch('http://ai-api.applesay.cn/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gemini-3-flash-preview',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3
  })
});
```

### Phase 4: 数据存储

历史记录和模板需要持久化存储，选项：
- **Cloudflare KV**: 简单键值存储，适合模板
- **Cloudflare D1**: SQLite 数据库，适合文章历史
- **外部数据库**: Supabase / PlanetScale

### Phase 5: 环境变量配置

在 Cloudflare Dashboard → Pages → Settings → Environment variables 中配置：
- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_MODEL`

---

## 关键 Prompt 模板

以下是需要迁移的核心 Prompt（摘自 Python Agent）：

### 评测对比型
```
你是一位专业的电商内容创作者。根据以下商品信息，撰写一篇评测对比型文章...
```

### 用户画像型
```
你是一位精通消费者心理的内容营销专家。根据商品信息，为不同用户画像撰写购物指南...
```

### SMZDM 深度评测 / 短评测
见 `generate_smzdm_content.py` 中的 Prompt 定义。

---

## 执行步骤清单

- [ ] 分析现有 Python Agent 的完整 Prompt 和逻辑
- [ ] 创建 `functions/` 目录结构
- [ ] 实现 `/api/generate` 端点（核心）
- [ ] 实现 `/api/articles` CRUD（使用 D1 或 KV）
- [ ] 实现 `/api/templates` 读写
- [ ] 配置 Cloudflare 环境变量
- [ ] 本地测试 (`wrangler pages dev`)
- [ ] 部署并验证

---

## 参考资源

- [Cloudflare Pages Functions 文档](https://developers.cloudflare.com/pages/functions/)
- [Cloudflare D1 数据库](https://developers.cloudflare.com/d1/)
- [Cloudflare KV 存储](https://developers.cloudflare.com/kv/)

---

## 注意事项

1. Workers 有 CPU 时间限制（免费版 10ms，付费版 50ms），LLM 调用需要使用 `waitUntil` 或 Durable Objects
2. 前端代码中 `API_BASE = '/api'` 无需修改，Pages Functions 会自动路由
3. 保留原有 FastAPI 代码作为参考，不要删除
