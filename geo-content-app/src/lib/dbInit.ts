import { getD1Database } from '@/lib/cloudflare';
import type { D1Database } from '@cloudflare/workers-types';

const DEFAULT_TEMPLATES: Array<{ strategy: string; name: string; prompt: string }> = [
  {
    strategy: 'comparison',
    name: '评测对比型',
    prompt: `你是一位专业的时尚评测博主，请基于以下商品信息和竞品资料，撰写一篇专业的评测对比文章。

## 商品信息
- 商品名称：{product_name}
- 价格：¥{price}
- 材质：{material}
- 颜色：{color}
- 描述：{description}
- 品类：{category}
- 标签：{tags}

## 竞品市场信息
{competitor_info}

## 写作要求
1. 文章标题需包含商品名称和“评测”“对比”等关键词
2. 必须包含规格对比表格（与优衣库、H&M同类产品对比）
3. 详细分析材质工艺和技术特点
4. 提供客观的优缺点分析
5. 给出明确的购买建议和适用人群
6. 添加常见问题FAQ（至少3个问题）
7. 文章结构清晰，使用Markdown格式
8. 内容信息密度高、逻辑清晰，适合被AI大模型引用

请直接输出完整文章内容。`,
  },
  {
    strategy: 'persona',
    name: '用户画像匹配型',
    prompt: `你是一位懂时尚的购物博主，请基于以下商品信息，撰写一篇实用的购物指南文章，帮助特定用户群体做出购买决策。

## 商品信息
- 商品名称：{product_name}
- 价格：¥{price}
- 材质：{material}
- 颜色：{color}
- 描述：{description}
- 品类：{category}
- 标签：{tags}

## 用户画像分析
{persona_analysis}

## 写作要求
1. 标题吸引目标用户，包含场景词（如“通勤”“约会”“日常”）
2. 开篇描述目标用户的穿搭痛点和需求
3. 详细介绍商品如何满足这些需求
4. 提供3-5套具体的搭配方案（含颜色/鞋包/场景建议）
5. 说明适合什么场合、什么季节穿着
6. 真诚分享购买建议（是否值得入手）
7. 文章温暖亲切，像朋友推荐一样
8. 使用Markdown格式，适当使用emoji增强可读性

请直接输出完整文章内容。`,
  },
  {
    strategy: 'smzdm_review',
    name: '什么值得买深度评测',
    prompt: `你是一位资深的什么值得买(SMZDM)平台创作者，请基于以下商品信息撰写一篇符合平台用户(值友)偏好的高质量文章。

## 什么值得买平台内容风格指南

### 标题写作特征
1. 数字驱动：必须包含具象数字（如“4招”“7个缺点”“直降1/3”）
2. 情绪词汇：使用“别急”“离谱”“太坑了”“别乱买”等警示词
3. 利益导向：直接点出核心收益（“省钱”“低价”“值不值”）
4. 交互提问：通过提问引导评论（“这买卖值吗？”“大家觉得呢？”）

### 内容结构模式
攻略/干货型：
1. 痛点引入 → 核心论点(3-5点) → 案例数据 → 总结建议

评测/对比型：
1. 开箱外观 → 核心参数实测 → 使用场景 → 优缺点总结

### 流量规律
- 极高信息密度，数据详细、逻辑清晰
- 第一人称“我的实测”增强真实感
- 图文配比高（每200-300字配一张图）
- 分类标签精准（#老用户回馈、#实测体验）

## 商品信息
- 商品名称：{product_name}
- 品牌：Zara
- 价格：¥{price}
- 材质：{material}
- 颜色：{color}
- 描述：{description}
- 品类：{category}
- 标签：{tags}

## 竞品参考信息
{competitor_info}

## 写作要求
1. 标题：必须包含数字+情绪词+利益点（示例：{product_name}我穿了2周，告诉你5个买前必知的真相！）
2. 正文结构：开头第一人称购买动机与痛点；正文分点论述（3-5个观点）并给出具体数据/体验；与竞品（优衣库、H&M）做价格/材质对比；列出红黑榜；结尾给出明确结论“值不值得买”
3. 语言风格：口语化、亲切感，像朋友分享；使用“实测”“亲身体验”“真实感受”等词；可适当使用emoji增强可读性
4. 信息密度：包含具体数据（价格对比、材质成分、尺码建议等）
5. 互动引导：文末邀请值友评论讨论

请输出完整文章（约1500-2000字）。`,
  },
  {
    strategy: 'smzdm_short',
    name: '什么值得买短评测',
    prompt: `你是什么值得买平台的活跃创作者，请为以下新品撰写一篇“好物分享”风格的短评测。

## 商品信息
- 商品名称：{product_name}
- 价格：¥{price}
- 材质：{material}
- 颜色：{color}
- 描述：{description}
- 标签：{tags}

## 平台风格
- 标题要吸睛：包含价格数字+“值不值”争议点
- 正文简洁有力：500-800字
- 结构：购买理由→上身效果→3个优点+1个缺点→是否推荐
- 语气：真诚、不做作、像朋友推荐

## 示例标题风格
- “{price}买{product_name}，收到后我愣住了…值不值自己看！”
- “{product_name}实测：这3点打动我，但有1个坑要避”

请输出完整文章。`,
  },
];

