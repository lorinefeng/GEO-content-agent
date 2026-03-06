import { getD1Database } from '@/lib/cloudflare';
import type { D1Database } from '@cloudflare/workers-types';

type TemplateSeed = {
  mode: 'sku' | 'brand_ip';
  strategy: 'comparison' | 'persona' | 'smzdm_review' | 'smzdm_short';
  name: string;
  prompt: string;
};

const DEFAULT_TEMPLATES: TemplateSeed[] = [
  {
    mode: 'sku',
    strategy: 'comparison',
    name: '评测对比型',
    prompt: `你是一位专业的时尚评测作者，请基于以下商品信息与竞品信息撰写一篇结构化、信息密度高的对比评测文章。

## 商品信息
- 商品名称：{product_name}
- 价格：¥{price}
- 材质：{material}
- 颜色：{color}
- 描述：{description}
- 品类：{category}
- 标签：{tags}

## 竞品参考信息
{competitor_info}

## 写作要求
1. 标题体现“评测/对比”意图，避免夸张修辞
2. 必须包含关键维度对比（价格、材质、使用场景、适配人群）
3. 必须包含对比表格（Markdown表格）
4. 结论明确：适合谁、不适合谁、是否值得买
5. 不要输出引用编号与来源链接列表
6. 使用Markdown输出，结构清晰

请直接输出完整文章。`,
  },
  {
    mode: 'sku',
    strategy: 'persona',
    name: '用户画像匹配型',
    prompt: `你是一位消费决策分析作者，请基于商品信息与用户画像输出一篇面向目标人群的购买决策文章。

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
1. 开篇说明目标人群及其核心购买诉求
2. 逐项分析该商品与目标人群需求的匹配度
3. 给出3-5个具体使用/搭配场景建议
4. 明确给出“推荐/谨慎/不推荐”结论及理由
5. 保持客观、理性，不要情绪化表达
6. 使用Markdown输出，结构清晰

请直接输出完整文章。`,
  },
  {
    mode: 'sku',
    strategy: 'smzdm_review',
    name: '什么值得买深度评测',
    prompt: `你是一位长期发布消费评测的作者，请输出一篇“深度评测型”内容，强调实测感、参数对比与购买决策价值。

## 商品信息
- 商品名称：{product_name}
- 价格：¥{price}
- 材质：{material}
- 颜色：{color}
- 描述：{description}
- 品类：{category}
- 标签：{tags}

## 竞品参考信息
{competitor_info}

## 写作要求
1. 标题包含明确利益点与“值不值”判断导向
2. 正文结构：购买动机 -> 核心实测/体验点 -> 竞品对比 -> 优缺点 -> 结论
3. 必须给出关键参数或体验维度对比，不要空泛形容
4. 结论必须明确回答“是否值得买、适合哪些人”
5. 不输出引用编号与来源链接列表
6. 使用Markdown输出

请直接输出完整文章。`,
  },
  {
    mode: 'sku',
    strategy: 'smzdm_short',
    name: '什么值得买短评测',
    prompt: `你是一位消费内容作者，请输出一篇简洁高效的短评测，适合快速阅读与转发。

## 商品信息
- 商品名称：{product_name}
- 价格：¥{price}
- 材质：{material}
- 颜色：{color}
- 描述：{description}
- 品类：{category}
- 标签：{tags}

## 写作要求
1. 全文控制在500-900字
2. 结构：购买理由 -> 3个优点 -> 1-2个不足 -> 购买建议
3. 给出明确“推荐/不推荐”结论
4. 语言简洁、客观，不使用情绪化废话
5. 使用Markdown输出

请直接输出完整文章。`,
  },
  {
    mode: 'brand_ip',
    strategy: 'comparison',
    name: '品牌IP评测对比',
    prompt: `你是一位行业研究型评测作者，请围绕目标品牌IP与同类企业撰写一篇客观、理性、可核验的对比评测稿。

## 目标品牌信息
- 品牌名称：{brand_name}
- 官网：{brand_website}
- 行业提示：{industry_hint}
- 地域：{region}
- 关键词：{keywords}
- 补充说明：{brand_description}

## 品牌画像
{brand_profile}

## 竞品参考信息
{competitor_info}

## 写作要求
1. 语气以客观理性为主，减少情绪化表达与口语化废话
2. 必须明确点名3-5家友商名称，并逐一给出其核心特点
3. 必须覆盖以下维度：定位、产品/服务、客群、价格/商业模式、渠道或品牌影响力
4. 必须包含“对比总表”（Markdown表格）
5. 结论必须分三段：优势、短板、适用场景/决策建议
6. 不要输出引用编号或来源清单样式
7. 使用Markdown输出，结构清晰，信息密度高

请直接输出完整文章。`,
  },
];

