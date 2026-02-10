import { NextRequest, NextResponse } from 'next/server';
import { getD1Database } from '@/lib/cloudflare';
import { ensureDatabaseReady } from '@/lib/dbInit';
import { getActiveUser, unauthorized } from '@/lib/apiAuth';

export const runtime = 'edge';

const normalizePublishedUrl = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (!/^https?:\/\//i.test(trimmed)) return null;
  if (trimmed.length > 2048) return null;
  return trimmed;
};

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getActiveUser(req);
  if (!user) return unauthorized();

  const db = await ensureDatabaseReady(getD1Database());
  const { id } = await ctx.params;

  if (!id) {
    return NextResponse.json({ error: '缺少 id' }, { status: 400 });
  }

  try {
    const body = (await req.json()) as { published_url?: unknown };
    const normalized = normalizePublishedUrl(body.published_url);
    if (normalized === null) {
      return NextResponse.json({ error: 'URL 不合法（需以 http:// 或 https:// 开头）' }, { status: 400 });
    }

    await db
      .prepare(`UPDATE Article SET published_url = ?, updated_at = datetime('now') WHERE id = ?`)
      .bind(normalized || null, id)
      .run();

    const updated = await db
      .prepare(
        'SELECT id, product_name, product_price, product_id, strategy, strategy_name, content, published_url, product_payload, created_at, updated_at FROM Article WHERE id = ?'
      )
      .bind(id)
      .first();

    return NextResponse.json({ success: true, article: updated });
  } catch (error) {
    console.error('Update article error:', error);
    return NextResponse.json({ error: 'Failed to update article' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getActiveUser(req);
  if (!user) return unauthorized();

  const db = await ensureDatabaseReady(getD1Database());
  const { id } = await ctx.params;

  if (!id) {
    return NextResponse.json({ error: '缺少 id' }, { status: 400 });
  }

  try {
    const deleted = await db
      .prepare(
        'SELECT id, product_name, product_price, product_id, strategy, strategy_name, content, published_url, product_payload, created_at, updated_at FROM Article WHERE id = ?'
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
