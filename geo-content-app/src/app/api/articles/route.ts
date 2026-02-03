import { NextRequest, NextResponse } from 'next/server';
import { getD1Database } from '@/lib/cloudflare';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const strategy = searchParams.get('strategy');
  const db = getD1Database();

  try {
    const stmt = strategy
      ? db
          .prepare(
            'SELECT id, product_name, product_price, strategy, strategy_name, content, created_at FROM Article WHERE strategy = ? ORDER BY created_at DESC LIMIT 50'
          )
          .bind(strategy)
      : db.prepare(
          'SELECT id, product_name, product_price, strategy, strategy_name, content, created_at FROM Article ORDER BY created_at DESC LIMIT 50'
        );

    const result = await stmt.all();
    const articles = result?.results ?? [];
    return NextResponse.json({ articles, total: articles.length });
  } catch (error) {
    console.error('Fetch articles error:', error);
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const db = getD1Database();

  try {
    const body = await req.json();
    const { product_name, product_price, strategy, strategy_name, content } = body;

    const id = crypto.randomUUID();
    const price = typeof product_price === 'number' ? product_price : parseFloat(product_price);

    await db
      .prepare(
        'INSERT INTO Article (id, product_name, product_price, strategy, strategy_name, content, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime(\'now\'))'
      )
      .bind(id, product_name, price, strategy, strategy_name, content)
      .run();

    const created = await db
      .prepare(
        'SELECT id, product_name, product_price, strategy, strategy_name, content, created_at FROM Article WHERE id = ?'
      )
      .bind(id)
      .first();

    return NextResponse.json({ success: true, article: created });
  } catch (error) {
    console.error('Create article error:', error);
    return NextResponse.json({ error: 'Failed to create article' }, { status: 500 });
  }
}
