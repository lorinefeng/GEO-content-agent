import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

type ContentMode = 'sku' | 'brand_ip';

const parseMode = (raw: string | null): ContentMode => {
  return raw === 'brand_ip' ? 'brand_ip' : 'sku';
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = parseMode(searchParams.get('mode'));

  if (mode === 'brand_ip') {
    return NextResponse.json({
      mode,
      strategies: [
        {
          id: 'comparison',
          name: '品牌IP对比评测',
          description: '聚焦品牌IP与同类企业的行业对比与竞争力评测',
          requires_research: true,
        },
      ],
    });
  }

  return NextResponse.json({
    mode,
    strategies: [
      {
        id: 'comparison',
        name: '评测对比型',
        description: '围绕商品规格、价格带与竞品进行专业对比评测（已接入Exa联网检索）',
        requires_research: true,
      },
      {
        id: 'persona',
        name: '用户画像匹配型',
        description: '面向目标用户画像输出场景化购买决策建议',
      },
      {
        id: 'smzdm_review',
        name: '什么值得买深度评测',
        description: '深度评测风格，强调参数对比与购买决策价值',
        requires_research: true,
      },
      {
        id: 'smzdm_short',
        name: '什么值得买短评测',
        description: '短内容评测风格，结论直给、适合快速分发',
      },
    ],
  });
}