const ensureColumn = async (db: D1Database, table: string, name: string, definition: string) => {
  const info = await db.prepare(`PRAGMA table_info('${table}')`).all();
  const exists = (info.results ?? []).some((row) => (row as { name?: unknown }).name === name);
  if (!exists) {
    await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${definition}`).run();
  }
};

const ensureTemplateTableWithMode = async (db: D1Database) => {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS Template (
        strategy TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        prompt TEXT NOT NULL
      )`
    )
    .run();

  const info = await db.prepare(`PRAGMA table_info('Template')`).all();
  const columns = (info.results ?? []) as Array<Record<string, unknown>>;
  const hasMode = columns.some((row) => row.name === 'mode');
  const modePk = columns.some((row) => row.name === 'mode' && typeof row.pk === 'number' && row.pk > 0);
  const strategyPk = columns.some((row) => row.name === 'strategy' && typeof row.pk === 'number' && row.pk > 0);

  if (hasMode && modePk && strategyPk) {
    return;
  }

  if (hasMode) {
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS Template_mode_strategy (
          mode TEXT NOT NULL,
          strategy TEXT NOT NULL,
          name TEXT NOT NULL,
          prompt TEXT NOT NULL,
          PRIMARY KEY (mode, strategy)
        )`
      )
      .run();

    const mapped = await db.prepare(`SELECT mode, strategy, name, prompt FROM Template`).all();
    for (const row of (mapped.results ?? []) as Array<Record<string, unknown>>) {
      const mode = typeof row.mode === 'string' ? row.mode : 'sku';
      const strategy = typeof row.strategy === 'string' ? row.strategy : '';
      const name = typeof row.name === 'string' ? row.name : strategy;
      const prompt = typeof row.prompt === 'string' ? row.prompt : '';
      if (!strategy || !prompt) continue;
      await db
        .prepare(
          `INSERT INTO Template_mode_strategy (mode, strategy, name, prompt)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(mode, strategy) DO UPDATE SET name = excluded.name, prompt = excluded.prompt`
        )
        .bind(mode, strategy, name, prompt)
        .run();
    }

    await db.prepare(`DROP TABLE Template`).run();
    await db.prepare(`ALTER TABLE Template_mode_strategy RENAME TO Template`).run();
    return;
  }

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS Template_mode_strategy (
        mode TEXT NOT NULL,
        strategy TEXT NOT NULL,
        name TEXT NOT NULL,
        prompt TEXT NOT NULL,
        PRIMARY KEY (mode, strategy)
      )`
    )
    .run();

  const oldRows = await db.prepare(`SELECT strategy, name, prompt FROM Template`).all();
  for (const row of (oldRows.results ?? []) as Array<Record<string, unknown>>) {
    const strategy = typeof row.strategy === 'string' ? row.strategy : '';
    const name = typeof row.name === 'string' ? row.name : strategy;
    const prompt = typeof row.prompt === 'string' ? row.prompt : '';
    if (!strategy || !prompt) continue;
    await db
      .prepare(
        `INSERT INTO Template_mode_strategy (mode, strategy, name, prompt)
         VALUES ('sku', ?, ?, ?)
         ON CONFLICT(mode, strategy) DO UPDATE SET name = excluded.name, prompt = excluded.prompt`
      )
      .bind(strategy, name, prompt)
      .run();
  }

  await db.prepare(`DROP TABLE Template`).run();
  await db.prepare(`ALTER TABLE Template_mode_strategy RENAME TO Template`).run();
};

