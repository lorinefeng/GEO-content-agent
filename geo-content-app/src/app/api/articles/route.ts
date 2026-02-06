import { NextRequest, NextResponse } from 'next/server';
import { getD1Database } from '@/lib/cloudflare';
import { ensureDatabaseReady } from '@/lib/dbInit';
import { getActiveUser, unauthorized } from '@/lib/apiAuth';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const user = await getActiveUser(req);
  if (!user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const strategy = searchParams.get('strategy');
  const db = await ensureDatabaseReady(getD1Database());

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
  const user = await getActiveUser(req);
  if (!user) return unauthorized();

  const db = await ensureDatabaseReady(getD1Database());

  try {
    const body = (await req.json()) as {
      product_name?: unknown;
      product_price?: unknown;
      strategy?: unknown;
      strategy_name?: unknown;
      content?: unknown;
    };

    const product_name = typeof body.product_name === 'string' ? body.product_name : '';
    const strategy = typeof body.strategy === 'string' ? body.strategy : '';
    const strategy_name = typeof body.strategy_name === 'string' ? body.strategy_name : '';
    const content = typeof body.content === 'string' ? body.content : '';
    const priceRaw = body.product_price;
    const price =
      typeof priceRaw === 'number'
        ? priceRaw
        : typeof priceRaw === 'string'
          ? parseFloat(priceRaw)
          : NaN;

    if (!product_name || !strategy || !strategy_name || !content || !Number.isFinite(price)) {
      return NextResponse.json({ error: '参数不合法' }, { status: 400 });
    }

    const id = crypto.randomUUID();

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
