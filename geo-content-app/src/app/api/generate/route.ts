import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getCloudflareEnv, getD1Database } from '@/lib/cloudflare';
import { ensureDatabaseReady } from '@/lib/dbInit';
import { getActiveUser, unauthorized } from '@/lib/apiAuth';
import { buildSkuCompetitorResearch, type ResearchProcessStep } from '@/lib/research/skuCompetitorResearch';
import { buildBrandCompetitorResearch } from '@/lib/research/brandCompetitorResearch';

export const runtime = 'edge';

type ContentMode = 'sku' | 'brand_ip';

const SUPPORTED_STRATEGIES = ['comparison'] as const;
type SupportedStrategy = (typeof SUPPORTED_STRATEGIES)[number];

const DEFAULT_SKU_COMPETITOR_INFO = `
请基于公开市场常见同类商品，围绕价格带、材质与使用场景进行对比分析。
建议对比同价位与高一档价位产品，并给出客观结论。
`;

const DEFAULT_BRAND_COMPETITOR_INFO = `
请基于公开市场常见同类企业，围绕品牌定位、产品/服务、客群与竞争力进行对比分析。
建议选择3-5家中国市场相关竞争者并给出客观结论。
`;

function parseMode(raw: unknown): ContentMode {
  return raw === 'brand_ip' ? 'brand_ip' : 'sku';
}

function replacePlaceholders(template: string, vars: Record<string, string>) {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_m, key: string) => (key in vars ? vars[key] : `{${key}}`));
}

function parseStrategies(input: unknown): SupportedStrategy[] {
  if (!Array.isArray(input)) return [];
  const values = input.filter((s): s is string => typeof s === 'string');
  const supported = new Set<string>(SUPPORTED_STRATEGIES);
  const out = values.filter((s): s is SupportedStrategy => supported.has(s));
  return Array.from(new Set(out));
}

