import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

type ContentMode = 'sku' | 'brand_ip';

const parseMode = (raw: string | null): ContentMode => {
  return raw === 'brand_ip' ? 'brand_ip' : 'sku';
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = parseMode(searchParams.get('mode'));

  return NextResponse.json({
    mode,
    strategies: [
      {
        id: 'comparison',
        name: mode === 'brand_ip' ? '品牌IP对比评测' : 'SKU对比评测',
        description:
          mode === 'brand_ip'
            ? '聚焦品牌IP与同类企业的行业对比与竞争力评测'
            : '围绕商品规格、价格带与竞品进行专业对比评测（已接入Exa联网检索）',
        requires_research: true,
      },
    ],
  });
}