export async function ensureDatabaseReady(db?: D1Database) {
  const database = db ?? getD1Database();

  await database
    .prepare(
      `CREATE TABLE IF NOT EXISTS Article (
        id TEXT PRIMARY KEY,
        product_name TEXT NOT NULL,
        product_price REAL NOT NULL,
        strategy TEXT NOT NULL,
        strategy_name TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      )`
    )
    .run();
  await database.prepare('CREATE INDEX IF NOT EXISTS idx_article_strategy ON Article(strategy)').run();
  await database.prepare('CREATE INDEX IF NOT EXISTS idx_article_created_at ON Article(created_at DESC)').run();

  await database
    .prepare(
      `CREATE TABLE IF NOT EXISTS Template (
        strategy TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        prompt TEXT NOT NULL
      )`
    )
    .run();

  await database
    .prepare(
      `CREATE TABLE IF NOT EXISTS TemplateRevision (
        id TEXT PRIMARY KEY,
        strategy TEXT NOT NULL,
        name TEXT NOT NULL,
        prompt TEXT NOT NULL,
        changed_at TEXT DEFAULT (datetime('now')),
        changed_by TEXT
      )`
    )
    .run();
  await database.prepare('CREATE INDEX IF NOT EXISTS idx_template_revision_strategy ON TemplateRevision(strategy)').run();
  await database.prepare('CREATE INDEX IF NOT EXISTS idx_template_revision_changed_at ON TemplateRevision(changed_at DESC)').run();

  await database
    .prepare(
      `CREATE TABLE IF NOT EXISTS User (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      )`
    )
    .run();

  await database
    .prepare(
      `CREATE TABLE IF NOT EXISTS RegistrationRequest (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        status TEXT NOT NULL,
        requested_at TEXT DEFAULT (datetime('now')),
        decided_at TEXT,
        decided_by TEXT
      )`
    )
    .run();
  await database.prepare('CREATE INDEX IF NOT EXISTS idx_registration_status ON RegistrationRequest(status)').run();

  const templateCountRow = (await database.prepare('SELECT COUNT(1) as cnt FROM Template').first()) as { cnt?: unknown } | null;
  const count = templateCountRow && typeof templateCountRow.cnt === 'number' ? templateCountRow.cnt : 0;
  if (count === 0) {
    for (const t of DEFAULT_TEMPLATES) {
      await database
        .prepare('INSERT OR REPLACE INTO Template (strategy, name, prompt) VALUES (?, ?, ?)')
        .bind(t.strategy, t.name, t.prompt)
        .run();
    }
  }

  return database;
}