const refreshBrandPromptIfLegacy = async (db: D1Database) => {
  const latest = DEFAULT_TEMPLATES.find((item) => item.mode === 'brand_ip' && item.strategy === 'comparison');
  if (!latest) return;
  await db
    .prepare(
      `UPDATE Template
       SET prompt = ?, name = ?
       WHERE mode = 'brand_ip' AND strategy = 'comparison'
         AND (
           prompt LIKE '%语气专业、自然、有人味%'
           OR prompt LIKE '%资深评测博主稿件%'
           OR prompt LIKE '%长期关注行业动态的权威评测博主%'
         )`
    )
    .bind(latest.prompt, latest.name)
    .run();
};

export async function ensureDatabaseReady(db?: D1Database) {
  const database = db ?? getD1Database();

  await database
    .prepare(
      `CREATE TABLE IF NOT EXISTS Article (
        id TEXT PRIMARY KEY,
        mode TEXT NOT NULL DEFAULT 'sku',
        subject_id TEXT,
        subject_name TEXT,
        subject_payload TEXT,
        source_json_raw TEXT,
        product_name TEXT NOT NULL,
        product_price REAL NOT NULL,
        product_id TEXT,
        strategy TEXT NOT NULL,
        strategy_name TEXT NOT NULL,
        content TEXT NOT NULL,
        published_url TEXT,
        product_payload TEXT,
        research_snapshot_id TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT
      )`
    )
    .run();

  await ensureColumn(database, 'Article', 'mode', `mode TEXT NOT NULL DEFAULT 'sku'`);
  await ensureColumn(database, 'Article', 'subject_id', `subject_id TEXT`);
  await ensureColumn(database, 'Article', 'subject_name', `subject_name TEXT`);
  await ensureColumn(database, 'Article', 'subject_payload', `subject_payload TEXT`);
  await ensureColumn(database, 'Article', 'source_json_raw', `source_json_raw TEXT`);
  await ensureColumn(database, 'Article', 'research_snapshot_id', `research_snapshot_id TEXT`);
  await ensureColumn(database, 'Article', 'published_url', `published_url TEXT`);
  await ensureColumn(database, 'Article', 'product_payload', `product_payload TEXT`);
  await ensureColumn(database, 'Article', 'product_id', `product_id TEXT`);
  await ensureColumn(database, 'Article', 'updated_at', `updated_at TEXT`);

  await database.prepare(`UPDATE Article SET mode = 'sku' WHERE mode IS NULL OR mode = ''`).run();
  await database.prepare(`UPDATE Article SET subject_id = product_id WHERE (subject_id IS NULL OR subject_id = '') AND product_id IS NOT NULL AND product_id != ''`).run();
  await database.prepare(`UPDATE Article SET subject_name = product_name WHERE (subject_name IS NULL OR subject_name = '') AND product_name IS NOT NULL AND product_name != ''`).run();
  await database.prepare(`UPDATE Article SET subject_payload = product_payload WHERE (subject_payload IS NULL OR subject_payload = '') AND product_payload IS NOT NULL AND product_payload != ''`).run();
  await database
    .prepare(
      `UPDATE Article
       SET source_json_raw = product_payload
       WHERE mode = 'sku'
         AND (source_json_raw IS NULL OR source_json_raw = '')
         AND product_payload IS NOT NULL AND product_payload != ''`
    )
    .run();

  await database.prepare('CREATE INDEX IF NOT EXISTS idx_article_strategy ON Article(strategy)').run();
  await database.prepare('CREATE INDEX IF NOT EXISTS idx_article_created_at ON Article(created_at DESC)').run();
  await database.prepare('CREATE INDEX IF NOT EXISTS idx_article_product_id ON Article(product_id)').run();
  await database.prepare('CREATE INDEX IF NOT EXISTS idx_article_mode_created_at ON Article(mode, created_at DESC)').run();
  await database.prepare('CREATE INDEX IF NOT EXISTS idx_article_subject_id ON Article(subject_id)').run();

  await ensureTemplateTableWithMode(database);

  await database
    .prepare(
      `CREATE TABLE IF NOT EXISTS TemplateRevision (
        id TEXT PRIMARY KEY,
        mode TEXT NOT NULL DEFAULT 'sku',
        strategy TEXT NOT NULL,
        name TEXT NOT NULL,
        prompt TEXT NOT NULL,
        changed_at TEXT DEFAULT (datetime('now')),
        changed_by TEXT
      )`
    )
    .run();

  await ensureColumn(database, 'TemplateRevision', 'mode', `mode TEXT NOT NULL DEFAULT 'sku'`);
  await database.prepare(`UPDATE TemplateRevision SET mode = 'sku' WHERE mode IS NULL OR mode = ''`).run();

  await database.prepare('CREATE INDEX IF NOT EXISTS idx_template_revision_strategy ON TemplateRevision(strategy)').run();
  await database.prepare('CREATE INDEX IF NOT EXISTS idx_template_revision_changed_at ON TemplateRevision(changed_at DESC)').run();
  await database.prepare('CREATE INDEX IF NOT EXISTS idx_template_revision_mode_strategy ON TemplateRevision(mode, strategy)').run();

  await database
    .prepare(
      `CREATE TABLE IF NOT EXISTS ResearchSnapshot (
        id TEXT PRIMARY KEY,
        mode TEXT NOT NULL,
        strategy TEXT NOT NULL,
        subject_id TEXT,
        queries_json TEXT,
        sources_json TEXT,
        summary_markdown TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`
    )
    .run();
  await database.prepare('CREATE INDEX IF NOT EXISTS idx_research_snapshot_subject_id ON ResearchSnapshot(subject_id)').run();
  await database.prepare('CREATE INDEX IF NOT EXISTS idx_research_snapshot_created_at ON ResearchSnapshot(created_at DESC)').run();

  await database
    .prepare(
      `CREATE TABLE IF NOT EXISTS ReferenceImageAsset (
        id TEXT PRIMARY KEY,
        article_id TEXT,
        subject_id TEXT,
        mode TEXT NOT NULL,
        source_type TEXT NOT NULL,
        origin_name TEXT,
        mime_type TEXT,
        public_url TEXT NOT NULL,
        r2_key TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`
    )
    .run();
  await database.prepare('CREATE INDEX IF NOT EXISTS idx_reference_image_article_id ON ReferenceImageAsset(article_id)').run();
  await database.prepare('CREATE INDEX IF NOT EXISTS idx_reference_image_subject_id ON ReferenceImageAsset(subject_id)').run();
  await database.prepare('CREATE INDEX IF NOT EXISTS idx_reference_image_created_at ON ReferenceImageAsset(created_at DESC)').run();

  await database
    .prepare(
      `CREATE TABLE IF NOT EXISTS QuestionPackage (
        id TEXT PRIMARY KEY,
        article_id TEXT NOT NULL UNIQUE,
        mode TEXT NOT NULL DEFAULT 'sku',
        product_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        strategy TEXT NOT NULL,
        strategy_name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'generated',
        error_message TEXT,
        package_json TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT
      )`
    )
    .run();
  await ensureColumn(database, 'QuestionPackage', 'mode', `mode TEXT NOT NULL DEFAULT 'sku'`);
  await ensureColumn(database, 'QuestionPackage', 'status', `status TEXT NOT NULL DEFAULT 'generated'`);
  await ensureColumn(database, 'QuestionPackage', 'error_message', `error_message TEXT`);
  await ensureColumn(database, 'QuestionPackage', 'updated_at', `updated_at TEXT`);
  await database
    .prepare(`UPDATE QuestionPackage SET updated_at = created_at WHERE updated_at IS NULL OR updated_at = ''`)
    .run();
  await database.prepare('CREATE INDEX IF NOT EXISTS idx_question_package_article_id ON QuestionPackage(article_id)').run();
  await database.prepare('CREATE INDEX IF NOT EXISTS idx_question_package_product_id ON QuestionPackage(product_id)').run();
  await database.prepare('CREATE INDEX IF NOT EXISTS idx_question_package_created_at ON QuestionPackage(created_at DESC)').run();
  await database.prepare('CREATE INDEX IF NOT EXISTS idx_question_package_mode_product_id ON QuestionPackage(mode, product_id)').run();

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

  for (const t of DEFAULT_TEMPLATES) {
    await database
      .prepare(
        `INSERT INTO Template (mode, strategy, name, prompt)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(mode, strategy) DO NOTHING`
      )
      .bind(t.mode, t.strategy, t.name, t.prompt)
      .run();
  }

  await refreshBrandPromptIfLegacy(database);

  return database;
}