export async function POST(req: NextRequest) {
  const user = await getActiveUser(req);
  if (!user) return unauthorized();

  const env = getCloudflareEnv();
  const apiKey = env.OPENAI_API_KEY;
  const baseURL = env.OPENAI_BASE_URL;
  const model =
    typeof env.OPENAI_MODEL === 'string' && env.OPENAI_MODEL ? env.OPENAI_MODEL : 'gemini-3-flash-preview';

  if (!apiKey) {
    return NextResponse.json({ error: '缺少 OPENAI_API_KEY 环境变量' }, { status: 500 });
  }

  const openai = new OpenAI({ apiKey, baseURL });

  try {
    const body = (await req.json()) as {
      mode?: unknown;
      subject_id?: unknown;
      product?: unknown;
      brand?: unknown;
      strategies?: unknown;
      competitor_info?: unknown;
    };

    const mode = parseMode(body.mode);
    const strategies = parseStrategies(body.strategies);
    const competitor_info = typeof body.competitor_info === 'string' ? body.competitor_info : undefined;

    if (strategies.length === 0) {
      return NextResponse.json({ error: '参数不合法：至少选择一种有效策略（comparison）' }, { status: 400 });
    }

    const db = await ensureDatabaseReady(getD1Database());
    const placeholders = strategies.map(() => '?').join(', ');
    const templateRows = await db
      .prepare(`SELECT mode, strategy, name, prompt FROM Template WHERE mode = ? AND strategy IN (${placeholders})`)
      .bind(mode, ...strategies)
      .all();

    const templateMap = new Map<string, { name: string; prompt: string }>();
    for (const row of (templateRows?.results ?? []) as Array<Record<string, unknown>>) {
      const strategyId = typeof row.strategy === 'string' ? row.strategy : '';
      if (!strategyId) continue;
      const name = typeof row.name === 'string' ? row.name : strategyId;
      const prompt = typeof row.prompt === 'string' ? row.prompt : '';
      if (prompt) templateMap.set(strategyId, { name, prompt });
    }

    const articles: Array<{ mode: ContentMode; strategy: SupportedStrategy; strategy_name: string; content: string }> = [];
    const errors: string[] = [];
    let process: ResearchProcessStep[] = [];
    let research_meta: Record<string, unknown> | undefined;
    let research_snapshot_id: string | undefined;

    if (mode === 'sku') {
      const product =
        body.product && typeof body.product === 'object' ? (body.product as Record<string, unknown>) : undefined;
      const productName = typeof product?.name === 'string' ? product.name.trim() : '';
      const productPriceRaw = product?.price;
      const productPrice =
        typeof productPriceRaw === 'number'
          ? productPriceRaw
          : typeof productPriceRaw === 'string'
            ? Number.parseFloat(productPriceRaw)
            : NaN;

      if (!productName || !Number.isFinite(productPrice)) {
        return NextResponse.json({ error: 'SKU模式参数不合法：缺少有效商品名称或价格' }, { status: 400 });
      }

      const productMaterial = typeof product?.material === 'string' ? product.material : '未知';
      const productColor = typeof product?.color === 'string' ? product.color : '未知';
      const productDescription = typeof product?.description === 'string' ? product.description : '';
      const productCategory = typeof product?.category === 'string' ? product.category : '未分类';
      const productTags = Array.isArray(product?.tags) ? product.tags.filter((t): t is string => typeof t === 'string') : [];
      const strategyName = 'SKU对比评测';

      let compInfo = competitor_info || DEFAULT_SKU_COMPETITOR_INFO.trim();
      if (!competitor_info && strategies.includes('comparison')) {
        const research = await buildSkuCompetitorResearch({
          name: productName,
          price: productPrice,
          category: productCategory,
          tags: productTags,
        });
        compInfo = research.competitorInfo;
        process = research.process;
        research_meta = {
          mode,
          ...research.researchMeta,
          sources: research.sources,
        };
      }

      for (const strategy of strategies) {
        try {
          const template = templateMap.get(strategy);
          const basePrompt =
            template?.prompt ||
            '你是一位专业评测博主，请输出一篇结构清晰、结论明确、可直接发布的商品对比评测。';

          const vars: Record<string, string> = {
            strategy,
            strategy_name: strategyName,
            generated_at: new Date().toISOString(),
            product_name: productName,
            price: String(productPrice),
            material: productMaterial,
            color: productColor,
            description: productDescription,
            category: productCategory,
            tags: productTags.join(', '),
            competitor_info: compInfo,
          };

          const prompt = [
            replacePlaceholders(basePrompt, vars),
            `## 商品信息\n- 商品名称：${productName}\n- 价格：¥${productPrice}\n- 材质：${productMaterial}\n- 颜色：${productColor}\n- 描述：${productDescription}\n- 品类：${productCategory}\n- 标签：${productTags.join(', ')}`,
            `## 竞品参考信息\n${compInfo}`,
            '## 输出要求\n- 不要输出引用编号与来源链接清单样式',
          ]
            .filter(Boolean)
            .join('\n\n');

          const response = await openai.chat.completions.create({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.4,
          });

          articles.push({
            mode,
            strategy,
            strategy_name: template?.name || strategyName,
            content: response.choices[0].message.content || '',
          });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          errors.push(`${strategy}: ${message}`);
        }
      }
    } else {
      const brand = body.brand && typeof body.brand === 'object' ? (body.brand as Record<string, unknown>) : undefined;
      const brandName = typeof brand?.name === 'string' ? brand.name.trim() : '';
      const brandWebsite = typeof brand?.website === 'string' ? brand.website.trim() : '';

      if (!brandName || !brandWebsite) {
        return NextResponse.json({ error: '品牌IP模式参数不合法：品牌名称与官网URL必填' }, { status: 400 });
      }

      const industryHint = typeof brand?.industry_hint === 'string' ? brand.industry_hint : '';
      const region = typeof brand?.region === 'string' ? brand.region : '中国市场';
      const keywords = Array.isArray(brand?.keywords)
        ? brand.keywords.filter((item): item is string => typeof item === 'string')
        : typeof brand?.keywords === 'string'
          ? brand.keywords
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean)
          : [];
      const brandDescription = typeof brand?.description === 'string' ? brand.description : '';
      const strategyName = '品牌IP对比评测';

      let compInfo = competitor_info || DEFAULT_BRAND_COMPETITOR_INFO.trim();
      let brandProfile = [
        `品牌：${brandName}`,
        `官网：${brandWebsite}`,
        `行业提示：${industryHint || '未提供'}`,
        `地域：${region}`,
        `关键词：${keywords.join(', ') || '未提供'}`,
      ].join('\n');

      if (!competitor_info && strategies.includes('comparison')) {
        const research = await buildBrandCompetitorResearch({
          name: brandName,
          website: brandWebsite,
          industry_hint: industryHint,
          region,
          keywords,
          description: brandDescription,
        });
        compInfo = research.competitorInfo;
        brandProfile = research.brandProfile;
        process = research.process;
        research_meta = {
          mode,
          ...research.researchMeta,
          sources: research.sources,
          competitors: research.competitors,
        };
      }

      for (const strategy of strategies) {
        try {
          const template = templateMap.get(strategy);
          const basePrompt =
            template?.prompt ||
            '你是一位行业研究型评测作者，请输出一篇客观理性、结构严谨、可直接发布的品牌IP对比评测。';

          const vars: Record<string, string> = {
            strategy,
            strategy_name: strategyName,
            generated_at: new Date().toISOString(),
            brand_name: brandName,
            brand_website: brandWebsite,
            industry_hint: industryHint,
            region,
            keywords: keywords.join(', '),
            brand_description: brandDescription,
            brand_profile: brandProfile,
            competitor_info: compInfo,
          };

          const prompt = [
            replacePlaceholders(basePrompt, vars),
            `## 品牌信息\n- 品牌名称：${brandName}\n- 官网：${brandWebsite}\n- 行业提示：${industryHint || '未提供'}\n- 地域：${region}\n- 关键词：${keywords.join(', ') || '未提供'}\n- 补充说明：${brandDescription || '无'}`,
            `## 品牌画像\n${brandProfile}`,
            `## 竞品参考信息\n${compInfo}`,
            `## 重要要求\n- 必须明确点名3-5家友商并说明各自核心特点\n- 使用客观理性、信息密度高的表达，不要情绪化废话\n- 不要输出引用编号或来源清单样式`,
          ]
            .filter(Boolean)
            .join('\n\n');

          const response = await openai.chat.completions.create({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.4,
          });

          articles.push({
            mode,
            strategy,
            strategy_name: template?.name || strategyName,
            content: response.choices[0].message.content || '',
          });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          errors.push(`${strategy}: ${message}`);
        }
      }
    }

    if (research_meta) {
      try {
        const snapshotId = crypto.randomUUID();
        const subjectId = typeof body.subject_id === 'string' && body.subject_id.trim() ? body.subject_id.trim() : null;
        const queries = Array.isArray(research_meta.queries) ? research_meta.queries : [];
        const sources = Array.isArray(research_meta.sources) ? research_meta.sources : [];
        await db
          .prepare(
            `INSERT INTO ResearchSnapshot (
              id, mode, strategy, subject_id, queries_json, sources_json, summary_markdown, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
          )
          .bind(
            snapshotId,
            mode,
            strategies[0] || 'comparison',
            subjectId,
            JSON.stringify(queries),
            JSON.stringify(sources),
            `research_meta: ${JSON.stringify({ ...research_meta, sources: undefined })}`
          )
          .run();
        research_snapshot_id = snapshotId;
      } catch (snapshotErr) {
        const detail = snapshotErr instanceof Error ? snapshotErr.message : String(snapshotErr);
        process = [
          ...process,
          { key: 'research_snapshot', label: '研究快照保存', status: 'failed', detail: detail.slice(0, 120) },
        ];
      }
    }

    process = [
      ...process,
      {
        key: 'content_generation',
        label: '内容生成',
        status: articles.length > 0 ? 'success' : 'failed',
        detail: articles.length > 0 ? `生成 ${articles.length} 篇` : '本次未生成有效内容',
      },
    ];

    return NextResponse.json({
      success: articles.length > 0,
      mode,
      articles,
      process,
      research_meta,
      research_snapshot_id,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Generate error:', error);
    return NextResponse.json({ error: message || 'Failed to generate content' }, { status: 500 });
  }
}
