import { NextRequest, NextResponse } from 'next/server';
import { getD1Database } from '@/lib/cloudflare';
import { ensureDatabaseReady } from '@/lib/dbInit';
import { getActiveUser, unauthorized } from '@/lib/apiAuth';

export const runtime = 'edge';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getActiveUser(req);
  if (!user) return unauthorized();

  const db = await ensureDatabaseReady(getD1Database());
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 });

  try {
    const rows = await db
      .prepare(
        `SELECT id, article_id, subject_id, mode, source_type, origin_name, mime_type, public_url, r2_key, created_at
         FROM ReferenceImageAsset
         WHERE article_id = ?
         ORDER BY created_at ASC`
      )
      .bind(id)
      .all();

    return NextResponse.json({ images: rows.results ?? [] });
  } catch (error) {
    console.error('Fetch article reference images error:', error);
    return NextResponse.json({ error: 'Failed to fetch reference images' }, { status: 500 });
  }
}
