import { NextRequest, NextResponse } from 'next/server';
import { getD1Database } from '@/lib/cloudflare';

export const runtime = 'edge';

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const db = getD1Database();
  const { id } = await ctx.params;

  if (!id) {
    return NextResponse.json({ error: '缺少 id' }, { status: 400 });
  }

  try {
    const deleted = await db
      .prepare(
        'SELECT id, product_name, product_price, strategy, strategy_name, content, created_at FROM Article WHERE id = ?'
      )
      .bind(id)
      .first();

    await db.prepare('DELETE FROM Article WHERE id = ?').bind(id).run();

    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    console.error('Delete article error:', error);
    return NextResponse.json({ error: 'Failed to delete article' }, { status: 500 });
  }
}
