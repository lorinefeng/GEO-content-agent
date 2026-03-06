# SKU 问题设计模块实施方案

## 目标

在 `SKU` 内容生成模式下，为每一篇新生成并入库的文章自动产出一份“问题包 JSON”，用于后续 GEO 检测前后对比。

核心原则：

1. 一篇文章对应一个问题包。
2. 同一 SKU 不同策略文章各自拥有独立问题包。
3. 问题设计页按同一 `SKU(product_id)` 树状归档展示。
4. 问题包支持页面内编辑，修改后自动覆盖数据库中的最新 JSON。
5. 单条导出导出该问题包 JSON；批量导出导出所选问题包 JSON 数组。
6. 本次仅覆盖 `SKU` 模式，不处理品牌 IP。

## 自动触发链路

1. 内容生成页调用 `/api/generate` 获取文章内容。
2. 前端调用 `/api/articles` 落库文章。
3. `/api/articles` 在 `mode = 'sku'` 时自动唤起问题设计 Agent。
4. Agent 读取：
   - 原始 SKU 输入信息
   - 原始导入 JSON（如存在）
   - 当前文章策略
   - 最新文章正文
5. 问题包写入 `QuestionPackage` 表。

## 数据表

新增 `QuestionPackage`：

- `id`
- `article_id`（唯一，一篇文章一个问题包）
- `mode`
- `product_id`
- `product_name`
- `strategy`
- `strategy_name`
- `status`（`generated` / `fallback` / `edited`）
- `error_message`
- `package_json`
- `created_at`
- `updated_at`

## JSON Schema

问题包统一输出以下结构：

```json
{
  "version": "sku-question-package-v1",
  "mode": "sku",
  "article_id": "uuid",
  "product_id": "uuid",
  "product_name": "商品名",
  "strategy": "comparison",
  "strategy_name": "评测对比型",
  "keywords": [
    {
      "keyword": "春季牛仔夹克",
      "bucket": "category"
    }
  ],
  "questions": {
    "coarse": [
      {
        "id": "coarse_1",
        "question": "今年春季有哪些值得关注的牛仔夹克新品？",
        "intent": "观察 AI 在品类层面的新品召回表现",
        "expected_signal": "可能同时出现目标商品和竞品"
      }
    ],
    "medium": [],
    "fine": []
  },
  "generated_at": "2026-03-06T12:00:00+08:00",
  "updated_at": "2026-03-06T12:00:00+08:00"
}
```

## 生成约束

问题设计 Agent 必须遵守：

1. 只输出单个 JSON 对象，不输出 Markdown、说明文字或代码块。
2. `keywords` 总量控制在 `5-8` 个，并标注 `bucket`：
   - `category`
   - `feature`
   - `price`
   - `persona`
   - `brand`
3. `coarse` 输出 `2-3` 个问题。
4. `medium` 输出 `4-5` 个问题。
5. `fine` 输出 `2-3` 个问题。
6. `coarse` 与 `medium` 默认避免直接点完整商品名。
7. `fine` 允许出现品牌名、价格、上架时间、品类等更具体事实。
8. 问题必须像真实用户会提问的话，不能出现内部评估口吻。
9. 问题集合必须覆盖：
   - 品类发现
   - 价格带筛选
   - 用户画像/场景匹配
   - 具体商品识别

## 页面设计

新增左侧导航：`问题设计`

页面能力：

1. 按 `product_id` 树状展示：
   - 根节点：同一 SKU
   - 子节点：该 SKU 下各策略文章对应的问题包
2. 支持搜索商品名 / 策略名。
3. 支持单条导出 JSON。
4. 支持多选后批量导出 JSON 数组。
5. 支持打开详情并直接编辑 JSON。
6. 编辑采用自动保存；仅在 JSON 合法时覆盖数据库。

## 容错

若模型输出 JSON 不合法或生成失败：

1. 系统用规则模板生成一份 `fallback` 问题包，保证链路不断。
2. `status = fallback`
3. `error_message` 保存失败原因摘要，便于后续排查。

