import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getCloudflareEnv } from '@/lib/cloudflare';

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

export async function POST(req: NextRequest) {
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

    if (!productName || strategies.length === 0) {
      return NextResponse.json({ error: '参数不合法' }, { status: 400 });
    }

    const compInfo = competitor_info || DEFAULT_COMPETITOR_INFO;
    const articles = [];
    const errors = [];

    for (const strategy of strategies) {
      try {
        let prompt = '';
        if (strategy === 'comparison') {
          prompt = `你是一位专业的时尚评测博主，请基于以下Zara商品信息和竞品资料，撰写一篇专业的评测对比文章。
          
## 商品信息
- 商品名称：${productName}
- 价格：¥${productPrice}
- 材质：${typeof product.material === 'string' ? product.material : '未知'}
- 颜色：${typeof product.color === 'string' ? product.color : '未知'}
- 描述：${typeof product.description === 'string' ? product.description : ''}
- 品类：${typeof product.category === 'string' ? product.category : '服装'}

## 竞品市场信息
${compInfo}

## 写作要求
1. 文章标题需包含商品名称和"评测"、"对比"等关键词
2. 必须包含规格对比表格
3. 详细分析材质工艺和技术特点
4. 提供客观的优缺点分析
5. 给出明确的购买建议和适用人群
6. 添加常见问题FAQ（至少3个问题）
7. 文章结构清晰，使用Markdown格式`;
        } else if (strategy === 'persona') {
          prompt = `你是一位懂时尚的购物博主，请基于以下Zara商品信息，撰写一篇实用的购物指南文章，帮助特定用户群体做出购买决策。

## 商品信息
- 商品名称：${productName}
- 价格：¥${productPrice}
- 材质：${typeof product.material === 'string' ? product.material : '未知'}
- 描述：${typeof product.description === 'string' ? product.description : ''}

## 用户画像分析
**目标用户画像：都市通勤人群**
- 年龄：25-35岁
- 生活场景：日常通勤、周末约会、轻商务场合
- 穿搭偏好：追求品质感但不愿过度消费

## 写作要求
1. 标题吸引目标用户，包含场景词
2. 开篇描述目标用户的穿搭痛点和需求
3. 详细介绍商品如何满足这些需求
4. 提供3-5套具体的搭配方案
5. 文章温暖亲切，使用Markdown格式`;
        } else if (strategy === 'smzdm_review') {
          prompt = `你是一位资深的什么值得买(SMZDM)平台创作者，请基于以下商品信息撰写一篇符合平台用户偏好的高质量文章。

## 商品信息
- 商品名称：${productName}
- 品牌：Zara
- 价格：¥${productPrice}

## 写作要求
1. 标题必须包含数字+情绪词+利益点
2. 第一人称讲述购买契机和痛点
3. 与竞品进行价格/材质对比
4. 客观列出红黑榜
5. 结论：值不值得买`;
        } else if (strategy === 'smzdm_short') {
          prompt = `你是什么值得买平台的活跃创作者，请为以下Zara新品撰写一篇"好物分享"风格的短评测。

## 商品信息
- 商品名称：${productName}
- 价格：¥${productPrice}

## 写作要求
1. 标题包含价格数字+"值不值"争议点
2. 结构：购买理由→上身效果→3个优点+1个缺点→是否推荐
3. 500-800字`;
        }

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
