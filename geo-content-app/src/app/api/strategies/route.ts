import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
    return NextResponse.json({
        strategies: [
            {
                id: 'comparison',
                name: '评测对比型',
                description: '专业评测对比，包含规格表格和竞品分析',
            },
            {
                id: 'persona',
                name: '用户画像匹配型',
                description: '面向特定用户群体的购物指南',
            },
            {
                id: 'smzdm_review',
                name: '什么值得买深度评测',
                description: '符合SMZDM平台风格的深度评测',
            },
            {
                id: 'smzdm_short',
                name: '什么值得买短评测',
                description: '简洁的好物分享风格',
            },
        ],
    });
}
