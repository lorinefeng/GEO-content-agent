import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getCloudflareEnv, getD1Database } from '@/lib/cloudflare';
import { ensureDatabaseReady } from '@/lib/dbInit';
import { getActiveUser, unauthorized } from '@/lib/apiAuth';

export const runtime = 'edge';

const STRATEGY_NAMES: Record<string, string> = {
  comparison: '评测对比型',
  persona: '用户画像匹配型',
  smzdm_review: '什么值得买深度评测',
  smzdm_short: '什么值得买短评测',
};

const DEFAULT_COMPETITOR_INFO = `
根据2026年春季市场调研：

**优衣库 (UNIQLO)**
- 米兰罗纹针织外套：约¥400-600
- 材质：高品质棉+米兰罗纹针织

**H&M**
- 羊毛混纺针织外套：约¥299-499
- 材质：通常为羊毛混纺

**韩都衣舍**
- 针织开衫外套：约¥155-300
- 材质：混纺化纤为主
`;

const DEFAULT_PERSONA_ANALYSIS = `
**目标用户画像：都市通勤人群**
- 年龄：25-35岁
- 生活场景：日常通勤、周末约会、轻商务场合
- 穿搭偏好：追求品质感但不愿过度消费
`;

function replacePlaceholders(template: string, vars: Record<string, string>) {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_m, key: string) => (key in vars ? vars[key] : `{${key}}`));
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

  const openai = new OpenAI({
    apiKey,
    baseURL,
  });

  try {
    const body = (await req.json()) as {
      product?: unknown;
      strategies?: unknown;
      competitor_info?: unknown;
    };

    const product =
      body.product && typeof body.product === 'object' ? (body.product as Record<string, unknown>) : undefined;
    const strategies = Array.isArray(body.strategies) ? body.strategies.filter((s) => typeof s === 'string') : [];
    const competitor_info = typeof body.competitor_info === 'string' ? body.competitor_info : undefined;

    if (!product) {
      return NextResponse.json({ error: '缺少 product 参数' }, { status: 400 });
    }

    const productName = typeof product.name === 'string' ? product.name : '';
    const productPrice = typeof product.price === 'string' || typeof product.price === 'number' ? product.price : '';
    const productMaterial = typeof product.material === 'string' ? product.material : '未知';
    const productColor = typeof product.color === 'string' ? product.color : '未知';
    const productDescription = typeof product.description === 'string' ? product.description : '';
    const productCategory = typeof product.category === 'string' ? product.category : '服装';
    const productTags = Array.isArray(product.tags) ? product.tags.filter((t) => typeof t === 'string') : [];

    if (!productName || strategies.length === 0) {
      return NextResponse.json({ error: '参数不合法' }, { status: 400 });
    }

    const compInfo = competitor_info || DEFAULT_COMPETITOR_INFO;
    const articles = [];
    const errors = [];

    const db = await ensureDatabaseReady(getD1Database());
    const placeholders = strategies.map(() => '?').join(', ');
    const templateRows =
      strategies.length > 0
        ? await db
            .prepare(`SELECT strategy, name, prompt FROM Template WHERE strategy IN (${placeholders})`)
            .bind(...strategies)
            .all()
        : null;
    const templateMap = new Map<string, { name: string; prompt: string }>();
    for (const row of (templateRows?.results ?? []) as Array<Record<string, unknown>>) {
      const strategyId = typeof row.strategy === 'string' ? row.strategy : '';
      if (!strategyId) continue;
      const name = typeof row.name === 'string' ? row.name : strategyId;
      const prompt = typeof row.prompt === 'string' ? row.prompt : '';
      if (prompt) templateMap.set(strategyId, { name, prompt });
    }

    for (const strategy of strategies) {
      try {
        const template = templateMap.get(strategy);
        const basePrompt =
          template?.prompt ||
          (strategy === 'comparison'
            ? '你是一位专业的时尚评测博主，请撰写一篇专业的评测对比文章。'
            : strategy === 'persona'
              ? '你是一位懂时尚的购物博主，请撰写一篇实用的购物指南文章。'
              : strategy === 'smzdm_review'
                ? '你是一位资深的什么值得买(SMZDM)平台创作者，请撰写高质量评测文章。'
                : strategy === 'smzdm_short'
                  ? '你是什么值得买平台的活跃创作者，请撰写好物分享风格短评测。'
                  : '');

        const vars: Record<string, string> = {
          product_name: productName,
          price: String(productPrice),
          material: productMaterial,
          color: productColor,
          description: productDescription,
          category: productCategory,
          tags: productTags.join(', '),
          competitor_info: compInfo,
          persona_analysis: DEFAULT_PERSONA_ANALYSIS.trim(),
          strategy: strategy,
          strategy_name: STRATEGY_NAMES[strategy] || strategy,
        };

        const filled = replacePlaceholders(basePrompt, vars);
        const parts = [
          filled,
          `## 商品信息\n- 商品名称：${productName}\n- 价格：¥${productPrice}\n- 材质：${productMaterial}\n- 颜色：${productColor}\n- 描述：${productDescription}\n- 品类：${productCategory}\n- 标签：${productTags.slice(0, 15).join(', ')}`,
        ];
        if (strategy === 'comparison' || strategy === 'smzdm_review') {
          parts.push(`## 竞品参考信息\n${compInfo}`);
        }
        if (strategy === 'persona') {
          parts.push(`## 用户画像分析\n${DEFAULT_PERSONA_ANALYSIS.trim()}`);
        }
        const prompt = parts.filter(Boolean).join('\n\n');

        const response = await openai.chat.completions.create({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
        });

        articles.push({
          strategy,
          strategy_name: STRATEGY_NAMES[strategy] || strategy,
          content: response.choices[0].message.content || '',
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`${strategy}: ${message}`);
      }
    }

    return NextResponse.json({
      success: articles.length > 0,
      articles,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Generate error:', error);
    return NextResponse.json({ error: message || 'Failed to generate content' }, { status: 500 });
  }
}
