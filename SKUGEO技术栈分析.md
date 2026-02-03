# 🚀 SKUGEO 技术栈分析

## 📦 核心框架

| 技术 | 版本 | 用途 |
|------|------|------|
| **Next.js** | 14.2.35 | 全栈框架 (App Router) |
| **React** | 18.x | UI 构建库 |
| **TypeScript** | 5.x | 类型安全 |

## 🎨 UI 与样式系统

| 技术 | 版本 | 用途 |
|------|------|------|
| **Ant Design** | 6.2.2 | 企业级 UI 组件库 |
| **@ant-design/nextjs-registry** | 1.3.0 | Next.js 服务端渲染集成 |
| **Tailwind CSS** | 3.4.1 | 原子化 CSS 框架 |

**主题特色**：采用赛博朋克风格设计，包含自定义霓虹色系（`neon-cyan`、`neon-pink`、`neon-purple`）和深空背景色（`void`、`deep-space`、`nebula`），支持暗黑模式。

## 🗄️ 数据层

| 技术 | 版本 | 用途 |
|------|------|------|
| **Prisma** | 5.22.0 | 类型安全的 ORM |
| **SQLite** | - | 轻量级关系数据库 |

**数据模型设计**：
```
User ─┬─ Post ─┬─ Category
      │        ├─ Tag (多对多)
      │        ├─ Comment (支持嵌套回复)
      │        ├─ Like
      │        └─ Favorite
```

## 🔐 认证与安全

| 技术 | 版本 | 用途 |
|------|------|------|
| **NextAuth.js** | 4.24.13 | 身份认证框架 |
| **bcryptjs** | 3.0.3 | 密码哈希加密 |

## 📝 内容渲染

| 技术 | 版本 | 用途 |
|------|------|------|
| **react-markdown** | 10.1.0 | Markdown 渲染 |
| **remark-gfm** | 4.0.1 | GitHub 风格 Markdown 支持 |
| **rehype-highlight** | 7.0.2 | 代码语法高亮集成 |
| **highlight.js** | 11.11.1 | 代码语法高亮引擎 |

## 🛠️ 开发工具链

| 工具 | 用途 |
|------|------|
| **ESLint** | 代码规范检查 |
| **PostCSS** | CSS 后处理 |
| **tsx** | TypeScript 脚本执行器 |
| **Prisma Studio** | 可视化数据库管理 |

## 📁 项目架构

```
src/
├── app/                    # Next.js App Router 页面
│   ├── api/               # RESTful API 路由
│   │   ├── auth/          # 认证接口
│   │   ├── posts/         # 文章 CRUD + 互动
│   │   └── categories/    # 分类管理
│   ├── auth/              # 登录/注册页面
│   ├── posts/             # 文章相关页面
│   └── search/            # 搜索功能
├── components/            # React 组件
│   ├── layout/            # 布局组件 (Header/Footer)
│   ├── providers/         # 上下文提供者
│   └── post/              # 文章交互组件
└── lib/                   # 工具库 (Prisma/Auth)
```

## 🎯 技术亮点

1. **全栈一体化**：前后端统一使用 TypeScript，API 路由与页面共享类型定义
2. **类型安全数据层**：Prisma 自动生成类型，数据库操作零运行时错误
3. **现代化样式方案**：Tailwind CSS + Ant Design 混合使用，兼顾效率与美观
4. **Markdown 富文本**：支持 GFM 语法 + 代码高亮，适合技术内容创作
5. **渐进式数据库**：SQLite 开发便捷，可无缝切换至 PostgreSQL/MySQL

---

*这是一个典型的现代 Next.js 全栈应用，适合构建内容管理、社区分享类产品，技术选型成熟稳定。*
