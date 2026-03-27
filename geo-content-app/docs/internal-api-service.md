# 内部服务接口说明

## 目标

为公司内部开发人员提供一套不依赖页面登录态的 Bearer Token API，用于：

- 调用内容生成
- 批量生成并可选直接入库
- 查询历史文章
- 管理模板
- 读取/编辑问题包
- 导出商品与问题包数据

## 鉴权

在 Cloudflare Pages / 本地环境配置以下任一变量：

- `INTERNAL_API_TOKEN`
- `INTERNAL_API_TOKENS`

其中 `INTERNAL_API_TOKENS` 支持逗号分隔多个 token。

请求头格式：

```http
Authorization: Bearer <your-token>
```

## 接口前缀

```text
/api/internal/v1
```

## 主要接口

### 策略

- `GET /api/internal/v1/strategies?mode=sku`
- `GET /api/internal/v1/strategies?mode=brand_ip`

### 生成

- `POST /api/internal/v1/generate`
- `POST /api/internal/v1/generate/batch`

单次生成支持：

- `save_articles: true|false`
- `mode: sku | brand_ip`
- `subject_id`
- `product` 或 `brand`
- `strategies`
- `competitor_info`
- `reference_images`

批量生成请求体：

```json
{
  "stop_on_error": false,
  "items": [
    {
      "save_articles": true,
      "mode": "sku",
      "product": {
        "name": "示例商品",
        "price": 299,
        "category": "连衣裙",
        "material": "棉",
        "color": "黑色",
        "description": "示例描述",
        "tags": ["通勤", "春季"]
      },
      "strategies": ["comparison", "persona"]
    }
  ]
}
```

### 文章

- `GET /api/internal/v1/articles?mode=sku&limit=50`
- `POST /api/internal/v1/articles`
- `GET /api/internal/v1/articles/:id`
- `PATCH /api/internal/v1/articles/:id`
- `DELETE /api/internal/v1/articles/:id`

### 模板

- `GET /api/internal/v1/templates?mode=sku`
- `PUT /api/internal/v1/templates/:strategy?mode=sku`
- `GET /api/internal/v1/templates/:strategy/revisions?mode=sku`
- `POST /api/internal/v1/templates/:strategy/rollback?mode=sku`

### 问题包

- `GET /api/internal/v1/question-packages`
- `GET /api/internal/v1/question-packages/:id`
- `PATCH /api/internal/v1/question-packages/:id`
- `GET /api/internal/v1/question-packages/:id/export`
- `POST /api/internal/v1/question-packages/export`

### 导出

- `GET /api/internal/v1/exports/product?product_id=...`
- `POST /api/internal/v1/exports/products`

## 请求示例

### 1. 生成并直接入库

```bash
curl -X POST 'https://geo-content-agent.pages.dev/api/internal/v1/generate' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "save_articles": true,
    "mode": "sku",
    "product": {
      "name": "法式黑色连衣裙",
      "price": 299,
      "category": "连衣裙",
      "material": "棉",
      "color": "黑色",
      "description": "通勤场景女装",
      "tags": ["通勤", "春季"]
    },
    "strategies": ["comparison", "persona"]
  }'
```

### 2. 批量生成

```bash
curl -X POST 'https://geo-content-agent.pages.dev/api/internal/v1/generate/batch' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d @batch-generate.json
```

### 3. 拉取历史文章

```bash
curl 'https://geo-content-agent.pages.dev/api/internal/v1/articles?mode=sku&limit=20' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

### 4. 修改文章发布地址

```bash
curl -X PATCH 'https://geo-content-agent.pages.dev/api/internal/v1/articles/ARTICLE_ID' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "published_url": "https://www.sohu.com/a/123456789_123456789"
  }'
```

### 5. 批量导出商品

```bash
curl -X POST 'https://geo-content-agent.pages.dev/api/internal/v1/exports/products' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "product_ids": ["sku-001", "sku-002"]
  }'
```

## D1 导出

```bash
npm run d1:export:remote
```

导出结果会写入：

```text
backups/d1/<timestamp>/
```

包含：

- `geo-db.full.sql`
- `geo-db.schema.sql`
- `geo-db.data.sql`

## 阿里云迁移准备

参考：

- `scripts/aliyun-migration/README.md`
- `scripts/aliyun-migration/mysql-schema.placeholder.sql`
