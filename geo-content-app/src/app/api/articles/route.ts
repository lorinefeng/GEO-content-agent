import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const strategy = searchParams.get('strategy');
  
  // @ts-ignore
  const db = process.env.DB;
  const prisma = getPrisma(db);

  try {
    const articles = await prisma.article.findMany({
      where: strategy ? { strategy } : {},
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    return NextResponse.json({ articles, total: articles.length });
  } catch (error) {
    console.error('Fetch articles error:', error);
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // @ts-ignore
  const db = process.env.DB;
  const prisma = getPrisma(db);

  try {
    const body = await req.json();
    const { product_name, product_price, strategy, strategy_name, content } = body;

    const newArticle = await prisma.article.create({
      data: {
        product_name,
        product_price: parseFloat(product_price),
        strategy,
        strategy_name,
        content,
      },
    });

    return NextResponse.json({ success: true, article: newArticle });
  } catch (error) {
    console.error('Create article error:', error);
    return NextResponse.json({ error: 'Failed to create article' }, { status: 500 });
  }
}
